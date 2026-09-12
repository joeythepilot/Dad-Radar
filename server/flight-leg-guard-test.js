"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {createFlightLegGuard} = require("./flight-leg-guard");
const {createMasterStateService} = require("./master-state-service");
const {normalizeAdsbSnapshot} = require("./adsb-lol-service");
const {normalizeLookup} = require("./flightradar24-service");
const {lookupAirport} = require("../data/airport-catalog");

const bmi = lookupAirport("BMI");
const event = {id: "ord-bmi-3367", kind: "flight", status: "confirmed", origin: "ORD", destination: "BMI",
  flightNumber: "3367", carrierCode: "MQ", liveLookupCandidates: ["ENY3367"],
  times: {startUtc: "2026-09-12T16:45:00Z", endUtc: "2026-09-12T17:49:00Z"}};
const inbound = {hex: "abc123", r: "N123AA", flight: "ENY3367", lat: bmi.latitude + .06, lon: bmi.longitude,
  alt_baro: bmi.elevationFeet + 1800, gs: 145, track: 180, baro_rate: -700, seen_pos: 0};
const ground = {...inbound, lat: bmi.latitude, alt_baro: "ground", gs: 0, baro_rate: 0};
const outbound = {...inbound, lat: bmi.latitude + .45, alt_baro: 17000, gs: 377, track: 352, baro_rate: 900};
const snapshot = (record, at, selected = event) => normalizeAdsbSnapshot(record,
  normalizeLookup(selected), new Date(at).toISOString());

function testAssociation() {
  let now = Date.parse("2026-09-12T17:40:00Z");
  const storage = {};
  let guard = createFlightLegGuard(storage);
  assert.equal(guard.inspect(event, snapshot(outbound, now), now).reason, "direction-unconfirmed",
    "Fresh callsign alone cannot attach a northbound return to ORD-BMI");
  assert.equal(guard.inspect(event, snapshot(inbound, now), now).accepted, true);
  now += 30000;
  assert.equal(guard.inspect(event, snapshot({...inbound, hex: "def456", r: "N456AA"}, now), now).reason,
    "different-aircraft", "Do not change airframes after airborne acquisition");
  // A brief reversal while established on the leg is not proof of another flight.
  assert.equal(guard.inspect(event, snapshot({...inbound, track: 352, baro_rate: 900}, now), now).accepted, true);
  now += 30000;
  assert.equal(guard.inspect(event, snapshot(ground, now), now).accepted, true);
  now += 60000;
  assert.equal(guard.inspect(event, snapshot(ground, now), now).accepted, true, "Stationary taxi telemetry remains valid");
  guard = createFlightLegGuard(storage);
  now += 20 * 60000;
  assert.equal(guard.inspect(event, snapshot(outbound, now), now).reason, "departure-after-destination-ground",
    "Same aircraft and same callsign return is excluded after restart");
  guard.complete(event);
  assert.equal(guard.inspect(event, snapshot(inbound, now), now).reason, "completed-leg");
  const returnEvent = {...event, id: "bmi-ord-3367", origin: "BMI", destination: "ORD",
    times: {startUtc: "2026-09-12T18:00:00Z", endUtc: "2026-09-12T19:00:00Z"}};
  assert.equal(guard.inspect(returnEvent, snapshot(outbound, now, returnEvent), now).accepted, true,
    "A scheduled return leg can independently acquire the same airplane and callsign");
  const reassigned = {...event, origin: "BMI", destination: "ORD", times: returnEvent.times};
  assert.equal(guard.inspect(reassigned, snapshot(outbound, now, reassigned), now).accepted, true,
    "Same-event calendar reassignment resets association");
  assert.equal(guard.inspect(reassigned, snapshot(inbound, now), now).reason, "different-route");
}

function testGoAroundAndAmbiguity() {
  let now = Date.parse("2026-09-12T17:40:00Z");
  let guard = createFlightLegGuard({});
  guard.inspect(event, snapshot(inbound, now), now);
  now += 60000;
  assert.equal(guard.inspect(event, snapshot({...inbound, lat: bmi.latitude + .1, track: 352,
    alt_baro: bmi.elevationFeet + 3000, baro_rate: 1500}, now), now).accepted, true, "An immediate go-around remains trackable");
  now += 15 * 60000;
  const uncertain = guard.inspect(event, snapshot(outbound, now), now);
  assert.equal(uncertain.reason, "post-approach-association-unconfirmed");
  assert.equal(uncertain.uncertain, true, "Ambiguity must not be used to infer parking");
  guard = createFlightLegGuard({});
  guard.inspect(event, snapshot(ground, now), now);
  now += 30000;
  assert.equal(guard.inspect(event, snapshot({...inbound, baro_rate: 1800, track: 352}, now), now).accepted, true,
    "A bounce or touch-and-go immediately after one ground report does not close the leg");
}

async function testMasterContinuity() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dad-leg-"));
  let now = Date.parse("2026-09-12T17:40:00Z"), record = inbound;
  const diagnostics = [];
  const options = {file: path.join(dir, "master.json"), now: () => now,
    console: {warn() {}, error() {}}, setInterval() {return {};}, clearInterval() {},
    report: (kind, data) => diagnostics.push({kind, ...data}),
    getCalendar: async () => ({events: [event], retrievedAt: new Date(now).toISOString()}),
    getFlight: async () => ({snapshot: snapshot(record, now), attempts: [{provider: "adsb.lol", outcome: "matched"}]})};
  let master = createMasterStateService(options);
  try {
    await master.start(); await master.poll();
    assert.equal(master.read().resolved.mode, "LANDING");
    record = ground; now += 60000; await master.poll();
    assert.equal(master.read().resolved.mode, "TAXI_IN");
    const arrivalTrack = master.read().resolved.state.flight.actualTrack;
    master.stop(); master = createMasterStateService(options);
    now += 20 * 60000; record = outbound;
    await master.start(); await master.poll();
    assert.equal(master.read().resolved.mode, "TAXI_IN");
    assert.deepEqual(master.read().resolved.state.flight.actualTrack, arrivalTrack,
      "The return leg never enters the actual track, including after server restart");
    for (let i = 0; i < 6; i++) {now += 60000; await master.poll();}
    assert.equal(master.read().resolved.mode, "ARRIVED", "Healthy absence of this leg completes taxi-in");
    assert.equal(master.read().resolved.state.flight.destination, "BMI");
    assert.deepEqual(master.read().resolved.state.flight.actualTrack, arrivalTrack);
    assert(diagnostics.some(row => row.kind === "flight-leg-rejected" && row.reason === "departure-after-destination-ground"));
  } finally {master.stop(); fs.rmSync(dir, {recursive: true, force: true});}
}

testAssociation();
testGoAroundAndAmbiguity();
testMasterContinuity().then(() => console.log("Flight leg tests passed: reverse callsign, aircraft continuity, taxi-in, restart, go-around and reassignment."))
  .catch(error => {console.error(error); process.exitCode = 1;});
