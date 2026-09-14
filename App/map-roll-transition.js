(function installMapRollTransition(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root?.document) return;

  const shell = root.document.getElementById("route-map-shell");
  if (!shell) return;
  shell.style.setProperty("--map-roll-duration", `${api.DURATION_MS}ms`);

  const audioController = root.dadRadarMapRollAudio?.createController?.({volume: 0.72}) ?? null;

  root.addEventListener("pointerdown", () => {
    void audioController?.unlock?.();
  }, {once: true});

  if (!root.document.querySelector("link[data-dad-radar-map-roll]")) {
    const link = root.document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/UI/map-roll-transition.css?v=2";
    link.dataset.dadRadarMapRoll = "true";
    root.document.head.appendChild(link);
  }

  ["top", "bottom"].forEach(edge => {
    if (shell.querySelector(`.map-roll-edge-shadow.is-${edge}`)) return;
    const shadow = root.document.createElement("div");
    shadow.className = `map-roll-edge-shadow is-${edge}`;
    shadow.setAttribute("aria-hidden", "true");
    shell.appendChild(shadow);
  });

  if (!shell.querySelector(".map-roll-splice")) {
    const splice = root.document.createElement("div");
    splice.className = "map-roll-splice";
    splice.setAttribute("aria-hidden", "true");
    shell.appendChild(splice);
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

  function startMotorSound() {
    void audioController?.play?.();
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

    void shell.offsetHeight;
    startMotorSound();
    shell.classList.add(targetSurface ? "map-roll-to-surface" : "map-roll-to-regional");

    if (finishTimer) root.clearTimeout(finishTimer);
    finishTimer = root.setTimeout(() => finish(targetSurface), api.DURATION_MS + 120);
  }

  function attachSurfaceLayer(layer) {
    if (!layer || layer === surfaceLayer) return;
    if (surfaceObserver) surfaceObserver.disconnect();
    surfaceLayer = layer;
    const requestedSurface = !layer.hidden;

    currentSurface = false;
    shell.classList.remove("is-surface-registered");

    surfaceObserver = new root.MutationObserver(() => {
      if (suppressMutation) return;
      const nextSurface = !surfaceLayer.hidden;
      if (nextSurface === currentSurface && !moving) return;
      transitionTo(nextSurface);
    });
    surfaceObserver.observe(surfaceLayer, {attributes: true, attributeFilter: ["hidden"]});

    if (requestedSurface) root.setTimeout(() => transitionTo(true), 0);
    else setHidden(surfaceLayer, true);
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

  root.addEventListener("dad-radar:visual-state-change", event => {
    const token = event.detail?.state?.diagnostics?.shutterTestToken ?? null;
    if (!token || token === lastTestToken) return;
    lastTestToken = token;
    if (surfaceLayer) {
      const returnTarget = currentSurface;
      transitionTo(!returnTarget);
      root.setTimeout(() => transitionTo(returnTarget), api.DURATION_MS + 650);
    } else {
      clearMotionClasses();
      startMotorSound();
      shell.classList.add("map-roll-demo-out");
      root.setTimeout(() => {
        shell.classList.remove("map-roll-demo-out");
        startMotorSound();
        shell.classList.add("map-roll-demo-in");
        root.setTimeout(clearMotionClasses, api.DURATION_MS + 120);
      }, api.DURATION_MS + 350);
    }
  }, true);
})(typeof window !== "undefined" ? window : globalThis, function createMapRollTransitionApi() {
  "use strict";

  // The approved V3 audio's first registration clack lands at ~2.64 s.
  // Complete travel just before it, leaving the second clack as the detent correction.
  const DURATION_MS = 2620;
  const PROFILE = Object.freeze([
    [0, 0], [7, 1.5], [16, 9], [31, 32], [39, 37],
    [56, 61], [73, 82], [88, 99], [93, 100.8], [97, 99.5], [100, 100]
  ]);

  return {DURATION_MS, PROFILE};
});
