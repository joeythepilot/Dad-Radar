const assert = require("node:assert/strict");
const {
  DEFAULT_SEQUENCE_GAP_MS,
  eventFingerprint,
  groupWorkFlights,
  isWorkFlight,
  resolveActiveSequence
} = require("./sequence-history");

function flight({
  id,
  start,
  end,
  origin,
  destination,
  number,
  isCommute = false,
  isDeadhead = false
}) {
  return {
    id,
    kind: "flight",
    isCommute,
    isDeadhead,
    travelRole:
      isDeadhead
        ? "deadhead"
        : isCommute
          ? "commute"
          : "operating",
    flightNumber: number,
    origin,
    destination,
    times: {
      startUtc: start,
      endUtc: end
    }
  };
}

const dayOneA = flight({
  id: "a",
  start: "2026-09-06T13:00:00Z",
  end: "2026-09-06T15:00:00Z",
  origin: "ORD",
  destination: "XNA",
  number: "4101"
});

const dayOneB = flight({
  id: "b",
  start: "2026-09-06T17:00:00Z",
  end: "2026-09-06T19:00:00Z",
  origin: "XNA",
  destination: "DFW",
  number: "4102"
});

const dayTwoDeadhead = flight({
  id: "c",
  start: "2026-09-07T14:00:00Z",
  end: "2026-09-07T16:30:00Z",
  origin: "DFW",
  destination: "PHX",
  number: "1842",
  isDeadhead: true
});

const personalCommute = flight({
  id: "commute",
  start: "2026-09-07T18:00:00Z",
  end: "2026-09-07T20:00:00Z",
  origin: "PHX",
  destination: "AVL",
  number: "930",
  isCommute: true
});

const nextSequence = flight({
  id: "d",
  start: "2026-09-09T17:00:01Z",
  end: "2026-09-09T19:00:00Z",
  origin: "ORD",
  destination: "CMH",
  number: "4201"
});

const schedule = {
  events: [
    dayOneA,
    dayOneB,
    dayTwoDeadhead,
    personalCommute,
    nextSequence
  ]
};

assert.equal(
  DEFAULT_SEQUENCE_GAP_MS,
  48 * 60 * 60 * 1000
);

assert.equal(isWorkFlight(dayOneA), true);
assert.equal(isWorkFlight(dayTwoDeadhead), true);
assert.equal(isWorkFlight(personalCommute), false);

const groups = groupWorkFlights(schedule);

assert.equal(groups.length, 2);
assert.deepEqual(
  groups[0].events.map((event) => event.id),
  ["a", "b", "c"],
  "Operating and deadhead legs within the 48-hour window should remain in one work sequence."
);
assert.deepEqual(
  groups[1].events.map((event) => event.id),
  ["d"],
  "A gap longer than 48 hours should begin a new sequence."
);

const duringLayover = resolveActiveSequence(
  schedule,
  null,
  { now: "2026-09-07T20:00:00Z" }
);

assert.deepEqual(
  duringLayover.events.map((event) => event.id),
  ["a", "b", "c"],
  "The completed sequence should remain active during the 48-hour hold."
);

const afterReset = resolveActiveSequence(
  schedule,
  null,
  { now: "2026-09-09T16:31:00Z" }
);

assert.equal(
  afterReset,
  null,
  "No work flight within 48 hours should clear the active sequence before the next flight becomes active."
);

const preflightReference = resolveActiveSequence(
  schedule,
  nextSequence,
  { now: "2026-09-09T16:40:00Z" }
);

assert.deepEqual(
  preflightReference.events.map((event) => event.id),
  ["d"],
  "A selected upcoming work flight should activate its new sequence during preflight."
);

const editedSameGoogleEvent = {
  ...dayOneA,
  destination: "CLT"
};

assert.notEqual(
  eventFingerprint(dayOneA),
  eventFingerprint(editedSameGoogleEvent),
  "Changing a route on the same Google event id must produce a new leg identity."
);

console.log("Sequence history tests passed.");