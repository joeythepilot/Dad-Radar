(function initializeSequenceHistoryDisplay(global) {
  "use strict";

  let badge = null;
  let valueElement = null;
  let detailElement = null;

  function ensureStylesheet() {
    if (
      document.querySelector(
        "link[data-dad-radar-sequence-history]"
      )
    ) {
      return;
    }

    const link =
      document.createElement("link");

    link.rel = "stylesheet";
    link.href =
      "./UI/sequence-history.css?v=sequence-v1";
    link.dataset.dadRadarSequenceHistory =
      "true";

    document.head.appendChild(link);
  }

  function ensureBadge() {
    if (badge?.isConnected) {
      return badge;
    }

    const shell =
      document.getElementById(
        "route-map-shell"
      );

    if (!shell) {
      return null;
    }

    badge = document.createElement("div");
    badge.className =
      "sequence-mileage-badge";
    badge.hidden = true;

    const label =
      document.createElement("span");
    label.className =
      "sequence-mileage-label";
    label.textContent =
      "ACTIVE SEQUENCE";

    valueElement =
      document.createElement("strong");
    valueElement.className =
      "sequence-mileage-value";

    detailElement =
      document.createElement("span");
    detailElement.className =
      "sequence-mileage-detail";

    badge.append(
      label,
      valueElement,
      detailElement
    );

    shell.appendChild(badge);

    return badge;
  }

  function formatMiles(value) {
    const miles = Number(value);

    if (!Number.isFinite(miles)) {
      return "0 NM";
    }

    return `${Math.round(miles)
      .toLocaleString("en-US")} NM`;
  }

  function render(history) {
    const element = ensureBadge();

    if (!element) {
      return;
    }

    const legs = Array.isArray(
      history?.legs
    )
      ? history.legs
      : [];

    if (!history || legs.length === 0) {
      element.hidden = true;
      return;
    }

    element.hidden = false;

    valueElement.textContent =
      `${history.hasEstimatedDistance
        ? "~"
        : ""}${formatMiles(
          history.totalDistanceNm
        )}`;

    const completedLegs = legs.filter(
      (leg) =>
        new Date(leg.endUtc).getTime() <=
        Date.now()
    ).length;

    const legWord =
      legs.length === 1
        ? "LEG"
        : "LEGS";

    detailElement.textContent =
      `${legs.length} ${legWord}` +
      (completedLegs > 0
        ? ` · ${completedLegs} COMPLETE`
        : "");
  }

  ensureStylesheet();

  global.addEventListener(
    "dad-radar:sequence-history-change",
    (event) => {
      render(
        event.detail?.sequenceHistory ??
        null
      );
    }
  );

  render(
    global.dadRadarSequenceHistoryCurrent ??
    null
  );
})(window);