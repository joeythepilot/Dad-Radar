const assert = require('node:assert/strict');
const {Writable} = require('node:stream');
const {createDisplayFixture} = require('./display-browser-fixture');

(async () => {
  const {server} = createDisplayFixture();
  for (const route of ['/mobile', '/mobile/full']) {
    const chunks = [];
    const response = new Writable({write(chunk, _encoding, next) {chunks.push(chunk); next();}});
    response.setHeader = () => {};
    response.writeHead = status => {response.statusCode = status;};
    const done = new Promise(resolve => response.on('finish', resolve));
    server.emit('request', {url: route, method: 'GET'}, response);
    await done;
    const html = Buffer.concat(chunks).toString();
    assert.notEqual(response.statusCode, 404, `${route} is available`);
    assert.match(html, /data-family-full/, `${route} serves the full dashboard`);
    assert.match(html, /id="dashboard"/, `${route} includes the primary display`);
  }
  console.log('Browser fixture serves one full family dashboard on both routes.');
})().catch(error => {console.error(error); process.exitCode = 1;});
