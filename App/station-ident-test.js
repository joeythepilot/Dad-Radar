const assert = require('node:assert/strict');
const {createStationIdentController, createStationIdentWav} = require('./station-ident');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sample = (eventId, overrides = {}) => ({
  eventId,
  liveData: true,
  livePhase: 'EN_ROUTE',
  source: 'adsb.lol',
  ...overrides,
  flight: {
    origin: 'AVL', destination: 'ORD',
    latitude: 35.5, longitude: -82.5,
    positionSource: 'adsb.lol',
    lastPositionAt: '2026-10-03T16:00:00Z',
    ...overrides.flight
  }
});

async function run() {
  const wav = createStationIdentWav('MAX');
  assert.equal(Buffer.from(wav).subarray(0, 4).toString(), 'RIFF');
  assert.ok(wav.length > 290000 && wav.length < 310000, 'MAX has the approved roughly 3.4-second cadence');
  let plays = 0;
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const options = {
    identifier: 'MAX', storage, now: () => Date.parse('2026-10-03T16:00:10Z'),
    source: 'max.wav',
    audioFactory: () => ({
      currentTime: 0, volume: 1, preload: '',
      play() { plays++; return Promise.resolve(); }, pause() {}
    })
  };
  const controller = createStationIdentController(options);
  assert.equal(controller.observe(sample('leg-1', {liveData: false})), false);
  assert.equal(controller.observe(sample('leg-1', {source: 'flightradar24', flight: {positionSource: 'flightradar24'}})), false);
  assert.equal(controller.observe(sample('leg-1', {flight: {lastPositionAt: '2026-10-03T15:58:00Z'}})), false);
  assert.equal(controller.observe(sample('leg-1', {flight: {latitude: null}})), false);
  assert.equal(controller.observe(sample('leg-1', {livePhase: 'ARRIVED'})), false);
  assert.equal(controller.observe(sample(null)), false);
  assert.equal(plays, 0, 'A calendar state or stale/non-ADS-B track must stay silent');

  assert.equal(controller.observe(sample('leg-1')), true);
  assert.equal(controller.observe(sample('leg-1')), false, 'An update during playback cannot restart the ID');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(plays, 1);
  assert.equal(controller.observe(sample('leg-1')), false);
  const afterReload = createStationIdentController(options);
  assert.equal(afterReload.observe(sample('leg-1')), false, 'A display reload must not replay an identified flight');
  assert.equal(afterReload.observe(sample('leg-2')), true, 'A new flight gets a new identification');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(plays, 2);

  const frAdsb = sample('leg-3', {
    source: 'flightradar24',
    flight: {positionSource: 'flightradar24', surfacePosition: {source: 'ADSB'}}
  });
  assert.equal(afterReload.observe(frAdsb), true, 'A genuine ADS-B feed relayed by FR24 qualifies');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(plays, 3);

  let attempts = 0;
  const retry = createStationIdentController({
    ...options, storage: {getItem() {return null;}, setItem() {}},
    audioFactory: () => ({
      play() {attempts++; return attempts === 1 ? Promise.reject(new Error('blocked')) : Promise.resolve();},
      pause() {}, currentTime: 0
    })
  });
  assert.equal(retry.observe(sample('retry')), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(retry.observe(sample('retry')), true, 'A blocked sound can play on a later fresh update');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(attempts, 2);
  assert.equal(retry.observe(sample('retry')), false);

  let quiet = false;
  const deferred = createStationIdentController({
    ...options, storage: {getItem() {return null;}, setItem() {}},
    canPlay: () => quiet,
    audioFactory: () => ({play() {plays++; return Promise.resolve();}, pause() {}, currentTime: 0})
  });
  assert.equal(deferred.observe(sample('quiet-leg')), false, 'The identifier waits while the split flap is sounding');
  quiet = true;
  assert.equal(deferred.observe(sample('quiet-leg')), true);
  await new Promise(resolve => setImmediate(resolve));

  const main = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const start = main.indexOf('function observeStationIdent(');
  assert.ok(start >= 0, 'The display must subscribe the station ID to flight state');
  const end = main.indexOf('\nwindow.addEventListener(', start);
  const integration = {stationIdentController: createStationIdentController({
    ...options, storage: {getItem() {return null;}, setItem() {}},
    audioFactory: () => ({play() {plays++; return Promise.resolve();}, pause() {}, currentTime: 0})
  })};
  vm.createContext(integration);
  vm.runInContext(main.slice(start, end), integration);
  integration.observeStationIdent(sample('integration-leg'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(plays, 5, 'The real display adapter plays the identifier on a fresh ADS-B flight');
  console.log('Station identifier tests passed.');
}

run().catch(error => {console.error(error); process.exitCode = 1;});
