"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {createFlightLegGuard, legKey} = require("./flight-leg-guard");
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

function testSameNumberInboundBeforeOutbound() {
  const bmiToDfw = {id: "bmi-dfw-3364", kind: "flight", origin: "BMI", destination: "DFW",
    flightNumber: "3364", carrierCode: "MQ", liveLookupCandidates: ["ENY3364"],
    times: {startUtc: "2026-10-05T22:00:00Z", endUtc: "2026-10-06T00:00:00Z"}};
  let now = Date.parse("2026-10-05T21:40:00Z");
  const inboundNearBmi = {hex: "abc123", flight: "ENY3364",
    lat: bmi.latitude - .08, lon: bmi.longitude - .08,
    alt_baro: 8000, gs: 210, track: 45, seen_pos: 0};
  const inboundFarther = {...inboundNearBmi,
    lat: bmi.latitude - .4, lon: bmi.longitude - .4};
  const inboundAtGate = {...inboundNearBmi,
    lat: bmi.latitude, lon: bmi.longitude, alt_baro: "ground", gs: 0};
  const guard = createFlightLegGuard({});
  assert.equal(guard.inspect(bmiToDfw, snapshot(inboundNearBmi, now, bmiToDfw), now).accepted, false,
    "An inbound approach close to BMI cannot acquire the same-number BMI-DFW leg");
  const legacyStorage = {"dad-radar.flight-leg-guard.v1": JSON.stringify({
    version: 1, key: legKey(bmiToDfw), airborne: true, hex: "ABC123"})};
  assert.equal(createFlightLegGuard(legacyStorage).inspect(bmiToDfw,
    snapshot(inboundNearBmi, now, bmiToDfw), now).accepted, false,
    "A prior version's mistaken airborne latch must not survive the deployment restart");
  now += 10000;
  assert.equal(guard.inspect(bmiToDfw, snapshot(inboundFarther, now, bmiToDfw), now).accepted, false,
    "An inbound callsign must not latch and then bypass direction checks");
  assert.equal(createFlightLegGuard({}).inspect(bmiToDfw,
    snapshot({...inboundFarther, track: null}, now, bmiToDfw), now).accepted, false,
    "A route-less report without heading cannot identify a same-number outbound leg");
  now += 10000;
  assert.equal(guard.inspect(bmiToDfw, snapshot(inboundAtGate, now, bmiToDfw), now).accepted, false,
    "Deplaning at BMI is not evidence that the outbound leg has pushed back");
  now += 10000;
  const genuineOutbound = {...inboundNearBmi, lat: bmi.latitude - .1, lon: bmi.longitude - .1,
    alt_baro: 7000, gs: 230, track: 235};
  assert.equal(guard.inspect(bmiToDfw, snapshot(genuineOutbound, now, bmiToDfw), now).accepted, true,
    "An airborne departure moving toward DFW can acquire the scheduled leg");
  const outConfirmed = {...bmiToDfw, operational: {actualOut: new Date(now).toISOString()}};
  assert.equal(createFlightLegGuard({}).inspect(outConfirmed,
    snapshot(inboundAtGate, now, outConfirmed), now).accepted, true,
    "A route-matched airline OUT can identify the ground phase before takeoff");
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
testSameNumberInboundBeforeOutbound();
testMasterContinuity().then(() => console.log("Flight leg tests passed: reverse callsign, aircraft continuity, taxi-in, restart, go-around and reassignment."))
  .catch(error => {console.error(error); process.exitCode = 1;});
