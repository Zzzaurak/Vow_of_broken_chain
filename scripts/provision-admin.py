#!/usr/bin/env python3
"""Create a local administrator without storing credentials in tracked files."""
import json,secrets,urllib.request,subprocess,os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
file=root/'.local/admin-account.json'
def sql(query):
 return subprocess.check_output(['psql','-h','127.0.0.1','-p','55439','-U','oath','-d','oath','-At','-v','ON_ERROR_STOP=1'],input=query,text=True).strip()
def call(name,body,token=None):
 req=urllib.request.Request('http://127.0.0.1:8093/api/PlayerService/'+name,data=json.dumps(body).encode(),headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})})
 with urllib.request.urlopen(req,timeout=15) as response:return json.load(response)
if file.exists():
 account=json.loads(file.read_text())
 token=call('login',account)
else:
 account={'username':'oath_admin','password':secrets.token_urlsafe(18)}
 if sql("SELECT count(*) FROM player_accounts WHERE username='oath_admin';")!='0':raise SystemExit('Account already exists; refusing to replace it.')
 session=call('createanonymousplayer',{})
 call('registeraccount',account,session['token'])
 file.write_text(json.dumps(account,ensure_ascii=False,indent=2)+'\n');os.chmod(file,0o600)
 token=session['token']
sql("UPDATE player_accounts SET is_admin=TRUE WHERE username='oath_admin';")
assert call('getadministrator',{},token) is True
print('Administrator account created and verified; credentials saved locally.')
