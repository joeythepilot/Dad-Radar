(function initializeCalendarApiService(global) {
  "use strict";

  const DEFAULT_DAYS = 14;
  const MAX_DAYS = 60;
  const REQUEST_TIMEOUT_MS = 10000;

  function normalizeDays(value) {
    const days = Number(value);

    if (!Number.isFinite(days) || days <= 0) {
      return DEFAULT_DAYS;
    }

    return Math.min(
      Math.floor(days),
      MAX_DAYS
    );
  }

  async function getUpcomingEvents(options = {}) {
    const days = normalizeDays(options.days);

    const controller =
      typeof global.AbortController ===
      "function"
        ? new global.AbortController()
        : null;

    const timeoutId = controller
      ? global.setTimeout(() => {
          controller.abort();
        }, REQUEST_TIMEOUT_MS)
      : null;

    try {
      const response = await fetch(
        `/api/calendar/upcoming?days=${days}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          signal:
            options.signal ??
            controller?.signal
        }
      );

      const data = await response.json();

      if (!response.ok || data.ok !== true) {
        const requestError = new Error(
          data.error ||
          `Calendar request failed with status ${response.status}.`
        );

        requestError.code =
          data.code ??
          "calendar-unavailable";

        throw requestError;
      }

      return {
        calendarId:
          data.calendarId ?? null,
        calendarTimeZone:
          data.calendarTimeZone ?? null,
        retrievedAt:
          data.retrievedAt ?? null,
        events:
          Array.isArray(data.events)
            ? data.events
            : []
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          "The Pilot Schedule request timed out."
        );
      }

      throw error;
    } finally {
      if (timeoutId !== null) {
        global.clearTimeout(timeoutId);
      }
    }
  }

  global.dadRadarCalendarApi = Object.freeze({
    getUpcomingEvents
  });
})(window);
