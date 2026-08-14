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
      viewportWidth
    ) {
      const entries = Array.isArray(
        providedEntries
      )
        ? providedEntries
        : [];

      const capacity = entryCapacity(
        viewportWidth
      );

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

    return {
      entryCapacity,
      selectVisibleEntries
    };
  }
);
