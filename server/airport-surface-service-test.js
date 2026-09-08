"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {createAirportSurfaceService, airportForCode, normalizeGeometry} = require("./airport-surface-service");
const {normalizeAdsbSnapshot, selectAircraft} = require("./adsb-lol-service");
const {normalizeLookup} = require("./flightradar24-service");
const {reconcileScheduleWithLive} = require("../models/live-flight-state");

const NOW = "2026-09-08T13:00:00.000Z";
const airport = airportForCode("AVL");
const fixture = {elements: [{type: "way", tags: {aeroway: "runway", ref: "17/35", width: "45"}, geometry: [
  {lat: airport.latitude - 0.01, lon: airport.longitude}, {lat: airport.latitude + 0.01, lon: airport.longitude}]}]};
const lookup = normalizeLookup({origin: "AVL", destination: "ORD", liveLookupCandidates: ["ENY1234"], startUtc: "2026-09-08T12:30:00Z"});
const record = {flight: "ENY1234", hex: "a12345", type: "adsb_icao", lat: airport.latitude, lon: airport.longitude,
  alt_baro: "ground", gs: 0, track: 179, seen_pos: 2};
const calendar = {mode: "DELAYED", event: {id: "today", origin: "AVL", destination: "ORD", liveLookupCandidates: ["ENY1234"],
  times: {startUtc: "2026-09-08T12:30:00Z", endUtc: "2026-09-08T14:30:00Z"}},
  state: {status: "DELAYED", flight: {number: "1234", origin: "AVL", destination: "ORD", progress: 0}}};

for (const speed of [0, 2, 15, null]) {
  const snapshot = normalizeAdsbSnapshot({...record, gs: speed}, lookup, NOW);
  assert.equal(snapshot.phase, "TAXI_OUT", "A fresh ground report at origin is taxi, including pushback/holds.");
  const resolved = reconcileScheduleWithLive(calendar, snapshot, {now: NOW});
  assert.equal(resolved.mode, "TAXI_OUT", "Schedule lateness cannot override a current ground transmission.");
  assert.equal(resolved.state.status, "TAXI OUT");
  assert.equal(resolved.state.flight.surfacePosition.onGround, true);
  assert.equal(resolved.state.flight.heading, 179);
  assert.equal(resolved.state.flight.groundSpeed, speed);
}
for (const change of [{seen_pos: 120}, {seen_pos: undefined}, {lat: null}, {lat: 35, lon: -100}]) {
  const snapshot = normalizeAdsbSnapshot({...record, ...change}, lookup, NOW);
  assert.notEqual(reconcileScheduleWithLive(calendar, snapshot, {now: NOW}).mode, "TAXI_OUT", "Stale/missing/off-airport evidence must not initiate taxi.");
}
assert.equal(selectAircraft([{...record, lat: null}], "ENY1234"), null);
assert.equal(selectAircraft([record], "AAL1234"), null);
const airborne = normalizeAdsbSnapshot({...record, alt_baro: 5000, gs: 170, baro_rate: 1800}, lookup, NOW);
assert.equal(airborne.position.onGround, false);
assert.equal(airborne.position.altitudeFeet, 5000);
assert.equal(airborne.position.groundSpeedKnots, 170);
assert.equal(airborne.position.verticalSpeedFeetPerMinute, 1800);
assert.equal(airborne.phase, "EN_ROUTE");
const destination = airportForCode("ORD");
assert.equal(normalizeAdsbSnapshot({...record, lat: destination.latitude, lon: destination.longitude}, lookup, NOW).phase, "ARRIVED");

(async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "dad-radar-airports-"));
  let time = Date.parse(NOW), requests = 0, fail = false;
  const fetchImpl = async (url, options) => {
    requests++;
    assert.equal(url, "https://overpass-api.de/api/interpreter");
    assert.match(decodeURIComponent(options.body), /around:7000/);
    if (fail) return new Response("unavailable", {status: 429});
    return Response.json(fixture);
  };
  const options = {cacheDir, now: () => time, fetchImpl, spacingMs: 0};
  try {
    const service = createAirportSurfaceService(options);
    assert.equal(await service.get("../../token"), null);
    assert.equal(await service.get("ZZZZ"), null);
    const results = await Promise.all([service.get("AVL"), service.get("avl"), service.get("AVL")]);
    assert(results.every(r => r.pending));
    await service.idle();
    assert.equal(requests, 1, "Two screens share one download.");
    assert.equal((await service.get("AVL")).map.features.length, 1);
    const restarted = createAirportSurfaceService(options);
    assert.equal((await restarted.get("AVL")).map.code, "AVL");
    assert.equal(requests, 1, "A restart reuses the disk cache.");
    time += 31 * 86400000;
    fail = true;
    assert.equal((await restarted.get("AVL")).stale, true);
    await restarted.idle();
    assert.equal(requests, 2);
    assert.equal((await restarted.get("AVL")).map.features.length, 1, "An outage retains complete older geometry.");
    await restarted.get("AVL"); await restarted.idle();
    assert.equal(requests, 2, "Provider failure backs off.");
    time += 86400001; fail = false;
    await restarted.get("AVL"); await restarted.idle();
    assert.equal((await restarted.get("AVL")).stale, false);
    assert.equal(requests, 3);
    assert.throws(() => normalizeGeometry({elements: [], remark: "timeout"}, airport, NOW));
    assert.throws(() => normalizeGeometry({elements: [{...fixture.elements[0], geometry: [{lat: 0, lon: 0}, {lat: 1, lon: 1}]}]}, airport, NOW));
    assert.throws(() => normalizeGeometry({elements: []}, airport, NOW));
  } finally {await fs.rm(cacheDir, {recursive: true, force: true});}
  console.log("Airport cache, provider recovery, and ADS-B taxi status tests passed.");
})().catch(error => {console.error(error); process.exitCode = 1;});
