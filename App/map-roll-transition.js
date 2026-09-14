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
  // Both sheets move on one HTML transport, in the same CSS-pixel coordinate system.
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
  const prefersReducedMotion = () => root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const frame = callback => root.requestAnimationFrame(callback);
  let surface = null, observer = null, current = false, moving = false, registering = false;
  let requested = false, target = false, timer = null, restartTimer = null;
  let generation = 0, lastTestToken = null, demoSheet = null;
  let apertureSize = "";

  function sizeHardware() {
    const width = shell.clientWidth;
    if (!width) return;
    const size = `${width}x${shell.clientHeight}`;
    if (size === apertureSize) return;
    apertureSize = size;
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
    // Startup and family layout changes resize the aperture without resizing
    // the window. Reuse the existing camera resize handler once per new size.
    if (root.dispatchEvent && root.Event) frame(() => root.dispatchEvent(new root.Event("resize")));
  }
  sizeHardware();
  if (root.ResizeObserver) new root.ResizeObserver(sizeHardware).observe(shell);
  else {
    root.addEventListener("resize", sizeHardware);
    const dashboard = root.document.getElementById("dashboard");
    if (dashboard) new root.MutationObserver(() => frame(sizeHardware))
      .observe(dashboard, {attributes: true, attributeFilter: ["hidden", "style"]});
  }

  function writeHidden(value) {
    if (!surface || surface.hidden === value) return;
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
    // Commit the last animation position and its registered state atomically.
    shell.classList.toggle("is-surface-registered", current);
    clearMotion();
    moving = false;
    registering = true;
    if (!current && demoSheet) { demoSheet.remove(); demoSheet = null; }
    writeHidden(!current);
    audio?.stopMotor?.();
    const settledGeneration = generation;
    frame(() => frame(() => {
      if (moving || settledGeneration !== generation) return;
      if (!root.document.hidden && !prefersReducedMotion()) void audio?.playRegisterClack?.();
      root.setTimeout(() => {
        if (!moving && settledGeneration === generation && !root.document.hidden && !prefersReducedMotion()) void audio?.playDetentClack?.();
      }, 135);
      restartTimer = root.setTimeout(() => { restartTimer = null; registering = false; request(requested); }, 220);
    }));
  }
  transport.addEventListener("animationend", event => {
    if (event.target !== transport) return;
    const expected = target ? "map-roll-up" : "map-roll-down";
    if (event.animationName === expected) finish();
  });
  function request(next) {
    requested = !!next;
    if (!surface && !demoSheet) return;
    if (moving) { writeHidden(false); return; }
    if (registering) { writeHidden(!current); return; }
    if (requested === current) { writeHidden(!current); return; }
    generation += 1;
    target = requested;
    if (prefersReducedMotion()) {
      current = target;
      shell.classList.toggle("is-surface-registered", current);
      clearMotion();
      if (!current && demoSheet) { demoSheet.remove(); demoSheet = null; }
      writeHidden(!current);
      return;
    }
    moving = true;
    writeHidden(false);
    shell.classList.add(target ? "map-roll-to-surface" : "map-roll-to-regional");
    void audio?.playMotor?.();
    timer = root.setTimeout(finish, api.DURATION_MS + 500);
  }
  function attachSurface(layer) {
    if (!layer || layer === surface) return;
    observer?.disconnect();
    if (demoSheet) { demoSheet.remove(); demoSheet = null; }
    surface = layer;
    const next = !layer.hidden;
    surfaceSheet.appendChild(layer);
    observer = new root.MutationObserver(() => request(!surface.hidden));
    observer.observe(surface, {attributes: true, attributeFilter: ["hidden"]});
    request(next);
  }
  function discover() { attachSurface(shell.querySelector(".airport-surface-layer")); }
  function requestSurface(layer, visible) {
    attachSurface(layer);
    // Desired view is not the temporary hidden state used to keep both sheets
    // painted. Repeated ground reports must replace a queued airborne request.
    request(visible);
  }
  shell.dadRadarMapRoll = Object.freeze({setSurfaceVisible: request, requestSurface, resize: sizeHardware});
  discover();
  new root.MutationObserver(discover).observe(shell, {childList: true, subtree: true});
  root.addEventListener("dad-radar:visual-state-change", event => {
    const token = event.detail?.state?.diagnostics?.shutterTestToken;
    if (!token || token === lastTestToken) return;
    lastTestToken = token;
    if (moving || registering || demoSheet) return;
    if (!surface) {
      // Diagnostic only: duplicate the regional map, never fabricate an airport.
      demoSheet = regional.cloneNode(true);
      const nodes = [demoSheet, ...demoSheet.querySelectorAll("*")];
      const ids = {};
      nodes.forEach(node => { if (node.id) { ids[node.id] = `map-roll-test-${node.id}`; node.id = ids[node.id]; } });
      nodes.forEach(node => Array.from(node.attributes).forEach(attribute => {
        let value = attribute.value.replace(/url\(#([^)]*)\)/g, (match, id) => ids[id] ? `url(#${ids[id]})` : match);
        if (value[0] === "#" && ids[value.slice(1)]) value = `#${ids[value.slice(1)]}`;
        if (/^aria-(labelledby|describedby)$/.test(attribute.name)) value = value.split(" ").map(id => ids[id] || id).join(" ");
        if (value !== attribute.value) node.setAttribute(attribute.name, value);
      }));
      demoSheet.setAttribute("aria-hidden", "true");
      surfaceSheet.appendChild(demoSheet);
    }
    const previous = requested;
    request(!previous);
    root.setTimeout(() => request(previous), api.DURATION_MS + 1000);
  }, true);
})(typeof window !== "undefined" ? window : globalThis, function createMapRollTransitionApi() {
  "use strict";
  const DURATION_MS = 2800;
  // Motor metadata retains overshoot; CSS clamps the visible sheets at the lip.
  const PROFILE = Object.freeze([
    [0, 0], [7, 1.5], [16, 9], [31, 32], [39, 37],
    [56, 61], [73, 82], [88, 99], [93, 100.4], [97, 99.8], [100, 100]
  ]);
  return {DURATION_MS, PROFILE};
});
