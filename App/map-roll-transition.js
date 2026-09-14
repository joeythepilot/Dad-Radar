(function installMapRollTransition(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root?.document) return;

  const shell = root.document.getElementById("route-map-shell");
  if (!shell) return;

  if (!root.document.querySelector("link[data-dad-radar-map-roll]")) {
    const link = root.document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/UI/map-roll-transition.css?v=1";
    link.dataset.dadRadarMapRoll = "true";
    root.document.head.appendChild(link);
  }

  let surfaceLayer = null;
  let surfaceObserver = null;
  let moving = false;
  let currentSurface = false;
  let queuedTarget = null;
  let suppressMutation = false;
  let finishTimer = null;
  let lastTestToken = null;

  function setHidden(element, hidden) {
    if (!element) return;
    suppressMutation = true;
    element.hidden = hidden;
    root.queueMicrotask
      ? root.queueMicrotask(() => { suppressMutation = false; })
      : root.setTimeout(() => { suppressMutation = false; }, 0);
  }

  function clearMotionClasses() {
    shell.classList.remove("map-roll-to-surface", "map-roll-to-regional", "map-roll-demo-out", "map-roll-demo-in");
  }

  function finish(targetSurface) {
    clearMotionClasses();
    shell.classList.toggle("is-surface-registered", targetSurface);
    if (surfaceLayer) setHidden(surfaceLayer, !targetSurface);
    currentSurface = targetSurface;
    moving = false;
    finishTimer = null;

    if (queuedTarget !== null && queuedTarget !== currentSurface) {
      const next = queuedTarget;
      queuedTarget = null;
      root.setTimeout(() => transitionTo(next), 40);
    } else {
      queuedTarget = null;
    }
  }

  function transitionTo(targetSurface) {
    if (!surfaceLayer) return;
    if (moving) {
      queuedTarget = targetSurface;
      return;
    }
    if (targetSurface === currentSurface) {
      setHidden(surfaceLayer, !targetSurface);
      shell.classList.toggle("is-surface-registered", targetSurface);
      return;
    }

    moving = true;
    clearMotionClasses();
    setHidden(surfaceLayer, false);
    shell.classList.remove("is-surface-registered");

    // Force layout so the first keyframe is registered before motion begins.
    void shell.offsetHeight;
    shell.classList.add(targetSurface ? "map-roll-to-surface" : "map-roll-to-regional");

    if (finishTimer) root.clearTimeout(finishTimer);
    finishTimer = root.setTimeout(() => finish(targetSurface), api.DURATION_MS + 120);
  }

  function attachSurfaceLayer(layer) {
    if (!layer || layer === surfaceLayer) return;
    if (surfaceObserver) surfaceObserver.disconnect();
    surfaceLayer = layer;
    currentSurface = !layer.hidden;
    shell.classList.toggle("is-surface-registered", currentSurface);

    surfaceObserver = new root.MutationObserver(() => {
      if (suppressMutation) return;
      const requestedSurface = !surfaceLayer.hidden;
      if (requestedSurface === currentSurface && !moving) return;
      transitionTo(requestedSurface);
    });
    surfaceObserver.observe(surfaceLayer, {attributes: true, attributeFilter: ["hidden"]});
  }

  function discoverSurfaceLayer() {
    const layer = shell.querySelector(".airport-surface-layer");
    if (layer) attachSurfaceLayer(layer);
  }

  discoverSurfaceLayer();

  if (typeof root.MutationObserver === "function") {
    const shellObserver = new root.MutationObserver(discoverSurfaceLayer);
    shellObserver.observe(shell, {childList: true, subtree: true});
  }

  // Keep the existing diagnostic command useful while the old name is retired.
  root.addEventListener("dad-radar:visual-state-change", event => {
    const token = event.detail?.state?.diagnostics?.shutterTestToken ?? null;
    if (!token || token === lastTestToken) return;
    lastTestToken = token;
    if (surfaceLayer) {
      transitionTo(!currentSurface);
      root.setTimeout(() => transitionTo(currentSurface), api.DURATION_MS + 650);
    } else {
      clearMotionClasses();
      shell.classList.add("map-roll-demo-out");
      root.setTimeout(() => {
        shell.classList.remove("map-roll-demo-out");
        shell.classList.add("map-roll-demo-in");
        root.setTimeout(clearMotionClasses, api.DURATION_MS + 120);
      }, api.DURATION_MS + 350);
    }
  }, true);
})(typeof window !== "undefined" ? window : globalThis, function createMapRollTransitionApi() {
  "use strict";

  const DURATION_MS = 2800;
  const PROFILE = Object.freeze([
    [0, 0], [7, 1.5], [16, 9], [31, 32], [39, 37],
    [56, 61], [73, 82], [88, 99], [93, 100.8], [97, 99.5], [100, 100]
  ]);

  return {DURATION_MS, PROFILE};
});
