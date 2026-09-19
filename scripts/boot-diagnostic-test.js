"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "App/boot-diagnostic.js"), "utf8");

function fixture() {
  const attributes = new Map(), listeners = {}, timers = new Map();
  const status = {textContent: "STARTING"}, dashboard = {hidden: true};
  const context = {
    document: {
      documentElement: {setAttribute: (key, value) => attributes.set(key, value)},
      querySelector: () => status,
      getElementById: () => dashboard
    },
    addEventListener: (name, handler) => {listeners[name] = handler;},
    setTimeout: (fn, delay) => {timers.set(1, {fn, delay}); return 1;},
    clearTimeout: id => timers.delete(id)
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return {context, attributes, listeners, timers, status, dashboard};
}

const boot = fixture();
assert.equal(boot.attributes.size, 0, "Startup reporting must not choose or mutate the display layout.");
boot.listeners.error({target: {tagName: "SCRIPT"}});
assert.match(boot.status.textContent, /STARTUP ERROR.*BROWSER BUNDLE DID NOT LOAD/);
assert.equal(boot.attributes.get("data-dad-radar-boot-error"), "true");

const ready = fixture();
ready.context.__dadRadarBoot.ready();
assert.equal(ready.timers.size, 0, "Successful startup cancels its timeout.");
ready.listeners.error({message: "later unrelated error"});
assert.equal(ready.status.textContent, "STARTING", "Completed startup must not be replaced by later errors.");

const stalled = fixture();
assert.equal(stalled.timers.get(1).delay, 12000);
stalled.timers.get(1).fn();
assert.match(stalled.status.textContent, /APPLICATION DID NOT START/);
const visible = fixture();
visible.dashboard.hidden = false;
visible.timers.get(1).fn();
assert.equal(visible.status.textContent, "STARTING");
const rejected = fixture();
rejected.listeners.unhandledrejection({reason: new Error("startup failed")});
assert.match(rejected.status.textContent, /STARTUP FAILED/);
console.log("Boot diagnostic tests passed: failure, readiness, timeout, rejection and layout independence.");
