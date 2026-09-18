"use strict";

const assert = require("node:assert/strict");
const {buildDailySchedule, resolveScheduleState} = require("./operational-schedule-state");

const PLANNED_START = "2026-08-04T13:00:00.000Z";
const PLANNED_END = "2026-08-04T15:00:00.000Z";
const NOW = "2026-08-04T14:00:00.000Z";

function operational(overrides = {}) {
  return {
    provider: "flightaware",
    faFlightId: "fa-4140",
    ident: "AA4140",
    retrievedAt: "2026-08-04T13:59:00.000Z",
    scheduledOut: PLANNED_START,
    estimatedOut: PLANNED_START,
    actualOut: null,
    scheduledOff: "2026-08-04T13:15:00.000Z",
    estimatedOff: "2026-08-04T13:15:00.000Z",
    actualOff: null,
    scheduledOn: "2026-08-04T14:45:00.000Z",
    estimatedOn: "2026-08-04T14:45:00.000Z",
    actualOn: null,
    scheduledIn: PLANNED_END,
    estimatedIn: PLANNED_END,
    actualIn: null,
    cancelled: false,
    diverted: false,
    status: "Scheduled",
    departureDelayMinutes: 0,
    arrivalDelayMinutes: 0,
    ...overrides
  };
}

function flight(op, overrides = {}) {
  return {
    id: "flight-event",
    kind: "flight",
    isCommute: false,
    isDeadhead: false,
    status: "confirmed",
    flightNumber: "4140",
    carrierCode: "AA",
    origin: "ORD",
    destination: "AVP",
    liveLookupCandidates: ["AA4140", "ENY4140"],
    operational: op,
    times: {
      source: "description-wall-times",
      startUtc: PLANNED_START,
      endUtc: PLANNED_END,
      endEastern: "2026-08-04T11:00:00.000-04:00"
    },
    ...overrides
  };
}

function schedule(event) {
  return {calendarId: "pilot", retrievedAt: NOW, events: [event]};
}

function resolve(op, options = {}, overrides = {}) {
  const event = flight(op, overrides);
  return {
    event,
    resolved: resolveScheduleState(schedule(event), {now: NOW, ...options})
  };
}

{
  const op = operational({
    estimatedOut: "2026-08-04T14:15:00.000Z",
    estimatedOff: "2026-08-04T14:30:00.000Z",
    estimatedOn: "2026-08-04T15:45:00.000Z",
    estimatedIn: "2026-08-04T16:00:00.000Z",
    status: "Delayed",
    departureDelayMinutes: 75,
    arrivalDelayMinutes: 60
  });
  const {event, resolved} = resolve(op);
  assert.equal(resolved.mode, "DELAYED");
  assert.equal(resolved.state.flight.departureDelayMinutes, 75,
    "Provider-derived delay replaces wall-clock delay arithmetic.");
  assert.equal(resolved.state.flight.eta, "12:00 PM",
    "ETA uses FlightAware estimated IN rather than planned Calendar arrival.");
  assert.equal(resolved.state.flight.timingSource, "flightaware");
  assert.equal(resolved.state.flight.operational.faFlightId, "fa-4140");
  assert.equal(resolved.event.times.startUtc, PLANNED_START,
    "Operational timing must not mutate planned event identity/times.");
  const daily = buildDailySchedule(schedule(event), resolved, {
    now: NOW,
    displayTimeZone: "America/New_York",
    displayTimeZoneLabel: "EASTERN TIME"
  });
  assert.equal(daily.entries[0].time, "10:15 AM",
    "Today's Duty shows the current estimated OUT time.");
  assert.deepEqual(daily.entries[0].operationalStamp, {
    kind: "delay",
    label: "DELAYED",
    detail: "75 MINUTES"
  }, "A projected FlightAware departure delay becomes a child-friendly red dispatch stamp on the affected duty row.");
  assert.equal(daily.context,
    "DADDY'S FLIGHT TO WILKES-BARRE/SCRANTON, PENNSYLVANIA IS 75 MIN LATE");
}

{
  const {resolved} = resolve(operational({
    status: "Scheduled",
    departureDelayMinutes: 0
  }));
  assert.equal(resolved.mode, "BOARDING",
    "A matched provider that reports no delay must not be replaced by a fake wall-clock delay.");
  assert.equal(resolved.state.flight.departureDelayMinutes, 0);
}

{
  const {resolved} = resolve(operational({
    estimatedOut: null,
    status: "Delayed",
    departureDelayMinutes: null
  }));
  assert.equal(resolved.mode, "DELAYED");
  assert.equal(resolved.state.flight.departureDelayMinutes, null,
    "A provider delay without a usable estimate is reported without inventing minutes.");
}

{
  const {resolved} = resolve(operational({
    actualOut: "2026-08-04T13:55:00.000Z",
    status: "Taxiing"
  }));
  assert.equal(resolved.mode, "TAXI_OUT");
}

{
  const {resolved} = resolve(operational({
    actualOut: "2026-08-04T13:40:00.000Z",
    actualOff: "2026-08-04T13:52:00.000Z",
    status: "En Route"
  }));
  assert.equal(resolved.mode, "EN_ROUTE");
}

{
  const {resolved} = resolve(operational({
    actualOut: "2026-08-04T12:50:00.000Z",
    actualOff: "2026-08-04T13:00:00.000Z",
    actualOn: "2026-08-04T13:55:00.000Z",
    status: "Landed"
  }));
  assert.equal(resolved.mode, "TAXI_IN");
}

{
  const actualIn = "2026-08-04T13:58:00.000Z";
  const {resolved} = resolve(operational({
    actualOut: "2026-08-04T12:50:00.000Z",
    actualOff: "2026-08-04T13:00:00.000Z",
    actualOn: "2026-08-04T13:50:00.000Z",
    actualIn,
    status: "Arrived"
  }));
  assert.equal(resolved.mode, "ARRIVED");
  assert.equal(resolved.state.flight.progress, 100);
  assert.equal(resolved.state.flight.eta, "9:58 AM",
    "Actual IN replaces estimated/planned arrival in the ETA display.");
}

{
  const {resolved} = resolve(operational({cancelled: true, status: "Cancelled"}));
  assert.equal(resolved.mode, "CANCELLED");
  assert.equal(resolved.state.status, "CANCELLED");
}

{
  const {resolved} = resolve(operational({diverted: true, status: "Diverted"}));
  assert.equal(resolved.mode, "DIVERTED");
}

{
  const delayedPastPlan = flight(operational({
    actualOut: "2026-08-04T13:30:00.000Z",
    actualOff: "2026-08-04T13:42:00.000Z",
    estimatedIn: "2026-08-04T16:30:00.000Z",
    status: "En Route"
  }));
  const result = resolveScheduleState(schedule(delayedPastPlan), {
    now: "2026-08-04T15:30:00.000Z"
  });
  assert.equal(result.event.id, delayedPastPlan.id,
    "Operational arrival estimate keeps a delayed active leg selected past its original Calendar end.");
  assert.equal(result.mode, "EN_ROUTE");
}

{
  const commute = flight(operational({
    ident: "AA3963",
    actualOut: "2026-08-04T13:20:00.000Z",
    actualOff: "2026-08-04T13:35:00.000Z",
    status: "En Route"
  }), {
    id: "commute-3963",
    isCommute: true,
    flightNumber: "3963",
    origin: "AVL",
    destination: "ORD",
    liveLookupCandidates: ["AA3963"]
  });
  const result = resolveScheduleState(schedule(commute), {
    now: NOW,
    homeAirport: "AVL",
    baseAirport: "ORD"
  });
  assert.equal(result.mode, "COMMUTING_TO_BASE",
    "FlightAware airborne timing must not erase the family-facing commute identity.");
}

console.log("Operational schedule-state tests passed.");
