(function initializeSequenceHistoryDisplay(global) {
  "use strict";

  const compactMobile = global.location?.pathname?.replace(/\/$/, "") === "/mobile";
  if (compactMobile) return;

  let badge = null;
  let valueElement = null;
  let detailElement = null;

  function ensureStylesheet() {
    if (document.querySelector("link[data-dad-radar-sequence-history]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./UI/sequence-history.css?v=sequence-v7";
    link.dataset.dadRadarSequenceHistory = "true";
    document.head.appendChild(link);
  }

  function ensureBadge() {
    if (badge?.isConnected) return badge;
    const shell = document.getElementById("route-map-shell");
    if (!shell) return null;

    badge = document.createElement("div");
    badge.className = "sequence-mileage-badge map-hardware-module";

    const label = document.createElement("span");
    label.className = "sequence-mileage-label";
    label.textContent = "ACTIVE SEQUENCE";

    valueElement = document.createElement("strong");
    valueElement.className = "sequence-mileage-value";

    detailElement = document.createElement("span");
    detailElement.className = "sequence-mileage-detail";

    // Exactly the same cropped image used beneath the two clocks.
    const rod = document.createElement("img");
    rod.className = "sequence-support-rod";
    rod.src = "/assets/hardware/brass-clock-rod.png?v=1";
    rod.alt = "";
    rod.setAttribute("aria-hidden", "true");
    rod.setAttribute("draggable", "false");

    badge.append(rod, label, valueElement, detailElement);
    shell.appendChild(badge);
    return badge;
  }

  function render(history) {
    const element = ensureBadge();
    if (!element) return;
    const legs = Array.isArray(history?.legs) ? history.legs : [];
    const miles = Number(history?.totalDistanceNm);
    valueElement.textContent = `${Number.isFinite(miles) ? Math.round(miles).toLocaleString("en-US") : "0"} NM`;

    if (!history || legs.length === 0) {
      detailElement.textContent = "NO RECORDED LEGS";
      element.classList.add("is-empty");
      return;
    }

    element.classList.remove("is-empty");
    const legWord = legs.length === 1 ? "LEG" : "LEGS";
    const completed = Number(history.completedLegCount) || 0;
    const estimated = Number(history.estimatedLegCount) || 0;
    detailElement.textContent = `${legs.length} ${legWord}${completed > 0 ? ` · ${completed} COMPLETE` : ""}${estimated > 0 ? ` · ${estimated} EST` : ""}`;
  }

  ensureStylesheet();
  global.addEventListener("dad-radar:visual-state-change", event => {
    render(event.detail?.state?.sequenceHistory ?? null);
  });

  try {
    const initial = typeof dadRadarVisualState !== "undefined"
      ? dadRadarVisualState
      : typeof dadRadarState !== "undefined"
        ? dadRadarState
        : null;
    render(initial?.sequenceHistory ?? null);
  } catch (_) {
    render(null);
  }
})(window);
