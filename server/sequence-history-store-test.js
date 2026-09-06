"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  clearState,
  getCurrentSequenceHistory,
  recordLiveSnapshot,
  registerWorkFlight
} = require("./sequence-history-store");

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
    carrierCode: isCommute
      ? "AA"
      : null,
    flightNumber: number,
    origin,
    destination,
    times: {
      startUtc: start,
      endUtc: end
    }
  };
}

const temporaryDirectory =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "dad-radar-sequence-"
    )
  );

const statePath = path.join(
  temporaryDirectory,
  "sequence-history.json"
);

const options = { statePath };

const first = flight({
  id: "leg-1",
  start: "2026-09-06T13:00:00Z",
  end: "2026-09-06T15:00:00Z",
  origin: "ORD",
  destination: "XNA",
  number: "4101"
});

const deadhead = flight({
  id: "leg-2",
  start: "2026-09-07T14:00:00Z",
  end: "2026-09-07T16:30:00Z",
  origin: "XNA",
  destination: "PHX",
  number: "1842",
  isDeadhead: true
});

const commute = flight({
  id: "commute",
  start: "2026-09-07T18:00:00Z",
  end: "2026-09-07T20:00:00Z",
  origin: "PHX",
  destination: "AVL",
  number: "930",
  isCommute: true
});

const nextSequence = flight({
  id: "leg-3",
  start: "2026-09-09T17:00:01Z",
  end: "2026-09-09T19:00:00Z",
  origin: "ORD",
  destination: "CMH",
  number: "4201"
});

let history = registerWorkFlight(
  first,
  {
    ...options,
    now: "2026-09-06T13:10:00Z"
  }
);

assert.equal(history.legs.length, 1);
assert.equal(history.totalDistanceNm, 0);

history = recordLiveSnapshot(
  first,
  {
    providerFlightId: "abc123",
    retrievedAt: "2026-09-06T14:00:00Z",
    position: {
      latitude: 41.9742,
      longitude: -87.9073,
      recordedAt: "2026-09-06T14:00:00Z"
    }
  },
  {
    ...options,
    now: "2026-09-06T14:00:00Z",
    seedAttempted: true,
    seedTrack: [
      {
        latitude: 41.9742,
        longitude: -87.9073,
        recordedAt: "2026-09-06T13:05:00Z"
      },
      {
        latitude: 39.8,
        longitude: -90.2,
        recordedAt: "2026-09-06T13:35:00Z"
      }
    ]
  }
);

assert.equal(
  history.legs[0].distanceSource,
  "observed"
);
assert.ok(
  history.legs[0].distanceNm > 0
);

history = registerWorkFlight(
  deadhead,
  {
    ...options,
    now: "2026-09-07T14:10:00Z"
  }
);

assert.equal(
  history.legs.length,
  2,
  "An assigned deadhead within 48 hours should remain in the active sequence."
);

const beforeCommute = history;

history = registerWorkFlight(
  commute,
  {
    ...options,
    now: "2026-09-07T18:10:00Z"
  }
);

assert.deepEqual(
  history,
  beforeCommute,
  "An ordinary personal commute must not change work-sequence history."
);

history = getCurrentSequenceHistory({
  ...options,
  now: "2026-09-09T16:31:01Z"
});

assert.equal(
  history,
  null,
  "The persisted sequence should clear after 48 hours with no work-flight activity."
);

history = registerWorkFlight(
  nextSequence,
  {
    ...options,
    now: "2026-09-09T17:05:00Z"
  }
);

assert.equal(history.legs.length, 1);
assert.equal(
  history.legs[0].eventId,
  "leg-3"
);

clearState(options);

const editedOriginal = flight({
  id: "editable",
  start: "2026-09-10T13:00:00Z",
  end: "2026-09-10T15:00:00Z",
  origin: "PHX",
  destination: "TUL",
  number: "4301"
});

const editedReplacement = {
  ...editedOriginal,
  destination: "CLT"
};

registerWorkFlight(
  editedOriginal,
  {
    ...options,
    now: "2026-09-10T12:40:00Z"
  }
);

history = registerWorkFlight(
  editedReplacement,
  {
    ...options,
    now: "2026-09-10T12:45:00Z"
  }
);

assert.equal(
  history.legs.length,
  1,
  "A reassigned Google event with no flown track should replace the stale planned leg."
);
assert.equal(
  history.legs[0].destination,
  "CLT"
);

clearState(options);
fs.rmSync(
  temporaryDirectory,
  { recursive: true, force: true }
);

console.log(
  "Sequence history store tests passed."
);