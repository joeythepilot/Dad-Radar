(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.dadRadarDisplayPowerState = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TIMING = Object.freeze({startup: 5000, shutdown: 2400, reduced: 180});
  const REVEAL = Object.freeze({paper:.14,instruments:.22,clocks:.30,flaps:.34,weekly:.42,sequence:.42});
  function mechanicalVisible(snapshot,kind,index=0) {
    if(!snapshot || snapshot.failed || snapshot.state==="on")return true;
    if(snapshot.state==="off")return false;
    const threshold=snapshot.reducedMotion ? .5 : (REVEAL[kind]??.34)+(kind==="weekly"?index*.02:0);
    return snapshot.progress>=threshold;
  }
  function createDisplayPowerController(options) {
    const {now, requestFrame, cancelFrame, render} = options;
    let state = "on", targetOn = true, progress = 1, generation = 0;
    let frame = null, destroyed = false, failed = false;
    let from = 1, startedAt = now(), duration = TIMING.startup;
    const reduced = () => Boolean(options.reducedMotion?.());
    const getSnapshot = () => Object.freeze({state, targetOn, progress, generation, failed,
      reducedMotion: reduced(), elapsed: Math.max(0, now() - startedAt), duration});
    function cancel() {
      if (frame !== null) cancelFrame(frame);
      frame = null;
    }
    function paint() {
      try { render(getSnapshot()); return true; }
      catch (_) {
        cancel(); generation++; failed = true; state = "on"; targetOn = true; progress = 1;
        try { render(getSnapshot()); } catch (_) { /* DOM adapter also fails open. */ }
        return false;
      }
    }
    function advance(token) {
      if (destroyed || token !== generation) return;
      frame = null;
      const fraction = Math.min(1, Math.max(0, now() - startedAt) / duration);
      progress = from + ((targetOn ? 1 : 0) - from) * fraction;
      if (fraction === 1) state = targetOn ? "on" : "off";
      if (paint() && fraction < 1) frame = requestFrame(() => advance(token));
    }
    function setDisplayPower(on) {
      if (destroyed || Boolean(on) === targetOn) return;
      cancel(); generation++; failed = false;
      from = progress; targetOn = Boolean(on); state = targetOn ? "starting" : "stopping";
      startedAt = now(); duration = reduced() ? TIMING.reduced : targetOn ? TIMING.startup : TIMING.shutdown;
      const token = generation;
      if (paint()) frame = requestFrame(() => advance(token));
    }
    paint();
    return Object.freeze({setDisplayPower, getState: () => state, getSnapshot,
      destroy() { destroyed = true; generation++; cancel(); }});
  }
  return {createDisplayPowerController, TIMING, REVEAL, mechanicalVisible};
});
