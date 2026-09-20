"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {createMasterStateService} = require("./master-state-service");
const {getOperationalStatus} = require("./flightaware-operational-service");
const airport = require("../data/airport-catalog").lookupAirport("CLT");

// Exercise the real master, controller and paid-request cache. Only external
// Calendar/provider responses and timer scheduling are replaced by fixtures.
async function scenario(earlyArrival) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dad-op-handoff-"));
  let now = Date.parse("2026-09-20T09:50:00Z");
  let paidRequests = 0, operationalCalls = 0, telemetryCalls = 0;
  let outage = false, tracking = null;
  const cache = new Map();
  const event = {id: "work-handoff", kind: "flight", status: "confirmed",
    carrierCode: "AA", flightNumber: "4000", origin: "ORD", destination: "CLT",
    liveLookupCandidates: ["AA4000"],
    times: {startUtc: "2026-09-20T10:00:00Z", endUtc: "2026-09-20T12:00:00Z"}};
  let record = {fa_flight_id: "fa-handoff", ident: "AA4000",
    origin: {code_iata: "ORD"}, destination: {code_iata: "CLT"},
    scheduled_out: event.times.startUtc, estimated_out: "2026-09-20T10:15:00Z",
    scheduled_on: "2026-09-20T11:50:00Z", estimated_on: "2026-09-20T11:50:00Z",
    scheduled_in: event.times.endUtc, estimated_in: event.times.endUtc,
    actual_out: null, actual_off: null, actual_on: null, actual_in: null, status: "Delayed"};
  const options = {
    file: path.join(dir, "state.json"), now: () => now,
    console: {warn() {}, error() {}}, setInterval() {return {};}, clearInterval() {},
    async getCalendar() {return {events: [JSON.parse(JSON.stringify(event))], retrievedAt: new Date(now).toISOString()};},
    async getOperational(e) {
      operationalCalls++;
      return getOperationalStatus(e, {apiKey: "fixture", cache, now: () => now,
        async fetchImpl() {
          paidRequests++;
          if (outage) throw new Error("Fixture operational outage");
          return {ok: true, json: async () => ({flights: [record]})};
        }});
    },
    async getFlight() {
      telemetryCalls++;
      if (!tracking) return {snapshot: null, attempts: [{provider: "adsb.lol", outcome: "no-match"}]};
      return {attempts: [], snapshot: {provider: "adsb.lol", origin: "ORD", destination: "CLT",
        phase: tracking.phase, progressPercent: tracking.progress,
        retrievedAt: new Date(now).toISOString(), position: {
          ...tracking.position, recordedAt: new Date(now).toISOString()
        }}};
    }
  };
  let master = createMasterStateService(options);
  async function refresh(at) {now = Date.parse(at); await master.refreshCalendar(); await master.poll();}
  try {
    await master.start(); await master.poll();
    assert.equal(master.read().resolved.mode, "DELAYED");
    assert.equal(master.read().resolved.state.dailySchedule.entries[0].operationalStamp.detail, "15 MINUTES");
    await refresh("2026-09-20T09:53:00Z");
    assert.equal(paidRequests, 2, "Departure status continues refreshing before actual OUT");
    record = {...record, actual_out: "2026-09-20T10:15:00Z", status: "Taxiing"};
    await refresh("2026-09-20T10:16:00Z");
    assert.equal(master.read().resolved.state.flight.actualOut, record.actual_out);
    let atOut = paidRequests;
    await refresh("2026-09-20T10:22:00Z");
    assert.equal(paidRequests, atOut, "Actual OUT pauses paid operational requests during taxi");
    assert.equal(master.readCalendar().events[0].operational.actualOut, record.actual_out,
      "Calendar refresh preserves the operational evidence while requests are paused");
    if (!earlyArrival) {
      master.stop(); cache.clear(); master = createMasterStateService(options);
      now = Date.parse("2026-09-20T10:23:00Z");
      await master.start(); await master.poll();
      assert.equal(paidRequests, atOut + 1, "A cruise restart reacquires current airline status once");
      atOut = paidRequests;
      await refresh("2026-09-20T10:30:00Z");
      assert.equal(paidRequests, atOut, "The restart returns to paused polling after reacquiring OUT");
    }

    if (earlyArrival) {
      tracking = {phase: "EN_ROUTE", progress: 45,
        position: {latitude: 38.8, longitude: -83.8, altitudeFeet: 30000, groundSpeedKnots: 430}};
      now = Date.parse("2026-09-20T10:40:00Z"); await master.poll();
      assert.equal(master.read().resolved.mode, "EN_ROUTE", "ADS-B advances beyond the retained OUT record");
      const telemetryBefore = telemetryCalls;
      await refresh("2026-09-20T10:42:00Z"); await master.poll();
      assert.equal(paidRequests, atOut, "Cruise tracking does not cause paid status requests");
      assert(telemetryCalls > telemetryBefore, "Aircraft tracking continues while FlightAware is paused");
      assert(master.read().resolved.state.flight.actualTrack.length > 0);
      tracking = {phase: "APPROACH", progress: 99, position: {
        latitude: airport.latitude + .067, longitude: airport.longitude,
        altitudeFeet: airport.elevationFeet + 2000, altitudeTrend: "D",
        verticalSpeedFeetPerMinute: -600, groundSpeedKnots: 140}};
      now = Date.parse("2026-09-20T11:00:00Z"); await master.poll();
      assert.equal(master.read().resolved.mode, "LANDING");
      outage = true;
      await refresh("2026-09-20T11:01:00Z");
      assert.equal(paidRequests, atOut + 1, "Early approach resumes status checks before the ETA window");
      assert.equal(master.readCalendar().events[0].operational.actualOut, record.actual_out);
      assert.notEqual(master.read().resolved.mode, "ARRIVED", "A status-provider outage does not confirm gate arrival");
      outage = false;
    } else {
      await refresh("2026-09-20T11:19:00Z");
      assert.equal(paidRequests, atOut, "Missing telemetry does not prematurely resume cruise requests");
      await refresh("2026-09-20T11:20:00Z");
      assert.equal(paidRequests, atOut + 1, "The arrival time window resumes requests even without tracking");
    }

    tracking = null; // Destination coverage ends; airline ON/IN remains available.
    record = {...record, actual_off: "2026-09-20T10:25:00Z",
      actual_on: "2026-09-20T11:25:00Z", status: "Landed"};
    await refresh("2026-09-20T11:26:00Z");
    assert.equal(master.readCalendar().events[0].operational.actualOn, record.actual_on);
    record = {...record, actual_in: "2026-09-20T11:32:00Z", status: "Arrived"};
    await refresh("2026-09-20T11:33:00Z");
    assert.equal(master.read().resolved.mode, "ARRIVED");
    const atIn = operationalCalls;
    await refresh("2026-09-20T11:40:00Z");
    assert.equal(operationalCalls, atIn, "Actual IN stops routine operational polling for that leg");
    await refresh("2026-09-20T12:30:00Z");
    assert.equal(master.read().resolved.mode, "LAYOVER");

    // Restart reacquires once; it must retain gate-in and then stop again.
    master.stop(); cache.clear(); master = createMasterStateService(options);
    await master.start(); await master.poll();
    assert.equal(master.readCalendar().events[0].operational.actualIn, record.actual_in);
    const afterRestart = operationalCalls;
    await refresh("2026-09-20T12:32:00Z");
    assert.equal(operationalCalls, afterRestart);

    // Reusing a Calendar ID for a changed route must not reuse a stopped leg.
    event.destination = "CMH"; event.flightNumber = "4001"; event.liveLookupCandidates = ["AA4001"];
    event.times = {startUtc: "2026-09-20T13:00:00Z", endUtc: "2026-09-20T14:30:00Z"};
    record = {...record, fa_flight_id: "fa-next", destination: {code_iata: "CMH"},
      scheduled_out: event.times.startUtc, estimated_out: event.times.startUtc,
      scheduled_on: "2026-09-20T14:20:00Z", estimated_on: "2026-09-20T14:20:00Z",
      scheduled_in: event.times.endUtc, estimated_in: event.times.endUtc,
      actual_out: null, actual_off: null, actual_on: null, actual_in: null, status: "Scheduled"};
    await refresh("2026-09-20T12:35:00Z");
    assert.equal(operationalCalls, afterRestart + 1, "A reassigned Calendar event starts its own departure polling");
    assert.equal(master.readCalendar().events[0].operational.actualIn, null);

    record = {...record, actual_out: "2026-09-20T13:00:00Z", status: "Taxiing",
      estimated_on: "2026-09-20T13:20:00Z", estimated_in: "2026-09-20T13:30:00Z"};
    await refresh("2026-09-20T13:01:00Z");
    const shortFlightOut = paidRequests;
    await refresh("2026-09-20T13:07:00Z");
    assert.equal(paidRequests, shortFlightOut + 1, "Short sectors already near arrival keep their ON/IN checks after OUT");
  } finally {master.stop(); fs.rmSync(dir, {recursive: true, force: true});}
}

(async () => {
  await scenario(true);
  await scenario(false);
  console.log("Operational polling handoff tests passed: departure, ADS-B cruise, arrival, outages, restart and reassignment.");
})().catch(error => {console.error(error); process.exitCode = 1;});
