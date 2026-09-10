'use strict';
const crypto = require('node:crypto');
const express = require('express');
const {passwordMiddleware, HASH} = require('./family-password');

function accessConfiguration(env = process.env) {
  const mode = String(env.DAD_RADAR_MOBILE_AUTH || '').trim();
  const passwordHash = String(env.DAD_RADAR_FAMILY_PASSWORD_HASH || '').trim();
  if (mode && !['password', 'cloudflare'].includes(mode)) throw new Error('Unknown mobile sign-in mode.');
  const team = String(env.DAD_RADAR_ACCESS_TEAM || '').trim();
  const audience = String(env.DAD_RADAR_ACCESS_AUD || '').trim();
  const origin = String(env.DAD_RADAR_MOBILE_ORIGIN || '').trim();
  const emails = String(env.DAD_RADAR_FAMILY_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (mode === 'password') {
    if (!HASH.test(passwordHash)) throw new Error('Run mobile:setup to set the family password.');
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) throw new Error('Mobile origin must be an HTTPS origin without a path.');
    return {mode, passwordHash, origin};
  }
  if (!mode && passwordHash) throw new Error('Family password requires password sign-in mode.');
  if (!mode && !team && !audience && !origin && !emails.length) return null;
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !audience || !emails.length) throw new Error('Mobile access needs an Access team domain, audience, and family email list.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) throw new Error('Mobile origin must be an HTTPS origin without a path.');
  return { issuer: `https://${team}`, audience, origin, emails };
}
function createVerifier(config, options = {}) {
  let keys = [], expires = 0, pending = null;
  const now = options.now || Date.now;
  async function signingKeys() {
    if (now() < expires) return keys;
    if (!pending) pending = (async () => {
      const response = await (options.fetchImpl || fetch)(`${config.issuer}/cdn-cgi/access/certs`, {signal: AbortSignal.timeout(8000),redirect:'error'});
      if (!response.ok) throw new Error('Access signing keys unavailable');
      const data = await response.json();
      if (!Array.isArray(data.keys)) throw new Error('Invalid Access signing keys');
      keys=data.keys;expires=now()+5*60*1000;return keys;
    })().finally(()=>{pending=null;});
    return pending;
  }
  return async function verify(token) {
    if (typeof token !== 'string' || token.length > 16384) throw new Error('Missing Access token');
    const parts=token.split('.');
    if(parts.length!==3 || parts.some(p=>!p || !/^[A-Za-z0-9_-]+$/.test(p))) throw new Error('Invalid Access token');
    const header=JSON.parse(Buffer.from(parts[0],'base64url'));
    const claims=JSON.parse(Buffer.from(parts[1],'base64url'));
    if(header.alg!=='RS256' || typeof header.kid!=='string') throw new Error('Invalid signing algorithm');
    const key=(await signingKeys()).find(k=>k.kid===header.kid && k.kty==='RSA' && (!k.use || k.use==='sig'));
    if(!key || !crypto.verify('RSA-SHA256',Buffer.from(parts.slice(0,2).join('.')),crypto.createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url'))) throw new Error('Invalid signature');
    const time=now()/1000;
    const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud];
    if(claims.iss!==config.issuer || !audiences.includes(config.audience) || !Number.isFinite(claims.exp) || claims.exp<=time ||
      (claims.nbf!==undefined && (!Number.isFinite(claims.nbf) || claims.nbf>time)) ||
      (claims.iat!==undefined && (!Number.isFinite(claims.iat) || claims.iat>time+30)) ||
      typeof claims.email!=='string' || !config.emails.includes(claims.email.toLowerCase())) throw new Error('Access not allowed');
    return claims;
  };
}
function createMobileGateway(app, config, options = {}) {
  const gateway=express();
  gateway.disable('x-powered-by');
  gateway.use((request,response,next)=> {
    // Static-file middleware must not replace the private gateway's no-store.
    const setHeader=response.setHeader;
    response.setHeader=function(name,value) {return setHeader.call(this,name,String(name).toLowerCase()==='cache-control' ? 'private, no-store' : value);};
    // Preserve Origin on same-site password form submissions; no-referrer
    // makes browsers send Origin:null, which our CSRF check correctly rejects.
    response.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':config.mode==='password' ? 'same-origin' : 'no-referrer','X-Frame-Options':'DENY'});
    next();
  });
  if (config.mode === 'password') gateway.use(passwordMiddleware(config,options));
  else {
    const verify=createVerifier(config,options);
    gateway.use(async (request,response,next)=> {
      try {await verify(request.get('Cf-Access-Jwt-Assertion'));next();}
      catch {response.status(401).type('text').send('Family sign-in required. Open the Dad Radar family address and sign in again.');}
    });
  }
  gateway.use(async (request,response,next)=> {
    if (!['GET','HEAD'].includes(request.method) && request.get('Origin')!==config.origin) {response.status(403).end();return;}
    // The remote companion needs viewing and lookup only, not diagnostics.
    const pathname=request.path.toLowerCase();
    if(pathname==='/api' || pathname.startsWith('/api/')) {
      const allowed = pathname==='/api/flights/lookup' ? request.method==='POST' :
        ['GET','HEAD'].includes(request.method) && (/^\/api\/airports\/[a-z0-9]{3,4}\/surface$/.test(pathname) || ['/api/state','/api/calendar/upcoming','/api/weather/radar'].includes(pathname));
      if(!allowed) {response.status(404).end();return;}
    }
    if(request.path==='/') {response.redirect('/mobile');return;}
    next();
  });
  gateway.use(app);
  return gateway;
}
function startMobileGateway(app, options = {}) {
  const env=options.env || process.env;
  let config;
  try {config=accessConfiguration(env);} catch(error) {console.error(`Dad Radar mobile access disabled: ${error.message}`);return null;}
  if(!config) return null;
  const port=Number(env.DAD_RADAR_MOBILE_PORT || 4174);
  if(!Number.isInteger(port) || port<1 || port>65535) {console.error('Dad Radar mobile access disabled: invalid port');return null;}
  let gateway;
  try {gateway=createMobileGateway(app,config);} catch {console.error('Dad Radar mobile access disabled: could not initialize sign-in storage.');return null;}
  const server=gateway.listen(port,'127.0.0.1',()=>console.log(`Protected Dad Radar mobile gateway listening on loopback port ${port}.`));
  server.on('error',error=>console.error(`Mobile gateway could not start: ${error.code || 'unknown error'}`));
  return server;
}
module.exports={accessConfiguration,createVerifier,createMobileGateway,startMobileGateway};
