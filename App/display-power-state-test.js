"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const file = require("node:path").join(__dirname, "display-power-state.js");
const api = fs.existsSync(file) ? require(file) : {};
assert.equal(typeof api.createDisplayPowerController, "function", "Display power coordinator must exist");
function fixture(extra = {}) {
  let time = 0, serial = 0;
  const frames = new Map(), seen = [];
  const controller = api.createDisplayPowerController({
    now: () => time, requestFrame: fn => { frames.set(++serial, fn); return serial; },
    cancelFrame: id => frames.delete(id), render: s => seen.push(s), ...extra
  });
  return {controller, seen, frames, tick(ms) {
    time += ms;
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(fn => fn(time));
  }};
}
{
  const f = fixture();
  assert.equal(f.controller.getState(), "on");
  assert.equal(f.controller.getSnapshot().progress, 1);
  f.controller.setDisplayPower(false);
  assert.equal(f.controller.getState(), "stopping");
  f.tick(1200); assert.equal(f.controller.getSnapshot().progress, .5);
  f.tick(1200); assert.equal(f.controller.getState(), "off");
  f.controller.setDisplayPower(true); f.tick(5000);
  assert.equal(f.controller.getState(), "on");
  assert.equal(f.frames.size, 0);
}
{
  const f = fixture(); f.controller.setDisplayPower(false); f.tick(600);
  const before = f.controller.getSnapshot();
  const stale = [...f.frames.values()][0];
  f.controller.setDisplayPower(true);
  assert.equal(f.controller.getSnapshot().progress, before.progress, "Reversal must not jump");
  const generation = f.controller.getSnapshot().generation;
  f.controller.setDisplayPower(true);
  assert.equal(f.controller.getSnapshot().generation, generation, "Duplicate target is inert");
  stale(100000);
  assert.equal(f.controller.getState(), "starting", "Cancelled callback cannot win");
  f.tick(5000); assert.equal(f.controller.getState(), "on");
}
{
  const f = fixture({reducedMotion: () => true}); f.controller.setDisplayPower(false);
  f.tick(179); assert.equal(f.controller.getState(), "stopping");
  f.tick(1); assert.equal(f.controller.getState(), "off");
  f.controller.setDisplayPower(true); f.tick(180);
  assert.equal(f.controller.getState(), "on");
}
{
  const f = fixture(); f.controller.setDisplayPower(false); f.tick(60000);
  assert.equal(f.controller.getState(), "off", "A background-tab pause settles by elapsed time");
  f.controller.setDisplayPower(true); const stale = [...f.frames.values()][0];
  f.controller.destroy(); assert.equal(f.frames.size, 0);
  const before = f.controller.getSnapshot(); stale(); f.controller.setDisplayPower(false);
  assert.deepEqual(f.controller.getSnapshot(), before, "Destroyed coordinator is inert");
}
{
  let throws = false;
  const f = fixture({render() { if (throws) throw Error("Adapter failed"); }});
  throws = true; f.controller.setDisplayPower(false);
  assert.equal(f.controller.getState(), "on", "Visual failure must fail open");
  assert.equal(f.frames.size, 0);
  assert.equal(f.controller.getSnapshot().failed, true);
}
console.log("Display power coordinator: lifecycle, reversal, stale callbacks, reduced motion, destroy and recovery passed.");
{
assert.equal(typeof api.mechanicalVisible,"function","Mechanical power phase gating must exist");
assert.equal(api.mechanicalVisible({state:"on",progress:1},"flaps"),true);
assert.equal(api.mechanicalVisible({state:"off",progress:0},"clocks"),false);
assert.equal(api.mechanicalVisible({state:"starting",progress:.2},"flaps"),false);
assert.equal(api.mechanicalVisible({state:"starting",progress:.4},"flaps"),true);
assert.equal(api.mechanicalVisible({state:"starting",progress:.45},"weekly",0),true);
assert.equal(api.mechanicalVisible({state:"starting",progress:.45},"weekly",6),false);
}
