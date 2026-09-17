(function initializeDailyScheduleLayout(
  root,
  factory
) {
  "use strict";

  const api = factory();

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarDailyScheduleLayout =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createDailyScheduleLayout() {
    function entryCapacity(viewportWidth) {
      const width = Number(viewportWidth);

      if (!Number.isFinite(width)) {
        return 3;
      }

      if (width < 1200) {
        return 2;
      }

      if (width < 1500) {
        return 3;
      }

      if (width < 1800) {
        return 4;
      }

      return 5;
    }

    function selectVisibleEntries(
      providedEntries,
      viewportWidth,
      capacityOverride
    ) {
      const entries = Array.isArray(
        providedEntries
      )
        ? providedEntries
        : [];

      const requestedCapacity =
        Math.floor(Number(capacityOverride));

      const capacity =
        Number.isFinite(requestedCapacity) &&
        requestedCapacity > 0
          ? requestedCapacity
          : entryCapacity(viewportWidth);

      if (entries.length <= capacity) {
        return entries.slice();
      }

      const currentIndex =
        entries.findIndex(
          (entry) =>
            entry?.status === "current"
        );

      const upcomingIndex =
        entries.findIndex(
          (entry) =>
            entry?.status === "upcoming"
        );

      let startIndex;

      if (currentIndex >= 0) {
        startIndex =
          capacity >= 3
            ? currentIndex - 1
            : currentIndex;
      } else if (upcomingIndex >= 0) {
        startIndex = upcomingIndex;
      } else {
        startIndex =
          entries.length - capacity;
      }

      startIndex = Math.max(
        0,
        Math.min(
          startIndex,
          entries.length - capacity
        )
      );

      return entries.slice(
        startIndex,
        startIndex + capacity
      );
    }

    function routeDestination(label) {
      const text = String(label ?? "");
      const parts = text
        .split(/\s*[→>-]+\s*/)
        .filter(Boolean);

      if (parts.length < 2) {
        return "";
      }

      return parts[parts.length - 1]
        .split(" · ")[0]
        .trim()
        .toUpperCase();
    }

    function footerTextFor(
      entries,
      context,
      homeAirport
    ) {
      const allEntries = Array.isArray(entries)
        ? entries
        : [];

      const finalEntry = allEntries.length
        ? allEntries[allEntries.length - 1]
        : null;

      if (!finalEntry) {
        return /HOME/i.test(
          String(context ?? "")
        )
          ? "HOME TODAY"
          : "NO DUTY ITEMS TODAY";
      }

      if (finalEntry.kind === "layover") {
        return String(
          finalEntry.label ?? "LAYOVER"
        ).toUpperCase();
      }

      if (finalEntry.kind === "duty-free") {
        return "HOME DAY";
      }

      if (finalEntry.kind === "flight") {
        const destination =
          routeDestination(
            finalEntry.label
          );

        if (
          destination &&
          destination ===
            String(
              homeAirport ?? "AVL"
            ).toUpperCase()
        ) {
          return "HOME TONIGHT";
        }

        if (destination) {
          return `LAST STOP · ${destination}`;
        }
      }

      return String(
        finalEntry.label ??
        "TODAY'S DUTY"
      ).toUpperCase();
    }

    function buildDutyCardView(
      dailySchedule,
      viewportWidth,
      providedOptions = {}
    ) {
      const allEntries = Array.isArray(
        dailySchedule?.entries
      )
        ? dailySchedule.entries
        : [];

      const visibleEntries =
        selectVisibleEntries(
          allEntries,
          viewportWidth,
          providedOptions.rowCapacity
        );

      return {
        dateLabel:
          dailySchedule?.dateLabel ??
          "TODAY",
        timeZoneLabel:
          dailySchedule?.timeZoneLabel ??
          "",
        context:
          dailySchedule?.context ??
          "UPDATING TODAY'S SCHEDULE",
        rows: visibleEntries.map(
          (entry, index) => ({
            number: index + 1,
            route: [
              entry?.label,
              entry?.tag
            ]
              .filter(Boolean)
              .join(" · "),
            time:
              entry?.time ?? "--:--",
            status: [
              "completed",
              "current",
              "upcoming"
            ].includes(entry?.status)
              ? entry.status
              : "upcoming"
          })
        ),
        footerText: footerTextFor(
          allEntries,
          dailySchedule?.context,
          providedOptions.homeAirport
        ),
        totalEntries: allEntries.length
      };
    }

    return {
      entryCapacity,
      selectVisibleEntries,
      buildDutyCardView
    };
  }
);