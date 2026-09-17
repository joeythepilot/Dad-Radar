"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {createMasterStateService} = require("./master-state-service");

async function run() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dad-master-op-"));
  let clock = Date.parse("2026-09-17T20:30:00Z");
  let operationalCalls = 0;
  let operationalFailure = false;
  let actualIn = null;
  const jobs = new Map();
  const plannedStart = "2026-09-17T22:27:00Z";
  const plannedEnd = "2026-09-18T01:01:00Z";
  const calendarEvent = {
    id: "work-3917",
    kind: "flight",
    status: "confirmed",
    carrierCode: "AA",
    flightNumber: "3917",
    origin: "ORD",
    destination: "CMH",
    liveLookupCandidates: ["AA3917", "ENY3917"],
    times: {startUtc: plannedStart, endUtc: plannedEnd, source: "calendar"}
  };

  const master = createMasterStateService({
    file: path.join(dir, "state.json"),
    now: () => clock,
    console: {warn() {}, error() {}},
    setInterval(fn, delay) { const key = {}; jobs.set(key, {fn, delay}); return key; },
    clearInterval(key) { jobs.delete(key); },
    async getCalendar() {
      return {
        events: [JSON.parse(JSON.stringify(calendarEvent))],
        retrievedAt: new Date(clock).toISOString()
      };
    },
    async getOperational(event) {
      operationalCalls++;
      if (operationalFailure) throw new Error("Fixture FlightAware outage");
      assert.equal(event.id, calendarEvent.id);
      return {
        provider: "flightaware",
        faFlightId: "fa-3917",
        ident: "AA3917",
        retrievedAt: new Date(clock).toISOString(),
        scheduledOut: plannedStart,
        estimatedOut: "2026-09-17T23:12:00Z",
        actualOut: null,
        scheduledOff: "2026-09-17T22:42:00Z",
        estimatedOff: "2026-09-17T23:27:00Z",
        actualOff: null,
        scheduledOn: "2026-09-18T00:48:00Z",
        estimatedOn: "2026-09-18T01:33:00Z",
        actualOn: actualIn ? "2026-09-18T01:02:00Z" : null,
        scheduledIn: plannedEnd,
        estimatedIn: "2026-09-18T01:46:00Z",
        actualIn,
        cancelled: false,
        diverted: false,
        status: actualIn ? "Arrived" : "Delayed",
        departureDelayMinutes: 45,
        arrivalDelayMinutes: actualIn ? 6 : 45
      };
    },
    async getFlight() {
      return {snapshot: null, attempts: [{provider: "adsb.lol", outcome: "no-match"}]};
    }
  });

  try {
    await master.start();
    const firstCalendar = master.readCalendar();
    assert.equal(operationalCalls, 1, "Master server enriches a near-term flight exactly once per Calendar refresh.");
    assert.equal(firstCalendar.events[0].times.startUtc, plannedStart,
      "Operational enrichment must not rewrite planned Calendar departure time.");
    assert.equal(firstCalendar.events[0].times.endUtc, plannedEnd,
      "Operational enrichment must not rewrite planned Calendar arrival time.");
    assert.equal(firstCalendar.events[0].operational.provider, "flightaware");
    assert.equal(firstCalendar.events[0].operational.estimatedOut, "2026-09-17T23:12:00Z");
    assert.equal(firstCalendar.events[0].confirmedArrivalAt, undefined);

    operationalFailure = true;
    clock += 60000;
    await master.refreshCalendar();
    const afterFailure = master.readCalendar();
    assert.equal(afterFailure.events[0].operational.faFlightId, "fa-3917",
      "A provider outage retains the last good operational enrichment.");
    assert.equal(afterFailure.events[0].times.startUtc, plannedStart);

    operationalFailure = false;
    actualIn = "2026-09-18T01:07:00Z";
    clock = Date.parse("2026-09-18T01:08:00Z");
    await master.refreshCalendar();
    const arrivedCalendar = master.readCalendar();
    assert.equal(arrivedCalendar.events[0].operational.actualIn, actualIn);
    assert.equal(arrivedCalendar.events[0].confirmedArrivalAt, actualIn,
      "FlightAware actual IN becomes an internal confirmed gate arrival.");
    assert.equal(arrivedCalendar.events[0].times.endUtc, plannedEnd,
      "Confirmed operational arrival remains separate from planned Calendar time.");
  } finally {
    master.stop();
    fs.rmSync(dir, {recursive: true, force: true});
  }

  console.log("Master operational enrichment tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
