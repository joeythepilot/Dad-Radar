(function installMapShutterTransition(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root?.document) return;

  const shell = root.document.getElementById("route-map-shell");
  if (!shell) return;

  if (!root.document.querySelector("link[data-dad-radar-map-shutter]")) {
    const link = root.document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/UI/map-shutter-transition.css?v=2";
    link.dataset.dadRadarMapShutter = "true";
    root.document.head.appendChild(link);
  }

  const overlay = root.document.createElement("div");
  overlay.className = "map-shutter-transition";
  overlay.setAttribute("aria-hidden", "true");

  function makeFace(className) {
    const image = root.document.createElement("img");
    image.className = `map-shutter-face ${className}`;
    image.src = "/assets/ui/map-shutter-face-v2.jpg?v=2";
    image.alt = "";
    image.draggable = false;
    image.decoding = "async";
    return image;
  }

  overlay.append(
    makeFace("map-shutter-upper"),
    makeFace("map-shutter-lower")
  );
  shell.appendChild(overlay);

  let lastIntent = null;
  let lastActual = api.surfaceActive(shell);
  let lastTestToken = null;
  let transitionTimer = null;
  let motionTimer = null;
  let motionToken = 0;
  let lastPulseAt = -Infinity;

  const MOTION_MS = 520;
  const SETTLE_MS = 70;

  function clearTimers() {
    if (transitionTimer) root.clearTimeout(transitionTimer);
    if (motionTimer) root.clearTimeout(motionTimer);
    transitionTimer = null;
    motionTimer = null;
  }

  function openShutters() {
    const token = ++motionToken;
    if (motionTimer) root.clearTimeout(motionTimer);
    overlay.classList.remove("is-closing");
    overlay.classList.add("is-opening");
    // Force the closed transform to be committed before beginning the opening travel.
    overlay.getBoundingClientRect();
    overlay.classList.remove("is-closed");
    motionTimer = root.setTimeout(() => {
      if (token !== motionToken) return;
      overlay.classList.remove("is-opening");
      motionTimer = null;
    }, MOTION_MS + SETTLE_MS);
  }

  function closeThenOpen(holdMs = 120) {
    const token = ++motionToken;
    clearTimers();
    lastPulseAt = Date.now();
    overlay.classList.remove("is-opening");
    overlay.classList.add("is-closing");
    // Commit the open position, then animate the real shutter image slices to center.
    overlay.getBoundingClientRect();
    overlay.classList.add("is-closed");

    motionTimer = root.setTimeout(() => {
      if (token !== motionToken) return;
      overlay.classList.remove("is-closing");
      motionTimer = null;
      transitionTimer = root.setTimeout(() => {
        transitionTimer = null;
        if (token !== motionToken) return;
        openShutters();
      }, Math.max(0, holdMs));
    }, MOTION_MS + SETTLE_MS);
  }

  function operationalPulse(holdMs = 110) {
    if (Date.now() - lastPulseAt < MOTION_MS + 250) return;
    closeThenOpen(holdMs);
  }

  root.addEventListener("dad-radar:visual-state-change", event => {
    const state = event.detail?.state;
    const testToken = state?.diagnostics?.shutterTestToken ?? null;
    if (testToken && testToken !== lastTestToken) {
      lastTestToken = testToken;
      closeThenOpen(700);
      return;
    }

    const intent = api.surfaceIntent(state, Date.now());
    if (lastIntent !== null && intent !== lastIntent) operationalPulse(120);
    lastIntent = intent;

    root.setTimeout(() => {
      const actual = api.surfaceActive(shell);
      if (actual === lastActual) return;
      lastActual = actual;
      operationalPulse(90);
    }, 0);
  }, true);

  if (typeof root.MutationObserver === "function") {
    const observer = new root.MutationObserver(() => {
      const actual = api.surfaceActive(shell);
      if (actual === lastActual) return;
      lastActual = actual;
      operationalPulse(90);
    });
    observer.observe(shell, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "style"]
    });
  }
})(typeof window !== "undefined" ? window : globalThis, function createMapShutterTransitionApi() {
  "use strict";

  const HOLD_MS = 5 * 60 * 1000;

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function surfaceIntent(state, now = Date.now()) {
    const position = state?.flight?.surfacePosition;
    if (!position || position.onGround !== true ||
      !finite(position.latitude) || !finite(position.longitude) ||
      !/^(adsb_.+|ADSB)$/i.test(position.source || "")) return false;
    const recordedAt = Date.parse(position.recordedAt || "");
    const age = now - recordedAt;
    return Number.isFinite(age) && age >= -5000 && age <= HOLD_MS;
  }

  function surfaceActive(shell) {
    const layer = shell?.querySelector?.(".airport-surface-layer");
    if (!layer || layer.hidden) return false;
    if (layer.style?.display === "none" || layer.style?.visibility === "hidden") return false;
    return true;
  }

  return {surfaceActive, surfaceIntent};
});
