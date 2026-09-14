"use strict";

const assert = require("node:assert/strict");
const {
  DESCENT_START_ALTITUDE,
  descentCamera,
  isDescent
} = require("./descent-camera");

assert.equal(DESCENT_START_ALTITUDE, 18000);
assert.equal(isDescent({altitude: 14500, previousAltitude: 14000, peakAltitude: 15000}), false,
  "Climb noise must not trigger arrival zoom.");
assert.equal(isDescent({altitude: 13800, previousAltitude: 14100, peakAltitude: 15000}), true,
  "A meaningful fall from the observed peak should establish descent.");
assert.equal(isDescent({altitude: 17000, previousAltitude: 17500, peakAltitude: 25000, phase: "APPROACH"}), true);

const baseCamera = {x: 300, y: 180, width: 400, height: 220};
const aircraft = {x: 720, y: 340};
const cruise = descentCamera({baseCamera, aircraft, altitude: 18500, peakAltitude: 33000, aspectRatio: 16 / 9});
assert.deepEqual(cruise, baseCamera, "Normal cruise above 18,000 feet keeps route framing.");

const descending = descentCamera({baseCamera, aircraft, altitude: 12000, peakAltitude: 33000, aspectRatio: 16 / 9});
assert.ok(descending.width < baseCamera.width, "Descent below 18,000 feet progressively tightens the camera.");
assert.ok(descending.x > baseCamera.x, "Descent framing moves toward the aircraft.");

const shortHop = descentCamera({baseCamera, aircraft, altitude: 8000, peakAltitude: 12500, aspectRatio: 16 / 9});
assert.ok(shortHop.width < baseCamera.width,
  "A short flight that never reaches 18,000 feet still tightens on descent from its own peak.");

const alreadyTight = {x: 500, y: 250, width: 40, height: 25};
const low = descentCamera({baseCamera: alreadyTight, aircraft, altitude: 1000, peakAltitude: 9000, aspectRatio: 16 / 9});
assert.ok(low.width <= alreadyTight.width,
  "Arrival zoom never widens a route that is already tighter than the surface target.");

console.log("Descent camera tests passed.");
