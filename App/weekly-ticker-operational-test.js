"use strict";

const assert = require("node:assert/strict");
const ticker = require("./weekly-ticker");
const airportCatalog = require("../data/airport-catalog");

function flight(id, origin, destination, startUtc, endUtc, overrides = {}) {
  return {
    id,
    kind: "flight",
    status: "confirmed",
    origin,
    destination,
    times: {startUtc, endUtc},
    ...overrides
  };
}

function layover(id, airport, startUtc, endUtc) {
  return {id, kind: "layover", status: "confirmed", airport, times: {startUtc, endUtc}};
}

const plannedEnd = "2026-09-18T19:00:00Z";
const estimatedIn = "2026-09-18T20:22:00Z";
const schedule = {events: [
  flight("wed-out", "AVL", "ORD", "2026-09-16T13:00:00Z", "2026-09-16T15:00:00Z", {isCommute: true}),
  layover("wed-night", "ORD", "2026-09-16T15:00:00Z", "2026-09-17T12:00:00Z"),
  flight("thu-work", "ORD", "CMH", "2026-09-17T17:00:00Z", "2026-09-17T19:00:00Z"),
  layover("thu-night", "CMH", "2026-09-17T19:00:00Z", "2026-09-18T14:00:00Z"),
  flight("fri-ord", "CMH", "ORD", "2026-09-18T14:00:00Z", "2026-09-18T16:00:00Z"),
  flight("fri-home", "ORD", "AVL", "2026-09-18T17:00:00Z", plannedEnd, {
    isCommute: true,
    calendarPlan: {
      startUtc: "2026-09-18T17:00:00Z",
      endUtc: plannedEnd
    },
    operational: {
      provider: "flightaware",
      faFlightId: "fa-home",
      scheduledIn: plannedEnd,
      estimatedIn,
      actualIn: null
    }
  })
]};

const result = ticker.buildWeeklyTripTicker(schedule, {
  homeAirport: "AVL",
  timeZone: "America/New_York",
  airports: airportCatalog,
  now: "2026-09-17T16:00:00Z"
});

assert(
  result.items.includes("FRI - HOME 4:22 PM"),
  `Ticker return-home time must follow FlightAware estimated IN; got ${JSON.stringify(result.items)}`
);
assert(
  !result.items.includes("FRI - HOME 3:00 PM"),
  "Ticker must not keep showing the stale planned home-arrival time once operational ETA exists."
);
assert.equal(
  schedule.events.at(-1).times.endUtc,
  plannedEnd,
  "Ticker presentation must not mutate the planned Calendar end."
);

console.log("Weekly ticker operational return-home test passed.");
