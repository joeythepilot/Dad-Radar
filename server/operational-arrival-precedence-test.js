"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {createMasterStateService} = require("./master-state-service");

async function run() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dad-op-arrival-"));
  const stateFile = path.join(dir, "master-state.json");
  const eventId = "arrival-precedence-flight";
  const plannedStart = "2026-09-17T17:00:00.000Z";
  const plannedEnd = "2026-09-17T20:00:00.000Z";
  const inferredArrival = "2026-09-17T19:05:00.000Z";
  const actualIn = "2026-09-17T19:10:00.000Z";
  const now = Date.parse("2026-09-17T19:20:00.000Z");

  fs.writeFileSync(stateFile, JSON.stringify({
    version: 1,
    storage: {
      "dad-radar.confirmed-arrivals.v1": JSON.stringify({
        [eventId]: inferredArrival
      })
    }
  }));

  const jobs = new Map();
  const master = createMasterStateService({
    file: stateFile,
    now: () => now,
    console: {warn() {}, error() {}},
    setInterval(fn, delay) { const key = {}; jobs.set(key, {fn, delay}); return key; },
    clearInterval(key) { jobs.delete(key); },
    async getCalendar() {
      return {
        retrievedAt: new Date(now).toISOString(),
        events: [{
          id: eventId,
          kind: "flight",
          status: "confirmed",
          carrierCode: "AA",
          flightNumber: "3917",
          origin: "ORD",
          destination: "CMH",
          liveLookupCandidates: ["AA3917", "ENY3917"],
          times: {source: "calendar", startUtc: plannedStart, endUtc: plannedEnd}
        }]
      };
    },
    async getOperational() {
      return {
        provider: "flightaware",
        faFlightId: "fa-arrival",
        ident: "AA3917",
        retrievedAt: new Date(now).toISOString(),
        scheduledOut: plannedStart,
        estimatedOut: plannedStart,
        actualOut: "2026-09-17T17:04:00.000Z",
        scheduledOff: "2026-09-17T17:15:00.000Z",
        estimatedOff: "2026-09-17T17:15:00.000Z",
        actualOff: "2026-09-17T17:16:00.000Z",
        scheduledOn: "2026-09-17T19:45:00.000Z",
        estimatedOn: "2026-09-17T18:58:00.000Z",
        actualOn: "2026-09-17T18:59:00.000Z",
        scheduledIn: plannedEnd,
        estimatedIn: actualIn,
        actualIn,
        cancelled: false,
        diverted: false,
        status: "Arrived",
        departureDelayMinutes: 4,
        arrivalDelayMinutes: 0
      };
    },
    async getFlight() {
      return {snapshot: null, attempts: [{provider: "adsb.lol", outcome: "no-match"}]};
    }
  });

  try {
    await master.start();
    const resolved = master.read().resolved;
    assert.equal(resolved.mode, "ARRIVED");
    assert.equal(resolved.state.flight.actualIn, actualIn);
    assert.equal(resolved.event.confirmedArrivalAt, actualIn,
      "Real FlightAware actual IN must replace any earlier inferred-arrival checkpoint.");
    assert.equal(resolved.event.times.endUtc, plannedEnd,
      "A prior inferred arrival must not rewrite the planned Calendar end once real operational arrival exists.");
    assert.notEqual(resolved.event.confirmedArrivalAt, inferredArrival);
  } finally {
    master.stop();
    fs.rmSync(dir, {recursive: true, force: true});
  }

  await testGateInDuringActiveTaxi();
  console.log("Operational arrival precedence test passed.");
}

async function testGateInDuringActiveTaxi() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dad-op-taxi-in-"));
  let now = Date.now();
  let actualIn = null;
  const event = {id: "gate-after-taxi", kind: "flight", status: "confirmed", carrierCode: "AA", flightNumber: "3792",
    origin: "ORD", destination: "AVL", liveLookupCandidates: ["AA3792", "ENY3792"],
    times: {startUtc: new Date(now - 7200000).toISOString(), endUtc: new Date(now + 60000).toISOString()}};
  const options = {
    file: path.join(dir, "state.json"), now: () => now,
    setInterval: () => ({}), clearInterval() {}, console: {warn() {}, error() {}},
    getCalendar: async () => ({retrievedAt: new Date(now).toISOString(), events: [event]}),
    getOperational: async () => ({provider: "flightaware", actualOut: event.times.startUtc,
      actualOn: new Date(now - 60000).toISOString(), actualIn, retrievedAt: new Date(now).toISOString()}),
    getFlight: async () => ({snapshot: {provider: "adsb.lol", phase: "ARRIVED", origin: "ORD", destination: "AVL",
      ident: "ENY3792", progressPercent: 100, retrievedAt: new Date(now).toISOString(),
      position: {latitude: 35.44, longitude: -82.54, onGround: true, groundSpeedKnots: 14,
        headingDegrees: 160, recordedAt: new Date(now).toISOString()}}, attempts: []})
  };
  let master = createMasterStateService(options);
  try {
    await master.start();
    await master.poll();
    assert.equal(master.read().resolved.mode, "TAXI_IN");
    now += 60000;
    actualIn = new Date(now).toISOString();
    await master.refreshCalendar();
    const parked = master.read().resolved;
    assert.equal(parked.mode, "ARRIVED", "Airline IN overrides retained moving-ground telemetry");
    assert.equal(parked.state.flight.actualIn, actualIn);
    assert.notEqual(parked.state.flight.arrivalEstimated, true);
    master.stop();
    master = createMasterStateService(options);
    await master.start();
    assert.equal(master.read().resolved.mode, "ARRIVED", "Arrival remains authoritative after a server restart");
  } finally {
    master.stop();
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
