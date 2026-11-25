"""Local-only container acceptance check. Requires Docker; never reads project .env.

Build first:
  docker build -t agribridge-deploy-api:local server
  docker build -t agribridge-deploy-web:local client
Then: python3 deploy/smoke.py
Creates and removes only uniquely named test containers/network. No live providers.
"""
import json
import struct
import subprocess
import time
import urllib.request
import uuid
import zlib


def docker(*args, check=True):
    return subprocess.run(['docker', *args], check=check, capture_output=True, text=True).stdout.strip()


def wait(check, label):
    for _ in range(90):
        try:
            if check(): return
        except (OSError, ValueError, subprocess.CalledProcessError): pass
        time.sleep(1)
    raise RuntimeError('Timed out waiting for '+label)


def request(url, data=None, headers=None):
    req=urllib.request.Request(url,data=data,headers=headers or {})
    with urllib.request.urlopen(req,timeout=15) as response:
        return response.read(),response.headers


def json_request(url, payload=None, headers=None):
    raw,_=request(url,json.dumps(payload).encode() if payload is not None else None,
                  {'Content-Type':'application/json',**(headers or {})})
    return json.loads(raw)


def png():
    def chunk(kind,data):
        return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\x00\x00\x80\x00'))+chunk(b'IEND',b'')


def main():
    suffix=uuid.uuid4().hex[:10]
    network='agribridge-check-'+suffix
    postgres,api,web=[network+'-'+role for role in ['db','api','web']]
    names=[web,api,postgres]
    environment={'SECRET_KEY':'local-smoke-only-'+'x'*40,'JWT_SECRET_KEY':'local-smoke-only-'+'y'*40,
        'DATABASE_URL':'postgresql+psycopg://smoke:smoke-only@db:5432/smoke',
        'NOTIFICATION_EMAILS_ENABLED':'false','BCRYPT_LOG_ROUNDS':'4'}
    env_args=[value for key,value in environment.items() for value in ['-e',key+'='+value]]
    try:
        docker('network','create',network)
        docker('run','-d','--name',postgres,'--network',network,'--network-alias','db',
               '-e','POSTGRES_USER=smoke','-e','POSTGRES_PASSWORD=smoke-only','-e','POSTGRES_DB=smoke','postgres:16-alpine')
        wait(lambda: 'accepting connections' in docker('exec',postgres,'pg_isready','-U','smoke',check=False),'local PostgreSQL')
        docker('run','--rm','--network',network,*env_args,'agribridge-deploy-api:local','flask','--app','run.py','db','upgrade')
        seed="""from app import create_app
from app.extensions import db
from app.models import User,FarmerProfile,Category,Product
with create_app().app_context():
 user=User(full_name='Container test farmer',email='smoke@example.invalid');user.set_password('LocalDeployCheck2026!');db.session.add(user);db.session.flush()
 farmer=FarmerProfile(user_id=user.user_id,farm_name='Container test farm',location='Kiambu',verification_status='approved');category=Category(category_name='Fruit');db.session.add_all([farmer,category]);db.session.flush()
 db.session.add(Product(farmer_id=farmer.farmer_id,category_id=category.category_id,product_name='Container SSR mangoes',price=100,quantity_available=10,unit='kg',status='available'));db.session.commit()
"""
        docker('run','--rm','--network',network,*env_args,'agribridge-deploy-api:local','python','-c',seed)
        docker('run','-d','--name',api,'--network',network,'--network-alias','api','-p','127.0.0.1::8080',*env_args,'agribridge-deploy-api:local')
        api_origin='http://'+docker('port',api,'8080/tcp').splitlines()[0]
        wait(lambda: json_request(api_origin+'/api/ready')['status']=='ok','Gunicorn readiness')
        assert docker('exec',api,'id','-u')!='0'
        assert 'e56b8c2fd005' in docker('exec',api,'flask','--app','run.py','db','current')
        docker('run','-d','--name',web,'--network',network,'-p','127.0.0.1::8080',
               '-e','SSR_API_URL=http://api:8080/api','-e','PUBLIC_ORIGIN=http://localhost',
               'agribridge-deploy-web:local')
        web_origin='http://'+docker('port',web,'8080/tcp').splitlines()[0]
        wait(lambda: json_request(web_origin+'/healthz')['status']=='ok','Node SSR health')
        assert docker('exec',web,'id','-u')!='0'
        html,_=request(web_origin+'/marketplace')
        assert b'Container SSR mangoes' in html and b'window.__PRODUCT_PAGE__' in html
        detail,_=request(web_origin+'/marketplace/1');assert b'Add to cart' in detail
        assert json_request(web_origin+'/api/ready')['status']=='ok'
        for asset in ['/assets/brand/logo.webp','/assets/brand/hero-768.webp','/fonts/manrope-regular.ttf']:
            body,headers=request(web_origin+asset);assert body and 'text/html' not in headers['Content-Type']
        credentials=json_request(web_origin+'/api/login',{'email':'smoke@example.invalid','password':'LocalDeployCheck2026!'}, {'X-Tab-ID':'container-smoke'})['data']
        auth={'Authorization':'Bearer '+credentials['access_token'],'X-Tab-ID':'container-smoke'}
        boundary='agribridge-smoke-boundary'
        body=(f'--{boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\nfarm_photo\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="farm.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+png()+f'\r\n--{boundary}--\r\n'.encode())
        raw,_=request(web_origin+'/api/media',body,{**auth,'Content-Type':'multipart/form-data; boundary='+boundary})
        asset_id=json.loads(raw)['data']['asset_id']
        signed=json_request(web_origin+f'/api/media/{asset_id}/access',headers=auth)['data']['url']
        data,headers=request(web_origin+signed)
        assert headers['Content-Type']=='image/jpeg' and data.startswith(b'\xff\xd8')
        assert docker('exec',api,'python','-c',"from pathlib import Path;print(any(Path('/app').glob('.env*')))")=='False'
        assert docker('exec',web,'node','-e',"console.log(require('fs').existsSync('/app/.env'))")=='false'
        worker=docker('run','--rm','--network',network,*env_args,'agribridge-deploy-api:local','flask','--app','run.py','v1-worker','--once')
        assert all(key in worker for key in ['purged','reconciled','expired','emailed'])
        print('PASS: containers run as non-root; PostgreSQL migrations, API readiness, Node SSR, static assets, tab login, private database uploads/downloads and worker batch. No shared Neon data or external providers used.')
    except Exception:
        for name in [api,web]:
            subprocess.run(['docker','logs','--tail','40',name],check=False)
        raise
    finally:
        for name in names: docker('rm','-f','-v',name,check=False)
        docker('network','rm',network,check=False)


if __name__=='__main__': main()
