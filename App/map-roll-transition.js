(function installMapRollTransition(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root?.document) return;
  const shell = root.document.getElementById("route-map-shell");
  if (!shell || shell.dadRadarMapRoll) return;
  const regional = shell.querySelector(".route-map-svg");
  if (!regional) return;

  if (!root.document.querySelector("link[data-dad-radar-map-roll]")) {
    const link = root.document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/UI/map-roll-transition.css?v=7";
    link.dataset.dadRadarMapRoll = "true";
    root.document.head.appendChild(link);
  }
  function element(name, parent) {
    const node = root.document.createElement("div");
    node.className = name;
    parent.appendChild(node);
    return node;
  }
  // One HTML transport gives both sheets exactly the same CSS-pixel travel.
  // SVG percentage transforms otherwise depend on viewBox/aspect-ratio geometry.
  const transport = element("map-roll-transport", shell);
  const regionalSheet = element("map-roll-regional-sheet", transport);
  const surfaceSheet = element("map-roll-surface-sheet", transport);
  regionalSheet.appendChild(regional);
  const splice = element("map-roll-splice", transport);
  splice.setAttribute("aria-hidden", "true");
  ["top", "bottom"].forEach(edge => {
    if (shell.querySelector(`.map-roll-edge-shadow.is-${edge}`)) return;
    element(`map-roll-edge-shadow is-${edge}`, shell).setAttribute("aria-hidden", "true");
  });

  const audio = root.dadRadarMapRollAudio?.createController?.({volume: 0.72});
  root.addEventListener("pointerdown", () => { void audio?.unlock?.(); }, {once: true});
  const reduced = root.matchMedia?.("(prefers-reduced-motion: reduce)");
  const frame = callback => root.requestAnimationFrame(callback);
  let surface = null, observer = null, current = false, moving = false;
  let requested = false, target = false, timer = null, restartTimer = null;
  let generation = 0, lastTestToken = null;

  function sizeHardware() {
    const width = shell.clientWidth;
    if (!width) return;
    const stacked = width < 560;
    const inset = width < 400 ? 10 : 18;
    const sequenceWidth = Math.min(196, width - inset * 2);
    const clockWidth = Math.min(184, stacked ? (width - inset * 2 - 16) / 2 : (width - inset * 2 - sequenceWidth - 24) / 2);
    const scale = Math.min(1, clockWidth / 184);
    const values = {
      "--map-clock-width": clockWidth, "--map-sequence-width": sequenceWidth,
      "--map-hardware-inset": inset, "--map-clock-bottom": stacked ? 90 : 18,
      "--map-clock-font": Math.max(11, 20 * scale),
      "--map-clock-label": Math.max(7, 9 * scale),
      "--map-clock-pad-x": Math.max(5, 10 * scale)
    };
    Object.keys(values).forEach(key => shell.style.setProperty(key, `${values[key]}px`));
    shell.classList.toggle("map-hardware-stacked", stacked);
  }
  sizeHardware();
  if (root.ResizeObserver) new root.ResizeObserver(sizeHardware).observe(shell);
  else root.addEventListener("resize", sizeHardware);

  function writeHidden(value) {
    if (!surface || surface.hidden === value) return;
    // Disconnect only for our own synchronous write; never suppress a later
    // renderer update with a timer/microtask-wide flag.
    observer?.disconnect();
    surface.hidden = value;
    observer?.observe(surface, {attributes: true, attributeFilter: ["hidden"]});
  }
  function clearMotion() {
    shell.classList.remove("map-roll-to-surface", "map-roll-to-regional");
  }
  function finish() {
    if (!moving) return;
    if (timer !== null) root.clearTimeout(timer);
    timer = null;
    current = target;
    // The registered transform equals the animation's last frame. Commit both
    // states in the same task, with no intermediate layout/paint at transform:0.
    shell.classList.toggle("is-surface-registered", current);
    clearMotion();
    moving = false;
    writeHidden(!current);
    audio?.stopMotor?.();
    const settledGeneration = generation;
    frame(() => frame(() => {
      if (moving || settledGeneration !== generation || root.document.hidden) return;
      void audio?.playRegisterClack?.();
      root.setTimeout(() => {
        if (!moving && settledGeneration === generation && !root.document.hidden) void audio?.playDetentClack?.();
      }, 135);
      // A direction change must wait for this registration cycle to finish.
      restartTimer = root.setTimeout(() => { restartTimer = null; request(requested); }, 220);
    }));
  }
  transport.addEventListener("animationend", event => {
    if (event.target !== transport) return;
    const expected = target ? "map-roll-up" : "map-roll-down";
    if (event.animationName === expected) finish();
  });
  function request(next) {
    requested = !!next;
    if (!surface) return;
    if (moving) { writeHidden(false); return; }
    if (restartTimer !== null) return;
    if (requested === current) { writeHidden(!current); return; }
    generation += 1;
    target = requested;
    if (reduced?.matches) {
      current = target;
      shell.classList.toggle("is-surface-registered", current);
      clearMotion();
      writeHidden(!current);
      return;
    }
    moving = true;
    writeHidden(false);
    shell.classList.add(target ? "map-roll-to-surface" : "map-roll-to-regional");
    void audio?.playMotor?.();
    // Fail safe for removed/disabled animation or background-tab throttling.
    timer = root.setTimeout(finish, api.DURATION_MS + 500);
  }
  function discover() {
    const layer = shell.querySelector(".airport-surface-layer");
    if (!layer || layer === surface) return;
    observer?.disconnect();
    surface = layer;
    const next = !layer.hidden;
    surfaceSheet.appendChild(layer);
    observer = new root.MutationObserver(() => request(!surface.hidden));
    observer.observe(surface, {attributes: true, attributeFilter: ["hidden"]});
    request(next);
  }
  shell.dadRadarMapRoll = Object.freeze({setSurfaceVisible: request, resize: sizeHardware});
  discover();
  new root.MutationObserver(discover).observe(shell, {childList: true, subtree: true});
  root.addEventListener("dad-radar:visual-state-change", event => {
    const token = event.detail?.state?.diagnostics?.shutterTestToken;
    if (!token || token === lastTestToken) return;
    lastTestToken = token;
    // A diagnostic must never roll to a blank sheet and snap the map back.
    if (!surface || !surface.querySelector(".airport-surface-svg")) return;
    const previous = requested;
    request(!previous);
    root.setTimeout(() => request(previous), api.DURATION_MS + 1000);
  }, true);
})(typeof window !== "undefined" ? window : globalThis, function createMapRollTransitionApi() {
  "use strict";
  const DURATION_MS = 2800;
  // Motor registration metadata retains mechanical overshoot; the visible
  // sheets clamp at the aperture boundary while lateral vibration settles.
  const PROFILE = Object.freeze([
    [0, 0], [7, 1.5], [16, 9], [31, 32], [39, 37],
    [56, 61], [73, 82], [88, 99], [93, 100.4], [97, 99.8], [100, 100]
  ]);
  return {DURATION_MS, PROFILE};
});
