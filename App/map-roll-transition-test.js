"use strict";

const assert = require("assert");
const roll = require("./map-roll-transition");

assert.strictEqual(roll.DURATION_MS, 2800, "map roll should take a deliberate few seconds");
assert(Array.isArray(roll.PROFILE), "map roll should expose its motion profile");
assert.deepStrictEqual(roll.PROFILE[0], [0, 0], "roll should begin registered");
assert.deepStrictEqual(roll.PROFILE[roll.PROFILE.length - 1], [100, 100], "roll should finish registered");

for (let i = 1; i < roll.PROFILE.length; i += 1) {
  assert(roll.PROFILE[i][0] > roll.PROFILE[i - 1][0], "profile time must always advance");
}

const distances = roll.PROFILE.slice(1).map((point, index) => point[1] - roll.PROFILE[index][1]);
assert(Math.max(...distances) > Math.min(...distances) * 2, "transport must not move at a constant rate");
assert(roll.PROFILE.some(point => point[1] > 100), "transport should overshoot before final registration");

console.log("map-roll-transition-test: ok");
