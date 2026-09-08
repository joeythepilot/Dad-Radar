'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const {hashPassword, checkPassword, sessionStore} = require('./family-password');
const {accessConfiguration, createMobileGateway, startMobileGateway} = require('./mobile-access');
const {updateSettings} = require('../scripts/mobile-setup');
(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dad-radar-family-'));
  const password = 'Test flight family phrase';
  const passwordHash = await hashPassword(password);
  assert(await checkPassword(password, passwordHash));
  assert(!await checkPassword('Wrong family phrase', passwordHash));
  await assert.rejects(hashPassword('short'));
  const env = {DAD_RADAR_MOBILE_AUTH: 'password', DAD_RADAR_FAMILY_PASSWORD_HASH: passwordHash,
    DAD_RADAR_MOBILE_ORIGIN: 'https://family.example.test'};
  const config = accessConfiguration(env);
  assert.equal(config.mode, 'password');
  for (const changes of [{DAD_RADAR_FAMILY_PASSWORD_HASH: ''}, {DAD_RADAR_MOBILE_ORIGIN: 'http://family.example.test'},
    {DAD_RADAR_MOBILE_ORIGIN: 'https://family.example.test/mobile'}, {DAD_RADAR_MOBILE_AUTH: 'none'}]) assert.throws(() => accessConfiguration({...env, ...changes}));
  const settings = updateSettings('GOOGLE_CALENDAR_ID=keep-me\nDAD_RADAR_MOBILE_AUTH=cloudflare\nDAD_RADAR_MOBILE_AUTH=cloudflare\n', env);
  assert(settings.includes('GOOGLE_CALENDAR_ID=keep-me'));
  assert(!settings.includes(password));
  assert(!settings.includes('cloudflare'));
  assert.throws(() => updateSettings('', {BAD: 'line\nbreak'}));
  let clock = Date.now();
  const options = {sessionFile: path.join(directory, 'sessions.json'), now: () => clock};
  const app = express();
  app.get('/mobile', (_q, r) => r.send('PRIVATE FAMILY FLIGHT'));
  app.get('/api/calendar/upcoming', (_q, r) => r.json({ok: true, private: 'schedule'}));
  app.get('/api/diagnostics/recent', (_q, r) => r.json({secret: true}));
  app.post('/api/flights/lookup', (_q, r) => r.json({ok: true}));
  app.get('/Mobile/test.js', (_q, r) => r.set('Cache-Control', 'public, max-age=3600').type('js').send('private artwork'));
  let server;
  async function start(currentConfig = config) {
    server = createMobileGateway(app, currentConfig, options).listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
  }
  async function stop() {if (server) {await new Promise(r => server.close(r)); server = null;}}
  const request = (url, opts = {}) => new Promise((resolve, reject) => {
    const outgoing = require('node:http').request({hostname: '127.0.0.1', port: server.address().port, path: url,
      method: opts.method || 'GET', headers: {Host: 'family.example.test', ...opts.headers}}, incoming => {
      const chunks = [];
      incoming.on('data', chunk => chunks.push(chunk));
      incoming.on('end', () => resolve(new Response(Buffer.concat(chunks), {status: incoming.statusCode, headers: incoming.headers})));
    });
    outgoing.on('error', reject);
    outgoing.end(opts.body ? opts.body.toString() : undefined);
  });
  const login = (value = password, remember = true, headers = {}) => request('/family/login', {method: 'POST',
    headers: {Origin: config.origin, 'Content-Type': 'application/x-www-form-urlencoded', ...headers},
    body: new URLSearchParams({password: value, ...(remember ? {remember: 'yes'} : {})})});
  const cookie = response => response.headers.get('set-cookie').split(';')[0];
  try {
    await start();
    assert.equal((await request('/mobile')).headers.get('location'), '/family/login');
    assert.equal((await request('/mobile/full')).headers.get('location'), '/family/login');
    for (const url of ['/api/calendar/upcoming', '/api/weather/radar', '/Mobile/test.js']) {
      const r = await request(url, {headers: {'Cf-Access-Jwt-Assertion': 'forged'}});
      assert.equal(r.status, 401); assert.equal(r.headers.get('X-Dad-Radar-Login'), '/family/login');
      assert(!JSON.stringify(await r.json()).includes('schedule'));
    }
    const screen = await request('/family/login');
    assert.equal(screen.status, 200);assert.match(screen.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(screen.headers.get('referrer-policy'), 'same-origin', 'Browser form submissions need a same-origin Origin header.');
    const insecure = await request('/family/login', {headers: {'X-Forwarded-Proto': 'http'}});
    assert.equal(insecure.headers.get('location'), config.origin + '/family/login');
    assert.match(await screen.text(), /Remember this device for 30 days/);
    assert.equal((await login(password, true, {Origin: 'https://evil.test'})).status, 403);
    assert.equal((await login(password, true, {Origin: ''})).status, 403);
    assert.equal((await login(password, true, {Host: 'evil.test'})).status, 403);
    assert.equal((await login('Wrong family phrase')).status, 401);
    const signed = await login(); assert.equal(signed.status, 303);
    const fullCookie = signed.headers.get('set-cookie');
    assert.match(fullCookie, /^__Host-dad-radar-session=/);assert.match(fullCookie, /Secure; HttpOnly; SameSite=Lax/);
    assert.match(fullCookie, /Max-Age=2592000/);
    const remembered = cookie(signed);
    const headers = {Cookie: remembered};
    assert.equal((await request('/mobile', {headers})).status, 200);
    assert.equal((await request('/api/calendar/upcoming', {headers})).status, 200);
    assert.equal((await request('/Mobile/test.js', {headers})).headers.get('cache-control'), 'private, no-store');
    for (const url of ['/api/diagnostics/recent', '/API/diagnostics/recent']) assert.equal((await request(url, {headers})).status, 404);
    assert.equal((await request('/api/flights/lookup', {method: 'POST', headers: {...headers, Origin: 'https://evil.test'}})).status, 403);
    assert.equal((await request('/api/flights/lookup', {method: 'POST', headers: {...headers, Origin: config.origin}})).status, 200);
    assert.equal((await request('/api/calendar/upcoming', {headers: {Cookie: remembered + 'bad'}})).status, 401);
    assert.equal((await request('/api/calendar/upcoming', {headers: {Cookie: remembered + '; ' + remembered}})).status, 401);
    const disk = fs.readFileSync(options.sessionFile, 'utf8');
    assert(!disk.includes(remembered.split('=')[1]));assert(!disk.includes(password));
    await stop();await start();
    assert.equal((await request('/mobile', {headers})).status, 200, 'Remembered login survives server restart.');
    const short = await login(password, false);
    assert.equal(short.status, 303);assert(!short.headers.get('set-cookie').includes('Max-Age'));
    clock += 13 * 3600000;
    assert.equal((await request('/api/calendar/upcoming', {headers: {Cookie: cookie(short)}})).status, 401);
    assert.equal((await request('/mobile', {headers})).status, 200);
    assert.equal((await request('/family/logout', {method: 'POST', headers: {...headers, Origin: 'https://evil.test'}})).status, 403);
    const logout = await request('/family/logout', {method: 'POST', headers: {...headers, Origin: config.origin}});
    assert.equal(logout.status, 303);assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    await stop();await start();
    assert.equal((await request('/api/calendar/upcoming', {headers})).status, 401, 'Logout revokes even a copied cookie after restart.');
    const again = cookie(await login());
    clock += 31 * 86400000;
    assert.equal((await request('/api/calendar/upcoming', {headers: {Cookie: again}})).status, 401);
    const beforeChange = cookie(await login());
    await stop();await start({...config, passwordHash: await hashPassword('A different family phrase')});
    assert.equal((await request('/api/calendar/upcoming', {headers: {Cookie: beforeChange}})).status, 401, 'Password rotation revokes all old devices.');
    for (let i = 0; i < 10; i++) assert.equal((await login('Wrong family phrase', true, {'CF-Connecting-IP': '192.0.2.1'})).status, 401);
    assert.equal((await login('Wrong family phrase', true, {'CF-Connecting-IP': '192.0.2.1'})).status, 429);
    // Protect the hashing worker even if callers vary client IP headers.
    for (let i = 0; i < 50; i++) assert.equal((await login('x', true, {'CF-Connecting-IP': `192.0.2.${i+2}`})).status, 401);
    assert.equal((await login('x', true, {'CF-Connecting-IP': '198.51.100.1'})).status, 429);
    await stop();
    fs.writeFileSync(options.sessionFile, 'invalid');
    assert.throws(() => createMobileGateway(app, config, options));
    const unavailable = sessionStore(config, {sessionFile: path.join(directory, 'missing-parent', 's.json')});
    fs.writeFileSync(path.join(directory, 'missing-parent'), 'not a directory');
    assert.throws(() => unavailable.issue(true), 'Storage failure must not issue a nonpersistent login.');
    console.log('Family password, remembered sessions, revocation, gateway isolation, CSRF and rate-limit tests passed.');
  } finally {await stop();fs.rmSync(directory, {recursive: true, force: true});}
})().catch(e => {console.error(e);process.exitCode=1;});
