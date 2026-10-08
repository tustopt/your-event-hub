#!/usr/bin/env python3
"""Build a candidate, verify it, then publish with rollback and a visible summary."""
from datetime import datetime, timezone
from importlib.machinery import SourceFileLoader
from pathlib import Path
import fcntl
import http.client
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
STACK = Path('/root/server-stack')
URL = 'https://srv2042599.hstgr.cloud'
NGINX = Path('/etc/nginx/sites-available/gitea-public')
SUPABASE_ENV = Path('/opt/supabase/.env')
COMPOSE = ['docker', 'compose', '--project-directory', '/opt/supabase',
           '-f', '/opt/supabase/docker-compose.yml']
config = SourceFileLoader('deployment_config', str(ROOT/'deploy/configure-supabase.py')).load_module()
web = SourceFileLoader('deployment_web', str(ROOT/'deploy/verify-web.py')).load_module()


def main():
    STACK.mkdir(exist_ok=True)
    lock = open(STACK/'docradar-deploy.lock', 'w')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
    work = STACK/('docradar-deploy-'+run_id)
    work.mkdir(mode=0o700)
    report = {'status': 'running', 'url': URL+'/docradar/', 'run': run_id,
              'log': str(work/'deployment.log'), 'checks': [],
              'password_login': 'requires_user_test'}
    container = 'docradar-'+run_id.lower()
    candidate_started = False
    host_changed = False
    auth_changed = False
    log = open(work/'deployment.log', 'w')

    def command(args, capture=False, input=None):
        result = subprocess.run(args, cwd=ROOT, text=True, input=input,
                                stdout=subprocess.PIPE if capture else log,
                                stderr=log)
        log.flush()
        if result.returncode:
            raise RuntimeError(f'{args[0]} {args[1] if len(args)>1 else ""}: codigo {result.returncode}')
        return result.stdout.strip() if capture else None

    def stage(message):
        report['stage'] = message
        print(message, flush=True)

    def wait_web(origin, local=True):
        for attempt in range(20):
            try:
                with urllib.request.urlopen(origin+'/docradar/', timeout=10) as response:
                    if response.status == 200:
                        break
            except urllib.error.HTTPError as error:
                # Nginx reload returns before its new workers accept requests.
                # The previous Gitea routing can briefly answer 404.
                if error.code not in (404, 502, 503) or attempt == 19:
                    raise
                time.sleep(2)
            except (urllib.error.URLError, TimeoutError, http.client.RemoteDisconnected,
                    ConnectionResetError):
                if attempt == 19:
                    raise
                time.sleep(2)
        return web.verify(origin, local=local)

    try:
        stage('1/6 Verificar Docker e configuracao existente...')
        command(['docker', 'info'])
        original = NGINX.read_text()
        block = re.search(r'    # BEGIN docradar-app\n.*?    # END docradar-app\n', original, re.S)
        old_port = re.search(r'127\.0\.0\.1:(\d+)', block.group()) if block else None
        port = 13004 if old_port and old_port[1] == '13003' else 13003
        report['port'] = port
        report['container'] = container
        report['source_commit'] = command(['git', 'rev-parse', 'HEAD'], capture=True)
        report['working_tree_changes'] = bool(command(['git', 'status', '--porcelain'], capture=True))
        gateway = json.loads(command(['docker', 'inspect', 'supabase-envoy'], capture=True))[0]
        networks = gateway['NetworkSettings']['Networks']
        network = next((name for name, spec in networks.items() if 'api-gw' in (spec.get('Aliases') or [])), None)
        if not network:
            raise RuntimeError('Rede Docker do gateway Supabase nao encontrada.')
        config.configure_app()
        public = config.read_env(ROOT/'.env.local')
        config.write_env(work/'public.env', {key: public[key] for key in
                         ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']})
        runtime = config.read_env(ROOT/'.env.server.local')
        runtime['SUPABASE_URL'] = 'http://api-gw:8000'
        runtime.setdefault('LOVABLE_CRON_SECRET', secrets.token_urlsafe(48))
        runtime.setdefault('DOCUEVENTS_INGEST_AUTOMATION_TOKEN', secrets.token_urlsafe(48))
        if not runtime.get('DOCUEVENTS_INGEST_ADMIN_EMAIL'):
            key = runtime['SUPABASE_SERVICE_ROLE_KEY']
            request = urllib.request.Request('http://127.0.0.1:18000/auth/v1/admin/users?page=1&per_page=1000',
                                             headers={'apikey': key, 'Authorization': 'Bearer '+key})
            with urllib.request.urlopen(request, timeout=30) as response:
                users = json.loads(response.read())['users']
            if len(users) != 1:
                raise RuntimeError('Mais de um utilizador: administrador precisa de configuracao explicita.')
            email = users[0].get('email')
            if not email or '\n' in email:
                raise RuntimeError('Utilizador administrador migrado nao encontrado.')
            runtime['DOCUEVENTS_INGEST_ADMIN_EMAIL'] = email
        config.write_env(ROOT/'.env.server.local', {**runtime, 'SUPABASE_URL': 'http://127.0.0.1:18000'})
        # Docker env files need raw values, unlike the shell/JSON quoted local file.
        if any('\n' in value or '\r' in value for value in runtime.values()):
            raise RuntimeError('Valor de ambiente com quebra de linha.')
        envfile = work/'runtime.env'
        envfile.write_text(''.join(f'{key}={value}\n' for key, value in runtime.items()))
        envfile.chmod(0o600)

        stage('2/6 Instalar dependencias, executar testes e compilar (pode demorar)...')
        # The imported manifest and lockfile disagree (including missing Zod).
        # Save the old lockfile and reconcile it before the frozen Docker build.
        shutil.copy2(ROOT/'bun.lock', work/'bun.lock.before')
        command(['docker', 'run', '--rm', '-v', str(ROOT)+':/app', '-w', '/app',
                 'oven/bun:1.4.2', 'bun', 'install', '--lockfile-only', '--ignore-scripts'])
        report['checks'].append({'dependency_lockfile': 'reconciled',
                                'changed': (ROOT/'bun.lock').read_bytes() != (work/'bun.lock.before').read_bytes()})
        image = 'docradar:'+run_id.lower()
        report['image'] = image
        command(['docker', 'build', '--progress=plain', '--secret', 'id=public_env,src='+str(work/'public.env'),
                 '-f', 'deploy/Dockerfile', '-t', image, '.'])
        report['checks'].append({'tests_and_build': 'passed'})
        # Reject any private key accidentally bundled into browser assets.
        command(['docker', 'run', '--rm', '--env-file', str(envfile), '--entrypoint', 'node', image,
                 '--input-type=module', '-e',
                 "import fs from 'node:fs'; import path from 'node:path'; "
                 "const key=process.env.SUPABASE_SERVICE_ROLE_KEY; "
                 "function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){"
                 "const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(fs.readFileSync(p).includes(Buffer.from(key)))"
                 "throw Error('Private key in browser assets');}}walk('/app/.output/public');"])

        stage('3/6 Iniciar candidato e testar paginas, assets e rotas protegidas...')
        command(['docker', 'run', '-d', '--name', container, '--label', 'app=docradar', '--restart', 'unless-stopped',
                 '--network', network, '--env-file', str(envfile), '-p', f'127.0.0.1:{port}:3000', image])
        candidate_started = True
        report['checks'].extend(wait_web(f'http://127.0.0.1:{port}'))
        command(['docker', 'exec', '-i', container, 'node', '--input-type=module'], input="""
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {apikey:key, Authorization:`Bearer ${key}`, Prefer:'count=exact', Range:'0-0'};
for (const [table, expected] of [['films',193],['events',305],['screenings',305]]) {
  const r = await fetch(`${url}/rest/v1/${table}?select=id`, {method:'HEAD',headers});
  if (!r.ok || Number(r.headers.get('content-range')?.split('/')[1]) !== expected) throw Error(`Database check: ${table}`);
}
console.log('Container -> Supabase: films193 events305 screenings305');
""")
        report['checks'].append({'container_supabase_connection': 'passed'})

        stage('4/6 Configurar URLs de autenticacao e publicar no Nginx...')
        shutil.copy2(NGINX, work/'nginx.before')
        shutil.copy2(SUPABASE_ENV, work/'supabase.before.env')
        (work/'supabase.before.env').chmod(0o600)
        text = SUPABASE_ENV.read_text()
        current = config.read_env(SUPABASE_ENV)
        redirects = list(filter(None, current.get('ADDITIONAL_REDIRECT_URLS', '').split(',')))
        for value in [URL+'/docradar/', URL+'/docradar/**']:
            if value not in redirects:
                redirects.append(value)
        for key, value in {'SITE_URL': URL+'/docradar/', 'ADDITIONAL_REDIRECT_URLS': ','.join(redirects)}.items():
            if re.search(r'^'+key+r'=', text, re.M):
                text = re.sub(r'^'+key+r'=.*$', lambda _: key+'='+value, text, flags=re.M)
            else:
                text += '\n'+key+'='+value+'\n'
        auth_changed = True
        SUPABASE_ENV.write_text(text)
        command(COMPOSE+['up', '-d', '--no-deps', 'auth'])
        command(['python3', str(ROOT/'deploy/verify-supabase.py'), '--public'])
        fragment = (ROOT/'deploy/nginx-docradar.conf').read_text().replace(':13003', ':'+str(port))
        if block:
            updated, count = re.subn(r'    # BEGIN docradar-app\n.*?    # END docradar-app\n', lambda _: fragment, original, flags=re.S)
            if count != 1:
                raise RuntimeError('Bloco docradar duplicado.')
        else:
            if original.count('    listen 443 ssl;') != 1:
                raise RuntimeError('Servidor HTTPS nao identificado.')
            updated = original.replace('    listen 443 ssl;', fragment+'\n    listen 443 ssl;', 1)
        host_changed = True
        NGINX.write_text(updated)
        command(['nginx', '-t'])
        command(['systemctl', 'reload', 'nginx'])

        stage('5/6 Verificar acesso HTTPS e dados preservados...')
        report['checks'].extend(wait_web(URL, local=False))
        command(['python3', str(ROOT/'deploy/verify-supabase.py'), '--public'])
        report['checks'].append({'database_counts': '26 tables / 1771 rows / 1 user'})
        report['browser_javascript'] = 'requires_browser_test'
        report['status'] = 'passed'
        stage('6/6 Publicacao concluida.')
    except Exception as error:
        report['status'] = 'failed'
        report['error'] = str(error)
        if candidate_started:
            # Preserve startup evidence before rollback removes the container.
            with open(work/'container.log', 'w') as container_log:
                subprocess.run(['docker', 'logs', '--tail', '150', container],
                               stdout=container_log, stderr=container_log, text=True)
            report['container_log'] = str(work/'container.log')
        if host_changed:
            with open(work/'nginx-active.log', 'w') as nginx_log:
                subprocess.run(['nginx', '-T'], stdout=nginx_log, stderr=nginx_log, text=True)
            report['nginx_log'] = str(work/'nginx-active.log')
        rollback_errors = []
        for condition, action in [
            (host_changed, lambda: (shutil.copy2(work/'nginx.before', NGINX), command(['nginx', '-t']), command(['systemctl', 'reload', 'nginx']))),
            (auth_changed, lambda: (shutil.copy2(work/'supabase.before.env', SUPABASE_ENV), command(COMPOSE+['up', '-d', '--no-deps', 'auth']))),
        ]:
            if condition:
                try:
                    action()
                except Exception as rollback_error:
                    rollback_errors.append(str(rollback_error))
        if candidate_started and not rollback_errors:
            try:
                command(['docker', 'rm', '-f', container])
            except Exception as cleanup_error:
                rollback_errors.append(str(cleanup_error))
        if rollback_errors:
            report['rollback_errors'] = rollback_errors
        report['rollback'] = 'failed' if rollback_errors else 'completed'
    finally:
        log.close()
        (work/'report.json').write_text(json.dumps(report, indent=2)+'\n')
        (STACK/'docradar-deploy.json').write_text(json.dumps(report, indent=2)+'\n')
        print('\nResumo:', flush=True)
        if report['status'] == 'passed':
            print('SUCESSO: docradar publicado em '+report['url'])
            print('Testes, paginas, assets, APIs protegidas e dados verificados.')
            print('Falta testar a entrada com o teu email e palavra-passe existentes.')
        else:
            print('ERRO: '+report.get('error', 'Falha na publicacao.'))
            print('Etapa: '+report.get('stage', 'inicio'))
            print('Reposicao da configuracao: '+report.get('rollback', 'nao necessaria'))
        print('Relatorio: '+str(STACK/'docradar-deploy.json'))
        print('Log: '+report['log'])
    return 0 if report['status'] == 'passed' else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except BlockingIOError:
        print('ERRO: ja existe uma publicacao docradar em curso.')
        sys.exit(1)
