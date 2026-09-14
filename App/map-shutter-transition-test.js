"use strict";

const assert = require("node:assert/strict");
const {
  surfaceActive,
  surfaceIntent
} = require("./map-shutter-transition");

const now = Date.parse("2026-09-13T20:00:00Z");
const ground = {
  flight: {
    surfacePosition: {
      onGround: true,
      latitude: 41.97,
      longitude: -87.90,
      source: "adsb_lol",
      recordedAt: new Date(now - 30000).toISOString()
    }
  }
};

assert.equal(surfaceIntent(ground, now), true);
assert.equal(surfaceIntent({
  flight: {
    surfacePosition: {
      ...ground.flight.surfacePosition,
      onGround: false
    }
  }
}, now), false);
assert.equal(surfaceIntent({
  flight: {
    surfacePosition: {
      ...ground.flight.surfacePosition,
      source: "mlat"
    }
  }
}, now), false);
assert.equal(surfaceIntent({
  flight: {
    surfacePosition: {
      ...ground.flight.surfacePosition,
      recordedAt: new Date(now - 6 * 60 * 1000).toISOString()
    }
  }
}, now), false);

assert.equal(surfaceActive({
  querySelector: () => ({hidden: false, style: {}})
}), true);
assert.equal(surfaceActive({
  querySelector: () => ({hidden: true, style: {}})
}), false);
assert.equal(surfaceActive({
  querySelector: () => ({hidden: false, style: {visibility: "hidden"}})
}), false);
assert.equal(surfaceActive({querySelector: () => null}), false);

console.log("Map shutter transition tests passed.");
