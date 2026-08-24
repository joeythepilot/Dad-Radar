"use strict";

const assert = require("node:assert/strict");
const {
  intervalForState
} = require("./live-refresh-schedule");

const options = {
  activeIntervalMs: 30000,
  idleIntervalMs: 60000
};

for (const phase of [
  "TAXI_OUT",
  "EN_ROUTE",
  "APPROACH",
  "LANDING"
]) {
  assert.equal(
    intervalForState(
      { phase },
      null,
      options
    ),
    30000
  );
}

for (const phase of [
  "BOARDING",
  "DELAYED",
  "ARRIVED",
  ""
]) {
  assert.equal(
    intervalForState(
      { phase },
      null,
      options
    ),
    60000
  );
}

assert.equal(
  intervalForState(
    null,
    {
      state: {
        livePhase: "EN_ROUTE"
      }
    },
    options
  ),
  30000
);

console.log(
  "Adaptive live refresh schedule tests passed."
);
