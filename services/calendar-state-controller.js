(function initializeCalendarStateController(global) {
  "use strict";

  let refreshTimerId = null;
  let stateTimerId = null;
  let currentSchedule = null;
  let hasLoadedSchedule = false;

  function controllerSettings() {
    const settings =
      typeof dadRadarSettings !==
        "undefined"
        ? dadRadarSettings
        : global.dadRadarSettings;

    return {
      homeAirport:
        settings.homeAirport,
      baseAirport:
        settings.baseAirport ?? "ORD",
      displayTimeZone:
        settings.displayTimeZone,
      lookAheadDays:
        settings.schedule
          .lookAheadDays,
      refreshIntervalMs:
        settings.schedule
          .refreshIntervalMs,
      stateCheckIntervalMs:
        settings.schedule
          .stateCheckIntervalMs,
      preFlightLeadMinutes:
        settings.schedule
          .preFlightLeadMinutes,
      arrivedHoldMinutes:
        settings.schedule
          .arrivedHoldMinutes
    };
  }

  function publishResolvedState() {
    if (!currentSchedule) {
      return null;
    }

    const settings =
      controllerSettings();

    const resolved =
      global.dadRadarScheduleState
        .resolveScheduleState(
          currentSchedule,
          settings
        );

    setDadRadarState(
      resolved.state,
      resolved.mode
    );

    return resolved;
  }

  async function refreshCalendarState() {
    try {
      currentSchedule =
        await global.dadRadarCalendarApi
          .getUpcomingEvents({
            days:
              controllerSettings()
                .lookAheadDays
          });

      hasLoadedSchedule = true;

      const resolved =
        publishResolvedState();

      global.dispatchEvent(
        new CustomEvent(
          "dad-radar:calendar-sync",
          {
            detail: {
              ok: true,
              retrievedAt:
                currentSchedule
                  .retrievedAt,
              resolved
            }
          }
        )
      );

      return resolved;
    } catch (error) {
      console.error(
        "Dad Radar calendar sync failed:",
        error
      );

      if (!hasLoadedSchedule) {
        setDadRadarMode("OFFLINE");
      }

      global.dispatchEvent(
        new CustomEvent(
          "dad-radar:calendar-sync",
          {
            detail: {
              ok: false,
              error
            }
          }
        )
      );

      return null;
    }
  }

  function stopCalendarStateController() {
    if (refreshTimerId !== null) {
      global.clearInterval(
        refreshTimerId
      );

      refreshTimerId = null;
    }

    if (stateTimerId !== null) {
      global.clearInterval(
        stateTimerId
      );

      stateTimerId = null;
    }
  }

  function startCalendarStateController() {
    stopCalendarStateController();

    if (
      !global.dadRadarCalendarApi ||
      !global.dadRadarScheduleState
    ) {
      console.error(
        "Dad Radar calendar services are unavailable."
      );

      setDadRadarMode("OFFLINE");
      return;
    }

    const settings =
      controllerSettings();

    refreshCalendarState();

    refreshTimerId =
      global.setInterval(
        refreshCalendarState,
        settings.refreshIntervalMs
      );

    stateTimerId =
      global.setInterval(
        publishResolvedState,
        settings.stateCheckIntervalMs
      );
  }

  global.refreshCalendarState =
    refreshCalendarState;

  global.startCalendarStateController =
    startCalendarStateController;

  global.stopCalendarStateController =
    stopCalendarStateController;
})(window);
