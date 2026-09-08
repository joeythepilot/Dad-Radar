'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const {accessConfiguration,createVerifier,createMobileGateway}=require('./mobile-access');
const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'fixture',use:'sig'};
const now=Date.now();
const config={issuer:'https://fixture.cloudflareaccess.com',audience:'family-app',origin:'https://family.example.test',emails:['family@example.test']};
const defaults={iss:config.issuer,aud:[config.audience],exp:Math.floor(now/1000)+3600,nbf:Math.floor(now/1000)-10,email:'family@example.test'};
function token(changes={},secret=privateKey) {
  const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const payload=`${encode({alg:'RS256',kid:'fixture'})}.${encode({...defaults,...changes})}`;
  return `${payload}.${crypto.sign('RSA-SHA256',Buffer.from(payload),secret).toString('base64url')}`;
}
(async()=> {
  assert.equal(accessConfiguration({}),null);
  assert.throws(()=>accessConfiguration({DAD_RADAR_ACCESS_AUD:'incomplete'}));
  assert.throws(()=>accessConfiguration({DAD_RADAR_ACCESS_TEAM:'evil.test/path',DAD_RADAR_ACCESS_AUD:'x',DAD_RADAR_FAMILY_EMAILS:'a@b.test',DAD_RADAR_MOBILE_ORIGIN:config.origin}));
  let fetched=0;
  const options={now:()=>now,fetchImpl:async url=>{assert.equal(url,`${config.issuer}/cdn-cgi/access/certs`);fetched++;return {ok:true,json:async()=>({keys:[jwk]})};}};
  const verify=createVerifier(config,options);
  assert.equal((await verify(token())).email,defaults.email);
  await verify(token());assert.equal(fetched,1);
  for(const changes of [{aud:['other']},{iss:'https://evil.test'},{email:'stranger@example.test'},{exp:now/1000-1},{exp:'9999999999'},{nbf:now/1000+100}]) await assert.rejects(verify(token(changes)));
  await assert.rejects(verify(undefined));await assert.rejects(verify('a.b.c'));
  const other=crypto.generateKeyPairSync('rsa',{modulusLength:2048});await assert.rejects(verify(token({},other.privateKey)));
  await assert.rejects(createVerifier(config,{fetchImpl:async()=>{throw new Error('offline');}})(token()));
  const app=express();app.get('/mobile',(_q,r)=>r.send('family page'));app.post('/api/flights/lookup',(_q,r)=>r.json({ok:true}));
  app.get('/api/airports/AVL/surface',(_q,r)=>r.json({ok:true}));
  const server=createMobileGateway(app,config,options).listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const path of ['/mobile','/Mobile/icon.png','/api/calendar/upcoming','/api/weather/radar','/api/airports/AVL/surface']) assert.equal((await fetch(base+path)).status,401);
    const headers={'Cf-Access-Jwt-Assertion':token()};
    const allowed=await fetch(base+'/mobile',{headers});assert.equal(allowed.status,200);assert.match(allowed.headers.get('cache-control'),/no-store/);
    assert.equal((await fetch(base+'/api/airports/AVL/surface',{headers})).status,200);
    assert.equal((await fetch(base+'/api/diagnostics/recent',{headers})).status,404);
    assert.equal((await fetch(base+'/api/flights/lookup',{method:'POST',headers:{...headers,Origin:'https://evil.test'}})).status,403);
    assert.equal((await fetch(base+'/api/flights/lookup',{method:'POST',headers:{...headers,Origin:config.origin}})).status,200);
  } finally {await new Promise(r=>server.close(r));}
  console.log('Mobile Access signature, authorization and HTTP tests passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
