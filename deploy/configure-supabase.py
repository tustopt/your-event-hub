from pathlib import Path
from datetime import datetime
import json,os,shutil,re
ROOT=Path('/root/admin/docradar')
PUBLIC_URL='https://srv2042599.hstgr.cloud/supabase'
def read_env(path):
 result={}
 for line in Path(path).read_text().splitlines():
  if not line.strip() or line.lstrip().startswith('#') or '=' not in line: continue
  k,v=line.split('=',1); v=v.strip()
  if len(v)>1 and v[0]==v[-1] and v[0] in ('"',"'"): v=v[1:-1]
  result[k.strip()]=v
 return result
def write_env(path,values):
 path=Path(path)
 fd=os.open(path,os.O_CREAT|os.O_WRONLY|os.O_TRUNC,0o600)
 with os.fdopen(fd,'w') as f:
  for k,v in values.items():f.write(k+'='+json.dumps(v)+'\n')
 os.chmod(path,0o600)
def configure_app():
 config=read_env('/opt/supabase/.env')
 key=config.get('SUPABASE_PUBLISHABLE_KEY') or config.get('ANON_KEY')
 service=config.get('SERVICE_ROLE_KEY')
 if not key or not service:raise SystemExit('Faltam chaves do Supabase local. Nenhuma chave foi mostrada.')
 public=read_env(ROOT/'.env')
 public.update({'VITE_SUPABASE_URL':PUBLIC_URL,'VITE_SUPABASE_PUBLISHABLE_KEY':key,'SUPABASE_URL':'http://127.0.0.1:18000','SUPABASE_PUBLISHABLE_KEY':key})
 # The local Vite override contains only public configuration, never the service key.
 public.pop('SUPABASE_SERVICE_ROLE_KEY',None)
 write_env(ROOT/'.env.local',public)
 runtime={'SUPABASE_URL':'http://127.0.0.1:18000','SUPABASE_PUBLISHABLE_KEY':key,'SUPABASE_SERVICE_ROLE_KEY':service}
 old=read_env(ROOT/'.env.server.local') if (ROOT/'.env.server.local').exists() else {}
 old.update(runtime)
 write_env(ROOT/'.env.server.local',old)
 print('Configuracao da aplicacao preparada; chaves nao mostradas.')
def configure_host():
 migration=Path('/root/server-stack/your-event-hub-migration')
 backup=migration/('connection-backup-'+datetime.now().strftime('%Y%m%d%H%M%S%f'))
 backup.mkdir(mode=0o700)
 nginx=Path('/etc/nginx/sites-available/gitea-public')
 source=nginx.read_text()
 fragment=(ROOT/'deploy/nginx-supabase.conf').read_text()
 if '# BEGIN your-event-hub-supabase' in source:
  source,changes=re.subn(r'    # BEGIN your-event-hub-supabase\n.*?    # END your-event-hub-supabase\n', lambda _:fragment.rstrip()+'\n',source,flags=re.S)
  if changes!=1:raise SystemExit('Bloco Supabase duplicado ou incompleto. Configuracao nao alterada.')
 else:
  anchor='    listen 443 ssl;'
  if source.count(anchor)!=1:raise SystemExit('Nao foi possivel identificar o servidor HTTPS.')
  source=source.replace(anchor,fragment+anchor,1)
 supabase=Path('/opt/supabase/.env')
 text=supabase.read_text()
 values={'SUPABASE_PUBLIC_URL':PUBLIC_URL,'API_EXTERNAL_URL':PUBLIC_URL+'/auth/v1'}
 for k,v in values.items():
  lines=text.splitlines(); found=False
  for i,line in enumerate(lines):
   if line.startswith(k+'='):lines[i]=k+'='+v;found=True
  if not found:lines.append(k+'='+v)
  text='\n'.join(lines)+'\n'
 shutil.copy2(nginx,backup/'nginx.conf')
 shutil.copy2(supabase,backup/'supabase.env')
 os.chmod(backup/'supabase.env',0o600)
 nginx.write_text(source)
 supabase.write_text(text)
 (migration/'last-connection-backup').write_text(str(backup))
 print('Configuracao HTTPS e URLs de autenticacao preparadas.')
if __name__=='__main__':
 import sys
 configure_host() if '--host' in sys.argv else configure_app()
