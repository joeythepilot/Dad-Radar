"use strict";

const assert = require("node:assert/strict");
const {
  createSequenceHistoryService,
  eventKey,
  isWorkFlight
} = require("./sequence-history-service");

let now = Date.parse("2026-09-13T12:00:00Z");
const storage = {};
const service = createSequenceHistoryService(storage, {now: () => now});

function event(id, origin, destination, role = "operating") {
  return {
    id,
    kind: "flight",
    travelRole: role,
    isDeadhead: role === "deadhead",
    isCommute: role === "commute",
    flightNumber: id,
    origin,
    destination,
    times: {
      startUtc: new Date(now - 3600000).toISOString(),
      endUtc: new Date(now + 3600000).toISOString()
    }
  };
}

function resolved(selectedEvent, track, mode = "EN_ROUTE") {
  return {
    event: selectedEvent,
    mode,
    state: {
      livePhase: mode,
      flight: {
        number: selectedEvent.flightNumber,
        origin: selectedEvent.origin,
        destination: selectedEvent.destination,
        actualTrack: track
      }
    }
  };
}

assert.equal(isWorkFlight(event("C", "AVL", "ORD", "commute")), false);

const first = event("101", "ORD", "BMI");
let summary = service.update(resolved(first, [
  {latitude: 41.97, longitude: -87.9, recordedAt: new Date(now).toISOString()},
  {latitude: 41.0, longitude: -88.6, recordedAt: new Date(now + 60000).toISOString()}
]));
assert.equal(summary.legCount, 1);
assert.equal(summary.currentEventKey, eventKey(first));
assert.ok(summary.totalDistanceNm > 50);

now += 2 * 3600000;
summary = service.update(resolved(first, [
  {latitude: 40.48, longitude: -88.92, recordedAt: new Date(now).toISOString()}
], "ARRIVED"));
assert.equal(summary.completedLegCount, 1);

summary = service.update({event: {kind: "layover", airport: "BMI"}, mode: "LAYOVER", state: {}});
assert.equal(summary.currentEventKey, null);
assert.equal(summary.legCount, 1, "Layover preserves completed trip history.");

const deadhead = event("202", "BMI", "ORD", "deadhead");
now += 3 * 3600000;
summary = service.update(resolved(deadhead, [
  {latitude: 40.48, longitude: -88.92, recordedAt: new Date(now).toISOString()},
  {latitude: 41.97, longitude: -87.9, recordedAt: new Date(now + 60000).toISOString()}
]));
assert.equal(summary.legCount, 2);
assert.equal(summary.legs[1].isDeadhead, true);
assert.equal(summary.currentEventKey, eventKey(deadhead));

const commute = event("303", "AVL", "ORD", "commute");
summary = service.update(resolved(commute, [
  {latitude: 35.4, longitude: -82.5},
  {latitude: 41.9, longitude: -87.9}
]));
assert.equal(summary.legCount, 2, "Personal commute must be excluded.");
assert.equal(summary.currentEventKey, null);

const cancelled = {...event("404", "ORD", "TVC"), status: "cancelled"};
summary = service.update(resolved(cancelled, [
  {latitude: 41.9, longitude: -87.9},
  {latitude: 44.7, longitude: -85.6}
]));
assert.equal(summary.legCount, 2, "Cancelled plans must not become flown history.");

const reassigned = {...deadhead, origin: "ORD", destination: "MSN"};
summary = service.update(resolved(reassigned, [
  {latitude: 41.97, longitude: -87.9},
  {latitude: 43.14, longitude: -89.34}
]));
assert.equal(summary.legCount, 3);

now += 49 * 3600000;
summary = service.read();
assert.equal(summary.legCount, 0, "Sequence expires after 48 hours without work-flight activity.");

// A tracked leg must not remain incomplete forever just because the display
// missed the brief ARRIVED/LANDED phase before moving on.
let missedArrivalNow = Date.parse("2026-09-13T22:30:00Z");
const missedArrivalService = createSequenceHistoryService({}, {now: () => missedArrivalNow});
const missedArrivalLeg = {
  id: "missed-arrival-1",
  kind: "flight",
  travelRole: "operating",
  isCommute: false,
  isDeadhead: false,
  flightNumber: "4334",
  origin: "ORD",
  destination: "BMI",
  times: {
    startUtc: "2026-09-13T22:00:00Z",
    endUtc: "2026-09-13T23:00:00Z"
  }
};
let missedArrivalSummary = missedArrivalService.update(resolved(missedArrivalLeg, [
  {latitude: 41.97, longitude: -87.9, recordedAt: "2026-09-13T22:30:00Z"},
  {latitude: 41.0, longitude: -88.6, recordedAt: "2026-09-13T22:45:00Z"}
], "EN_ROUTE"));
assert.equal(missedArrivalSummary.completedLegCount, 0);

missedArrivalNow = Date.parse("2026-09-14T01:30:00Z");
missedArrivalSummary = missedArrivalService.backfill([missedArrivalLeg]);
assert.equal(missedArrivalSummary.legCount, 1, "Past reconciliation must not duplicate an already tracked leg.");
assert.equal(missedArrivalSummary.completedLegCount, 1, "A past tracked leg is complete even if ARRIVED was missed.");
assert.equal(missedArrivalSummary.estimatedLegCount, 0, "Reconciliation preserves real tracked mileage.");
assert.equal(missedArrivalSummary.legs[0].track.length, 2, "Reconciliation preserves the recorded track.");

// A newly installed tracker can recover a just-completed trip from calendar history.
const recoveryNow = Date.parse("2026-09-14T01:30:00Z");
const recovered = createSequenceHistoryService({}, {now: () => recoveryNow});
const recentLeg = {
  id: "recent-1",
  kind: "flight",
  travelRole: "operating",
  isCommute: false,
  isDeadhead: false,
  flightNumber: "4334",
  origin: "BMI",
  destination: "ORD",
  times: {
    startUtc: "2026-09-13T22:00:00Z",
    endUtc: "2026-09-13T23:00:00Z"
  }
};
const recentDeadhead = {
  ...recentLeg,
  id: "recent-2",
  travelRole: "deadhead",
  isDeadhead: true,
  flightNumber: "999",
  origin: "ORD",
  destination: "BMI",
  times: {
    startUtc: "2026-09-13T19:00:00Z",
    endUtc: "2026-09-13T20:00:00Z"
  }
};
const recentCommute = {
  ...recentLeg,
  id: "recent-3",
  travelRole: "commute",
  isCommute: true,
  origin: "AVL",
  destination: "ORD"
};
const recoveredSummary = recovered.backfill([recentDeadhead, recentCommute, recentLeg]);
assert.equal(recoveredSummary.legCount, 2, "Recovery includes operating/deadhead legs but excludes commute.");
assert.equal(recoveredSummary.completedLegCount, 2);
assert.equal(recoveredSummary.estimatedLegCount, 2);
assert.ok(recoveredSummary.totalDistanceNm > 150, "Recovered trip uses great-circle mileage.");
assert.ok(recoveredSummary.legs.every(leg => leg.estimated));

console.log("Sequence history service tests passed.");
