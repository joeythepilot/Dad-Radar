"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {createAirportSurfaceService, airportForCode, normalizeGeometry} = require("./airport-surface-service");
const {normalizeAdsbSnapshot, selectAircraft} = require("./adsb-lol-service");
const {normalizeLookup, normalizeFlightSnapshot} = require("./flightradar24-service");
const {reconcileScheduleWithLive} = require("../models/live-flight-state");
const {selectAirport} = require("../App/airport-surface-map");

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

// Replay the ORD–BIL report: existing FR24 ADSB fallback telemetry must reach
// both the status board and the airport camera, even below the old 3-knot cutoff.
const bil = airportForCode("BIL");
const fr24Lookup = normalizeLookup({origin: "ORD", destination: "BIL", liveLookupCandidates: ["AA3498", "ENY3498"], startUtc: "2026-09-08T12:30:00Z"});
const fr24Record = {flight: "AA3498", callsign: "ENY3498", reg: "N311VE", lat: destination.latitude, lon: destination.longitude,
  alt: 0, gspeed: 2, track: 53, vspeed: 0, timestamp: NOW, source: "ADSB", orig_iata: "ORD", dest_iata: "BIL"};
const fr24Calendar = {...calendar, event: {...calendar.event, origin: "ORD", destination: "BIL", liveLookupCandidates: ["AA3498", "ENY3498"]},
  state: {...calendar.state, flight: {...calendar.state.flight, number: "3498", origin: "ORD", destination: "BIL"}}};
function resolveFr24(change) {
  const snapshot = normalizeFlightSnapshot({...fr24Record, ...change}, fr24Lookup, NOW);
  return {snapshot, resolved: reconcileScheduleWithLive(fr24Calendar, snapshot, {now: NOW})};
}
for (const speed of [0, 2, 15]) {
  const {snapshot, resolved} = resolveFr24({gspeed: speed});
  assert.equal(snapshot.phase, "TAXI_OUT");
  assert.equal(snapshot.position.groundEvidence, "fr24-adsb-zero-altitude");
  assert.equal(resolved.mode, "TAXI_OUT", "Fresh ground fallback telemetry also overrides schedule lateness.");
  assert.equal(resolved.state.flight.groundSpeed, speed);
  assert.equal(resolved.state.flight.heading, 53);
  assert.equal(resolved.state.flight.surfacePosition.source, "ADSB", "Keep the actual provider source.");
  assert.equal(selectAirport(resolved.state.flight.surfacePosition, [destination, bil], Date.parse(NOW), null).airport.code, "ORD");
}
for (const change of [{timestamp: null}, {timestamp: "2026-09-08T12:58:00Z"}, {timestamp: "2026-09-08T13:01:00Z"},
  {source: "MLAT"}, {source: "ESTIMATED"}, {source: null}, {alt: null}, {alt: 3000}, {gspeed: null},
  {gspeed: 140}, {vspeed: 1200}, {lat: null}, {lat: 35, lon: -100}]) {
  const {snapshot, resolved} = resolveFr24(change);
  assert.notEqual(snapshot.position.onGround, true, "Do not infer surface evidence from missing/stale/airborne/estimated reports.");
  assert.equal(selectAirport(resolved.state.flight.surfacePosition, [destination, bil], Date.parse(NOW), null), null);
}
const fr24Airborne = resolveFr24({alt: 5000, gspeed: 170, vspeed: 1800});
assert.equal(fr24Airborne.snapshot.phase, "EN_ROUTE");
assert.notEqual(fr24Airborne.resolved.state.flight.surfacePosition.onGround, true, "A provider change or takeoff clears ground evidence.");
const fr24Arrival = resolveFr24({lat: bil.latitude, lon: bil.longitude});
assert.equal(fr24Arrival.resolved.mode, "ARRIVED");
assert.equal(selectAirport(fr24Arrival.resolved.state.flight.surfacePosition, [destination, bil], Date.parse(NOW), null).airport.code, "BIL");

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
