const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  fieldsForState
} = require("./split-flap-state");

assert.deepEqual(
  fieldsForState({
    status: "EN ROUTE",
    flight: {
      number: "MQ 4140",
      origin: "ORD",
      destination: "AVL"
    }
  }),
  {
    flightNumber: "4140",
    origin: "ORD",
    destination: "AVL",
    status: "EN ROUTE"
  }
);

assert.equal(
  fieldsForState({
    status: "LANDING",
    flight: {
      number: "MQ 3704",
      origin: "ORD",
      destination: "AVL"
    }
  }).status,
  "LANDING ",
  "The landing phase should fit the eight-tile status field."
);

assert.deepEqual(
  fieldsForState({
    status: "HOME",
    locationAirport: "AVL",
    flight: null
  }),
  {
    flightNumber: "    ",
    origin: "   ",
    destination: "AVL",
    status: "HOME    "
  }
);

assert.deepEqual(
  fieldsForState({
    status: "LAYOVER",
    locationAirport: "ROC",
    flight: null
  }),
  {
    flightNumber: "    ",
    origin: "   ",
    destination: "ROC",
    status: "LAYOVER "
  }
);

assert.deepEqual(
  fieldsForState({
    status: "AT BASE",
    locationAirport: "ORD",
    flight: null
  }),
  {
    flightNumber: "    ",
    origin: "   ",
    destination: "ORD",
    status: "AT BASE "
  }
);

assert.deepEqual(
  fieldsForState({
    status: "LOCATION UNKNOWN",
    flight: null
  }),
  {
    flightNumber: "    ",
    origin: "   ",
    destination: "   ",
    status: "LOC UNKN"
  }
);

assert.deepEqual(
  fieldsForState({
    status: "NO TRACK",
    flight: null
  }),
  {
    flightNumber: "    ",
    origin: "   ",
    destination: "   ",
    status: "NO TRACK"
  }
);

assert.deepEqual(
  fieldsForState({
    status: "CAL AUTH",
    flight: null
  }),
  {
    flightNumber: "    ",
    origin: "   ",
    destination: "   ",
    status: "CAL AUTH"
  }
);

assert.deepEqual(
  fieldsForState({
    status: "OFFLINE",
    locationAirport: "BIL",
    flight: null
  }),
  {
    flightNumber: "    ",
    origin: "   ",
    destination: "BIL",
    status: "OFFLINE "
  }
);

const indexSource = fs.readFileSync(
  path.join(__dirname, "..", "index.html"),
  "utf8"
);

assert.doesNotMatch(
  indexSource,
  /flight-board-text|NO ACTIVE FLIGHT/,
  "The faceplate area must not contain a full-width text fallback."
);

console.log(
  "Split-flap state tests passed."
);
