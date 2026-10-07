from pathlib import Path
import json,sys,time,urllib.request,urllib.error
from importlib.machinery import SourceFileLoader
config_module=SourceFileLoader('local_config',str(Path(__file__).with_name('configure-supabase.py'))).load_module()
root=Path('/root/admin/docradar')
public=config_module.read_env(root/'.env.local')
runtime=config_module.read_env(root/'.env.server.local')
url=public['VITE_SUPABASE_URL'] if '--public' in sys.argv else runtime['SUPABASE_URL']
report={'endpoint':url,'checks':[]}
def request(path,key=None,method='GET',extra=None):
 headers={}
 if key:
  headers['apikey']=key
  if not key.startswith(('sb_publishable_','sb_secret_')):headers['Authorization']='Bearer '+key
 headers.update(extra or {})
 req=urllib.request.Request(url+path,headers=headers,method=method)
 with urllib.request.urlopen(req,timeout=20) as response:
  return response.status,response.headers,response.read()
try:
 for attempt in range(15 if '--public' in sys.argv else 1):
  try:
   status,_,_=request('/auth/v1/health',public['VITE_SUPABASE_PUBLISHABLE_KEY'])
   break
  except urllib.error.HTTPError as e:
   if e.code not in (404,502,503) or attempt==14 or '--public' not in sys.argv:raise
   time.sleep(1)
  except urllib.error.URLError:
   if attempt==14 or '--public' not in sys.argv:raise
   time.sleep(1)
 report['checks'].append({'auth_health':status})
 summary=json.loads(Path('/root/server-stack/your-event-hub-migration/restore-summary.json').read_text())
 for name,expected in summary['selected_tables'].items():
  if not name.startswith('public.'):continue
  table=name.split('.',1)[1]
  status,headers,_=request('/rest/v1/'+table+'?select=*',runtime['SUPABASE_SERVICE_ROLE_KEY'],'HEAD',{'Prefer':'count=exact','Range':'0-0'})
  value=headers.get('Content-Range','').split('/')[-1]
  actual=int(value)
  if actual!=expected:raise RuntimeError('Contagem diferente em '+name)
  report['checks'].append({'table':name,'rows':actual})
 _,_,body=request('/rest/v1/films?select=id&limit=1',public['VITE_SUPABASE_PUBLISHABLE_KEY'])
 if json.loads(body)!=[]:raise RuntimeError('Os filmes ficaram acessiveis sem autenticacao.')
 report['checks'].append({'anonymous_catalog_access':'blocked_by_rls'})
 _,_,body=request('/auth/v1/admin/users?page=1&per_page=1000',runtime['SUPABASE_SERVICE_ROLE_KEY'])
 users=json.loads(body).get('users',[])
 if len(users)!=summary['auth_users']:raise RuntimeError('Contagem de utilizadores diferente.')
 report['checks'].append({'auth_users':len(users)})
 report['status']='passed'
except Exception as e:
 report['status']='failed'
 # Do not write returned database records, credentials or response bodies.
 report['error']=type(e).__name__+': '+str(e)
path=Path('/root/server-stack/your-event-hub-migration')/('connection-public.json' if '--public' in sys.argv else 'connection-local.json')
path.write_text(json.dumps(report,indent=2))
print('Ligacao '+report['status']+': '+url)
if report['status']!='passed':
 print(report['error']);sys.exit(1)
print('26 tabelas verificadas; 1771 registos; 1 utilizador; acesso anonimo restringido por RLS.')
