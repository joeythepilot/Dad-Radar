(function fitApprovedArtworkInk() {
  "use strict";
  // Observe the existing runtime values. No second clock or ETA state/timer.
  const panel = document.querySelector(".twin-clock-panel");
  if (!panel) return;
  const values = panel.querySelectorAll(".twin-clock-value");
  const sequence = document.querySelector(".sequence-mileage-badge");
  const sequenceValues = sequence ? sequence.querySelectorAll(".sequence-mileage-label,.sequence-mileage-value,.sequence-mileage-detail") : [];
  function fit() {
    // Portrait uses a narrower rail. Match the visible housing, not an empty
    // letterboxed SVG viewport, without stretching its physical artwork.
    panel.parentElement.style.setProperty("--twin-clock-height", `${panel.clientWidth * 824 / 1418}px`);
    values.forEach(value => {
      value.style.fontSize = "142px";
      const width = value.getComputedTextLength();
      if (width > 1010) value.style.fontSize = `${142 * 1010 / width}px`;
    });
    sequenceValues.forEach(value => {
      const size = value.classList.contains("sequence-mileage-value") ? 20 :
        value.classList.contains("sequence-mileage-label") ? 9 : 8;
      value.style.setProperty("font-size", `${size}px`, "important");
      const range = document.createRange();
      range.selectNodeContents(value);
      const ink = range.getBoundingClientRect();
      const window = value.getBoundingClientRect();
      const scale = Math.min(1, window.width / ink.width, window.height / ink.height);
      if (scale > 0 && scale < 1) value.style.setProperty("font-size", `${size * scale}px`, "important");
    });
  }
  const observer = new MutationObserver(fit);
  values.forEach(value => observer.observe(value, {childList: true, characterData: true, subtree: true}));
  sequenceValues.forEach(value => observer.observe(value, {childList: true, characterData: true, subtree: true}));
  if (typeof ResizeObserver === "function") {
    const resize = new ResizeObserver(fit);
    resize.observe(panel);
    if (sequence) resize.observe(sequence);
  }
  window.addEventListener("resize", fit);
  if (document.fonts?.ready) document.fonts.ready.then(fit);
  fit();
})();
