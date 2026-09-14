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
    link.href = "/UI/map-shutter-transition.css?v=1";
    link.dataset.dadRadarMapShutter = "true";
    root.document.head.appendChild(link);
  }

  const overlay = root.document.createElement("div");
  overlay.className = "map-shutter-transition";
  overlay.setAttribute("aria-hidden", "true");

  const upper = root.document.createElement("div");
  upper.className = "map-shutter-leaf map-shutter-upper";
  const lower = root.document.createElement("div");
  lower.className = "map-shutter-leaf map-shutter-lower";
  overlay.append(upper, lower);
  shell.appendChild(overlay);

  let lastIntent = null;
  let lastActual = api.surfaceActive(shell);
  let transitionTimer = null;
  let revealToken = 0;

  function coverInstantly() {
    revealToken += 1;
    overlay.classList.add("no-motion", "is-closed");
  }

  function reveal() {
    const token = ++revealToken;
    root.requestAnimationFrame(() => {
      if (token !== revealToken) return;
      root.requestAnimationFrame(() => {
        if (token !== revealToken) return;
        overlay.classList.remove("no-motion");
        overlay.classList.remove("is-closed");
      });
    });
  }

  function pulse() {
    coverInstantly();
    if (transitionTimer) root.clearTimeout(transitionTimer);
    transitionTimer = root.setTimeout(() => {
      transitionTimer = null;
      reveal();
    }, 85);
  }

  root.addEventListener("dad-radar:visual-state-change", event => {
    const intent = api.surfaceIntent(event.detail?.state, Date.now());
    if (lastIntent !== null && intent !== lastIntent) coverInstantly();
    lastIntent = intent;
    root.setTimeout(() => {
      const actual = api.surfaceActive(shell);
      if (actual !== lastActual) {
        lastActual = actual;
        pulse();
      } else if (overlay.classList.contains("is-closed")) {
        reveal();
      }
    }, 0);
  }, true);

  if (typeof root.MutationObserver === "function") {
    const observer = new root.MutationObserver(() => {
      const actual = api.surfaceActive(shell);
      if (actual === lastActual) return;
      lastActual = actual;
      pulse();
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
