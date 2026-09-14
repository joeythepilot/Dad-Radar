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

assert.equal(
  isWorkFlight(event("C", "AVL", "ORD", "commute")),
  false
);

const first = event("101", "ORD", "BMI");
let summary = service.update(resolved(first, [
  {
    latitude: 41.97,
    longitude: -87.9,
    recordedAt: new Date(now).toISOString()
  },
  {
    latitude: 41.0,
    longitude: -88.6,
    recordedAt: new Date(now + 60000).toISOString()
  }
]));
assert.equal(summary.legCount, 1);
assert.equal(summary.currentEventKey, eventKey(first));
assert.ok(summary.totalDistanceNm > 50);

now += 2 * 3600000;
summary = service.update(resolved(first, [
  {
    latitude: 40.48,
    longitude: -88.92,
    recordedAt: new Date(now).toISOString()
  }
], "ARRIVED"));
assert.equal(summary.completedLegCount, 1);

summary = service.update({
  event: {kind: "layover", airport: "BMI"},
  mode: "LAYOVER",
  state: {}
});
assert.equal(summary.currentEventKey, null);
assert.equal(summary.legCount, 1, "Layover preserves completed trip history.");

const deadhead = event("202", "BMI", "ORD", "deadhead");
now += 3 * 3600000;
summary = service.update(resolved(deadhead, [
  {
    latitude: 40.48,
    longitude: -88.92,
    recordedAt: new Date(now).toISOString()
  },
  {
    latitude: 41.97,
    longitude: -87.9,
    recordedAt: new Date(now + 60000).toISOString()
  }
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

const reassigned = {
  ...deadhead,
  origin: "ORD",
  destination: "MSN"
};
summary = service.update(resolved(reassigned, [
  {latitude: 41.97, longitude: -87.9},
  {latitude: 43.14, longitude: -89.34}
]));
assert.equal(summary.legCount, 3);

now += 49 * 3600000;
summary = service.read();
assert.equal(
  summary.legCount,
  0,
  "Sequence expires after 48 hours without work-flight activity."
);

console.log("Sequence history service tests passed.");
