"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// One controller per home-server process. HTTP readers never run this controller
// or initiate a Calendar/provider lookup. Reuse the tested flight state machine.
function createMasterStateService(options) {
  const root = path.join(__dirname, "..");
  const file = options.file || path.join(root, "runtime", "master-state.json");
  const clock = options.now || Date.now;
  const timers = new Set();
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(file, "utf8")); } catch (_) { /* First start. */ }
  const storage = saved.storage && typeof saved.storage === "object" ? saved.storage : {};
  let envelope = {ok: false, resolved: null, calendarAt: null, liveAt: null,
    calendarOk: false, liveOk: true, publishedAt: null};
  let schedule = null;
  let started = false;
  let stopped = false;
  let calendarPending = null;
  let ready = null;
  let revision = 0;
  let flightRequest = null;
  let flightKey = null;
  let flightAt = -Infinity;

  function persist() {
    try {
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file + ".tmp", JSON.stringify({version: 1, storage}), {mode: 0o600});
      fs.renameSync(file + ".tmp", file);
    } catch (error) {
      options.report?.("master-storage-error", {message: error.message});
    }
  }
  function publish(resolved) {
    if (stopped) return;
    envelope = {...envelope, ok: true, resolved, revision: ++revision,
      publishedAt: new Date(clock()).toISOString()};
    persist();
  }
  const context = {
    console: options.console || console,
    dadRadarServerMode: true,
    Date: class extends Date {
      constructor(...args) {super(...(args.length ? args : [clock()]));}
      static now() {return clock();}
    },
    Intl, Promise,
    CustomEvent: class {constructor(type, init) {this.type = type; this.detail = init.detail;}},
    localStorage: {
      getItem: key => storage[key] ?? null,
      setItem: (key, value) => {storage[key] = String(value);},
      removeItem: key => {delete storage[key];}
    },
    setInterval(fn, delay) {
      const id = (options.setInterval || setInterval)(fn, delay);
      id?.unref?.(); timers.add(id); return id;
    },
    clearInterval(id) {(options.clearInterval || clearInterval)(id); timers.delete(id);},
    setDadRadarState() {},
    setDadRadarMode(mode) {publish({mode, state: {status: mode}});},
    dadRadarPublishResolved: publish,
    dispatchEvent(event) {
      if (stopped) return;
      const detail = event.detail;
      if (event.type === "dad-radar:calendar-sync") {
        envelope.calendarOk = detail.ok;
        if (detail.ok) envelope.calendarAt = detail.retrievedAt;
      }
      if (event.type === "dad-radar:live-flight-sync") {
        envelope.liveOk = detail.ok;
        if (detail.ok) envelope.liveAt = detail.retrievedAt;
      }
    },
    dadRadarCalendarApi: {getUpcomingEvents(args) {
      if (!calendarPending) calendarPending = Promise.resolve().then(() => options.getCalendar(args))
        .then(value => {schedule = value; return value;}).finally(() => {calendarPending = null;});
      return calendarPending;
    }},
    dadRadarLiveFlightApi: {async getFlightSnapshot(event, query) {
      const key = JSON.stringify([event.origin, event.destination, event.times?.startUtc ?? event.startUtc,
        event.liveLookupCandidates, query.surfaceOnly === true]);
      if (key !== flightKey || !flightRequest || clock() - flightAt >= 30000) {
        flightKey = key;
        flightAt = clock();
        flightRequest = Promise.resolve().then(() => options.getFlight({
        liveLookupCandidates: event.liveLookupCandidates || [], origin: event.origin,
        destination: event.destination, startUtc: event.times?.startUtc ?? event.startUtc,
        ...query
        }));
      }
      const result = await flightRequest;
      for (const attempt of result.attempts || []) options.report?.("provider-attempt", attempt);
      const unavailable = (result.attempts || []).some(attempt =>
        ["error", "cooldown"].includes(attempt.outcome) && attempt.provider !== "flightaware-route");
      if (!result.snapshot && unavailable) throw new Error("Tracking provider unavailable; arrival not inferred from an outage.");
      if (result.snapshot) return result.snapshot;
      return result.filedRoute ? {routeOnly: true, filedRoute: result.filedRoute,
        retrievedAt: new Date(clock()).toISOString()} : null;
    }}
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  for (const source of ["data/airport-catalog.js", "config/settings.js", "models/schedule-state.js",
    "models/live-flight-state.js", "services/live-refresh-schedule.js", "services/calendar-state-controller.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, source), "utf8"), context, {filename: source});
  }
  // Calendar edits are acquired automatically, even when every display is closed.
  vm.runInContext("dadRadarSettings.schedule.refreshIntervalMs = 60000;", context);

  return {
    start() {
      if (started) return ready;
      started = true;
      stopped = false;
      ready = context.startCalendarStateController();
      return ready;
    },
    stop() {stopped = true; context.stopCalendarStateController(); persist();},
    read() {return JSON.parse(JSON.stringify(envelope));},
    readCalendar() {return schedule ? JSON.parse(JSON.stringify(schedule)) : null;},
    // Explicit test/host controls, never exposed as a family HTTP mutation.
    refreshCalendar: () => context.refreshCalendarState(),
    poll: () => context.refreshLiveFlightState()
  };
}
module.exports = {createMasterStateService};
