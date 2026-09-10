const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const net = require('node:net');
const { startServer } = require('./index');

async function run() {
  const reservation = net.createServer().listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const mobilePort = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const env = {
    DAD_RADAR_MOBILE_AUTH: 'password',
    DAD_RADAR_MOBILE_ORIGIN: 'https://family.example.test',
    DAD_RADAR_MOBILE_PORT: String(mobilePort),
    DAD_RADAR_FAMILY_PASSWORD_HASH: `scrypt-v1:${'00'.repeat(16)}:${'00'.repeat(32)}`
  };
  // Exercise the imported entry point used by the Windows background host.
  const server = startServer({ port: 0, host: '127.0.0.1', master: false, mobileOptions: { env } });
  try {
    await once(server, 'listening');
    const gateway = server.mobileGateway;
    assert(gateway, 'Imported startup must start the configured mobile gateway');
    if (!gateway.listening) await once(gateway, 'listening');
    assert.equal(gateway.address().address, '127.0.0.1');
    const status = await new Promise((resolve, reject) => {
      http.get({ hostname: '127.0.0.1', port: mobilePort, path: '/family/login',
        headers: { Host: 'family.example.test' } }, response => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      }).on('error', reject);
    });
    assert.equal(status, 200, 'Family login must answer through background startup');
    const closed = once(gateway, 'close');
    await new Promise(resolve => server.close(resolve));
    await closed;
    assert.equal(gateway.listening, false, 'Primary shutdown must stop the gateway');
    console.log('Mobile background startup tests passed.');
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
