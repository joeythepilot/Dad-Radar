(function initializeDailyDutyCard(root) {
  "use strict";

  const CARD_ASSET = "/assets/ui/today-duty-card-v2.png";
  const CARD_CSS = "/UI/daily-duty-card.css?v=1";
  const STATUS_FIT_STEP_PX = 0.25;
  const STATUS_MIN_FONT_PX = 4;

  function installStyles() {
    if (root.document.querySelector("link[data-dad-radar-duty-card]")) {
      return;
    }

    const link = root.document.createElement("link");
    link.rel = "stylesheet";
    link.href = CARD_CSS;
    link.dataset.dadRadarDutyCard = "true";
    root.document.head.appendChild(link);
  }

  function ensureCardStructure() {
    const panel = root.document.querySelector(".daily-schedule-panel");
    if (!panel) {
      return null;
    }

    if (!panel.querySelector(".daily-schedule-card-art")) {
      const art = root.document.createElement("img");
      art.className = "daily-schedule-card-art";
      art.src = CARD_ASSET;
      art.alt = "";
      art.setAttribute("aria-hidden", "true");
      art.decoding = "async";
      panel.prepend(art);
    }

    panel.querySelector(".daily-schedule-now")?.remove();
    panel.querySelector("#daily-schedule-title")?.classList.add("visually-hidden");

    let footer = panel.querySelector("#daily-schedule-footer");
    if (!footer) {
      footer = root.document.createElement("p");
      footer.className = "daily-schedule-footer";
      footer.id = "daily-schedule-footer";
      footer.textContent = "UPDATING";
      panel.appendChild(footer);
    }

    panel.classList.add("is-physical-duty-card");
    return panel;
  }

  function fitFamilyFullStatus(panel, status) {
    if (!status) {
      return false;
    }

    // Always restore the CSS-selected normal size first. A later, shorter
    // status should not inherit a reduction that an earlier long sentence
    // needed.
    status.style.removeProperty("font-size");

    const isFamilyFull =
      root.document.documentElement.hasAttribute("data-family-full");

    if (
      !isFamilyFull ||
      !panel?.classList?.contains("is-physical-duty-card")
    ) {
      return true;
    }

    const clientHeight = status.clientHeight;
    const clientWidth = status.clientWidth;
    let fontSize = Number.parseFloat(
      root.getComputedStyle(status).fontSize
    );

    if (
      clientHeight <= 0 ||
      clientWidth <= 0 ||
      !Number.isFinite(fontSize) ||
      fontSize <= 0
    ) {
      return false;
    }

    const fits = () =>
      status.scrollHeight <= status.clientHeight + 1 &&
      status.scrollWidth <= status.clientWidth + 1;

    while (
      !fits() &&
      fontSize > STATUS_MIN_FONT_PX
    ) {
      fontSize = Math.max(
        STATUS_MIN_FONT_PX,
        fontSize - STATUS_FIT_STEP_PX
      );

      status.style.setProperty(
        "font-size",
        `${fontSize}px`,
        "important"
      );
    }

    return fits();
  }

  function fitRenderedStatus() {
    const panel = root.document.querySelector(
      ".daily-schedule-panel.is-physical-duty-card"
    );
    const status = panel?.querySelector(
      "#daily-schedule-context"
    );

    return fitFamilyFullStatus(panel, status);
  }

  function queueStatusFit() {
    if (typeof root.requestAnimationFrame === "function") {
      root.requestAnimationFrame(() => {
        fitRenderedStatus();
      });
      return;
    }

    root.setTimeout(fitRenderedStatus, 0);
  }

  function renderDailySchedule(dailySchedule) {
    const panel = ensureCardStructure();
    if (!panel) {
      return;
    }

    const date = panel.querySelector("#daily-schedule-date");
    const context = panel.querySelector("#daily-schedule-context");
    const list = panel.querySelector("#daily-schedule-list");
    const footer = panel.querySelector("#daily-schedule-footer");

    if (!date || !context || !list || !footer) {
      return;
    }

    const viewportWidth = root.visualViewport?.width ?? root.innerWidth;
    const isFamilyFull = root.document.documentElement.hasAttribute("data-family-full");
    const view = root.dadRadarDailyScheduleLayout?.buildDutyCardView(
      dailySchedule,
      viewportWidth,
      {
        homeAirport: root.dadRadarSettings?.homeAirport ?? "AVL",
        rowCapacity: isFamilyFull ? 5 : undefined
      }
    );

    if (!view) {
      return;
    }

    date.textContent = view.dateLabel;
    date.title = view.timeZoneLabel || "";
    context.textContent = view.context;
    fitFamilyFullStatus(panel, context);
    queueStatusFit();
    footer.textContent = view.footerText;
    list.replaceChildren();

    list.setAttribute(
      "aria-label",
      view.rows.length === view.totalEntries
        ? `${view.totalEntries} duty items`
        : `${view.totalEntries} duty items; showing ${view.rows.length} nearest the current activity`
    );

    if (!view.rows.length) {
      const empty = root.document.createElement("li");
      empty.className = "daily-schedule-empty";
      empty.textContent = dailySchedule ? "NO DUTY ITEMS TODAY" : "AWAITING CALENDAR";
      list.appendChild(empty);
      return;
    }

    view.rows.forEach((row) => {
      const item = root.document.createElement("li");
      item.className = `daily-schedule-entry is-${row.status}`;
      item.dataset.row = String(row.number);

      if (row.status === "current") {
        item.setAttribute("aria-current", "true");
      }

      const route = root.document.createElement("span");
      route.className = "daily-schedule-label";
      route.textContent = row.route || "SCHEDULED ACTIVITY";

      const time = root.document.createElement("time");
      time.className = "daily-schedule-time";
      time.textContent = row.time;

      item.append(route, time);
      list.appendChild(item);
    });
  }

  function queueRender(state) {
    root.setTimeout(() => renderDailySchedule(state?.dailySchedule), 0);
  }

  root.dadRadarDailyDutyCard = Object.freeze({
    fitStatus: fitFamilyFullStatus
  });

  installStyles();
  ensureCardStructure();
  queueRender(root.dadRadarState ?? root.dadRadarVisualState ?? null);

  root.addEventListener("dad-radar:state-change", (event) => {
    queueRender(event.detail?.state);
  });

  root.addEventListener("dad-radar:visual-state-change", (event) => {
    queueRender(event.detail?.state);
  });

  root.addEventListener("resize", queueStatusFit);
})(window);