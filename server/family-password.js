'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const {promisify} = require('node:util');
const express = require('express');
const scrypt = promisify(crypto.scrypt);
const COOKIE = '__Host-dad-radar-session';
const HASH = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{64})$/;
const DAY = 86400000;
const hashOptions = {N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024};
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128 && Buffer.byteLength(password) <= 512;
}
async function hashPassword(password) {
  if (!validPassword(password)) throw new Error('Choose a family password between 12 and 128 characters. A few words work well.');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, Buffer.from(salt, 'hex'), 32, hashOptions);
  return `scrypt-v1:${salt}:${hash.toString('hex')}`;
}
async function checkPassword(password, encoded) {
  if (!validPassword(password)) return false;
  const match = HASH.exec(encoded);
  if (!match) return false;
  const hash = await scrypt(password, Buffer.from(match[1], 'hex'), 32, hashOptions);
  return crypto.timingSafeEqual(hash, Buffer.from(match[2], 'hex'));
}
function sessionStore(config, options) {
  const filename = options.sessionFile || path.join(__dirname, '../runtime/family-sessions.json');
  const now = options.now || Date.now;
  const fingerprint = digest(config.passwordHash);
  let sessions = new Map();
  try {
    if (fs.statSync(filename).size > 1024 * 1024) throw new Error('Session file too large');
    const saved = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (saved.version !== 1 || !Array.isArray(saved.sessions) || saved.sessions.length > 256) throw new Error('Invalid session file');
    if (saved.fingerprint === fingerprint) {
      for (const row of saved.sessions) {
        if (!/^[a-f0-9]{64}$/.test(row.id) || !Number.isFinite(row.expires)) throw new Error('Invalid session entry');
        if (row.expires > now() && row.expires <= now() + 30 * DAY) sessions.set(row.id, row.expires);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Family session storage could not be read.');
  }
  function save(next) {
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    const temporary = `${filename}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({version: 1, fingerprint,
      sessions: [...next].map(([id, expires]) => ({id, expires}))}), {mode: 0o600});
    fs.renameSync(temporary, filename);
    sessions = next;
  }
  const active = () => new Map([...sessions].filter(([, expires]) => expires > now()));
  return {
    valid: token => /^[A-Za-z0-9_-]{43}$/.test(token || '') && (sessions.get(digest(token)) || 0) > now(),
    issue(remember) {
      const next = active();
      if (next.size >= 256) throw new Error('Session limit reached');
      const token = crypto.randomBytes(32).toString('base64url');
      const lifetime = remember ? 30 * DAY : DAY / 2;
      next.set(digest(token), now() + lifetime);
      save(next);
      return {token, lifetime};
    },
    revoke(token) {const next = active(); if (token) next.delete(digest(token)); save(next);}
  };
}
function cookieToken(request) {
  const entries = String(request.headers.cookie || '').split(';').map(p => p.trim()).filter(p => p.startsWith(`${COOKIE}=`));
  return entries.length === 1 ? entries[0].slice(COOKIE.length + 1) : null;
}
function loginPage(message = '', signedIn = false) {
  // Messages are fixed server strings, never request content.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#241e18"><meta name="apple-mobile-web-app-capable" content="yes"><title>Dad Radar · Family</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:20px;background:radial-gradient(ellipse at top,#493b2b,#191613 75%);color:#f2e4c8;font:16px/1.45 system-ui}main{width:min(100%,420px);padding:28px;border:1px solid #ac8951;border-radius:10px;background:#241e18;box-shadow:0 16px 55px #0006}.eyebrow{font:11px monospace;letter-spacing:2px;color:#c9a76a}h1{font:bold 36px Georgia;margin:8px 0 12px;letter-spacing:2px}p{color:#d2c6b1;margin:0 0 22px}label{display:block;margin:12px 0 6px}input[type=password]{width:100%;padding:12px;background:#171512;border:1px solid #9e835c;border-radius:5px;color:#fff;font:18px system-ui}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #e5c98b;outline-offset:3px}.remember{display:flex;gap:10px;align-items:center;font-size:14px;margin:16px 0 24px}.remember input{width:20px;height:20px;accent-color:#d0ac70}button,.open{display:block;width:100%;padding:12px;background:#d0ac70;color:#20190f;border:0;border-radius:5px;font:bold 16px system-ui;text-align:center;text-decoration:none;cursor:pointer}.secondary{background:transparent;color:#e3c995;border:1px solid #8d7655;margin-top:14px}.message{color:#f7c59a;font-size:14px;margin:12px 0}.note{font-size:12px;margin:18px 0 0;color:#b6a993}@media(max-height:440px) and (min-width:600px){main{width:580px;padding:18px 26px}h1{font-size:30px;margin:4px 0}p{margin-bottom:10px}form{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}label[for=password],input[type=password]{grid-column:1}.remember{grid-column:2;grid-row:1/3;margin:0}button{grid-column:1/3;margin-top:12px}.note{margin-top:10px}}
</style></head><body><main><div class="eyebrow">MAXWELL FAMILY · FLIGHT OPERATIONS</div><h1>DAD RADAR</h1><p>${signedIn ? 'This device is signed in.' : 'A little closer, wherever Dad is flying.'}</p>${message ? `<p class="message" role="alert">${message}</p>` : ''}${signedIn ? '<a class="open" href="/mobile">Open Dad Radar</a><form method="post" action="/family/logout"><button class="secondary">Sign out of this device</button></form>' : '<form method="post" action="/family/login"><label for="password">Family password</label><input id="password" name="password" type="password" autocomplete="current-password" minlength="12" maxlength="128" required><label class="remember"><input type="checkbox" name="remember" value="yes" checked>Remember this device for 30 days</label><button type="submit">Open Dad Radar</button></form><p class="note">Need the password? Ask Joey or Allison.</p>'}</main></body></html>`;
}
function passwordMiddleware(config, options = {}) {
  if (!HASH.test(config.passwordHash || '')) throw new Error('Family password hash is missing or invalid.');
  const router = express.Router();
  const store = sessionStore(config, options);
  const now = options.now || Date.now;
  const buckets = new Map();
  let total = {until: 0, count: 0}, running = 0;
  const hostname = new URL(config.origin).host;
  function limited(request) {
    const time = now();
    if (total.until <= time) total = {until: time + 15 * 60000, count: 0};
    for (const [key, value] of buckets) if (value.until <= time) buckets.delete(key);
    // Only this loopback tunnel gateway consumes Cloudflare's client IP header.
    // The global cap also bounds hashing if client addresses are varied/spoofed.
    const reported = request.get('CF-Connecting-IP');
    const key = net.isIP(reported || '') ? reported : request.socket.remoteAddress;
    if (!buckets.has(key)) {
      if (buckets.size >= 1024) return true;
      buckets.set(key, {until: time + 15 * 60000, count: 0});
    }
    const bucket = buckets.get(key);
    if (bucket.count >= 10 || total.count >= 60 || running >= 2) return true;
    bucket.count++; total.count++;
    return false;
  }
  function page(response, status = 200, message = '', signedIn = false) {
    response.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    return response.status(status).type('html').send(loginPage(message, signedIn));
  }
  router.use((request, response, next) => {
    if (request.get('Host') !== hostname) return response.status(403).send('Use the configured family HTTPS address.');
    if (request.get('X-Forwarded-Proto') && request.get('X-Forwarded-Proto') !== 'https') return response.redirect(303, config.origin + '/family/login');
    if (!['GET', 'HEAD'].includes(request.method) && request.get('Origin') !== config.origin) return response.status(403).end();
    next();
  });
  router.get('/family/login', (request, response) => page(response, 200, '', store.valid(cookieToken(request))));
  router.post('/family/login', (request, response, next) => {
    if (limited(request)) {response.set('Retry-After', '900'); return page(response, 429, 'Too many attempts. Please try again in 15 minutes.');}
    next();
  }, express.urlencoded({extended: false, limit: '2kb', parameterLimit: 4}), async (request, response) => {
    running++;
    try {
      if (!await checkPassword(request.body?.password, config.passwordHash)) return page(response, 401, 'That password didn’t match. Please try again.');
      const remember = request.body.remember === 'yes';
      const session = store.issue(remember);
      response.set('Set-Cookie', `${COOKIE}=${session.token}; Path=/; Secure; HttpOnly; SameSite=Lax${remember ? `; Max-Age=${session.lifetime / 1000}` : ''}`);
      return response.redirect(303, '/mobile');
    } catch {return page(response, 503, 'Sign-in is temporarily unavailable. Please try again shortly.');}
    finally {running--;}
  });
  router.post('/family/logout', (request, response) => {
    try {store.revoke(cookieToken(request));}
    catch {return page(response, 503, 'Sign-out could not be completed. Please try again.');}
    response.set('Set-Cookie', `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`);
    response.redirect(303, '/family/login');
  });
  router.use((request, response, next) => {
    if (store.valid(cookieToken(request))) return next();
    response.set('X-Dad-Radar-Login', '/family/login');
    if (['GET', 'HEAD'].includes(request.method) && (['/', '/mobile', '/mobile/'].includes(request.path) || request.get('Sec-Fetch-Dest') === 'document')) return response.redirect(303, '/family/login');
    response.status(401).json({ok: false, code: 'family-sign-in-required', error: 'Please sign in to Dad Radar.'});
  });
  router.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    page(response, error.status === 413 ? 413 : 400, 'That sign-in request could not be read. Please try again.');
  });
  return router;
}
module.exports = {hashPassword, checkPassword, validPassword, passwordMiddleware, sessionStore, loginPage, HASH};
