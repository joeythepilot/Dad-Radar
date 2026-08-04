(function initializeCalendarStateController(global) {
  "use strict";

  let refreshTimerId = null;
  let stateTimerId = null;
  let liveTimerId = null;
  let currentSchedule = null;
  let currentCalendarResolved = null;
  let currentLiveFlight = null;
  let liveFlightEventKey = null;
  let liveRequestPromise = null;
  let liveProviderUnavailable = false;
  let hasLoadedSchedule = false;

  const TRACKABLE_MODES = new Set([
    "PRE_FLIGHT",
    "BOARDING",
    "TAXI_OUT",
    "EN_ROUTE",
    "APPROACH",
    "ARRIVED",
    "COMMUTING_TO_BASE",
    "COMMUTING_HOME"
  ]);

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
          .arrivedHoldMinutes,
      liveFlightEnabled:
        settings.flightData
          ?.enabled !== false,
      liveRefreshIntervalMs:
        settings.flightData
          ?.refreshIntervalMs ??
        60 * 1000,
      liveStaleAfterMs:
        settings.flightData
          ?.staleAfterMs ??
        3 * 60 * 1000
    };
  }

  function eventKey(event) {
    if (!event) {
      return null;
    }

    return String(
      event.id ??
      [
        event.origin,
        event.destination,
        event.times?.startUtc ??
          event.startUtc
      ].join("|")
    );
  }

  function isTrackableResolved(
    resolved
  ) {
    return Boolean(
      resolved?.event?.kind ===
        "flight" &&
      resolved.state?.flight &&
      TRACKABLE_MODES.has(
        resolved.mode
      ) &&
      Array.isArray(
        resolved.event
          .liveLookupCandidates
      ) &&
      resolved.event
        .liveLookupCandidates
        .length > 0
    );
  }

  function publishResolvedState() {
    if (!currentSchedule) {
      return null;
    }

    const settings =
      controllerSettings();

    const calendarResolved =
      global.dadRadarScheduleState
        .resolveScheduleState(
          currentSchedule,
          settings
        );

    const nextEventKey = eventKey(
      calendarResolved.event
    );

    if (
      nextEventKey !==
      liveFlightEventKey
    ) {
      currentLiveFlight = null;
      liveFlightEventKey =
        nextEventKey;
      liveProviderUnavailable =
        false;
    }

    currentCalendarResolved =
      calendarResolved;

    const resolved =
      currentLiveFlight &&
      global.dadRadarLiveFlightState
        ? global.dadRadarLiveFlightState
            .reconcileScheduleWithLive(
              calendarResolved,
              currentLiveFlight,
              {
                displayTimeZone:
                  settings
                    .displayTimeZone,
                staleAfterMs:
                  settings
                    .liveStaleAfterMs
              }
            )
        : calendarResolved;

    setDadRadarState(
      resolved.state,
      resolved.mode
    );

    return resolved;
  }

  async function refreshLiveFlightState() {
    const settings =
      controllerSettings();

    if (
      !settings.liveFlightEnabled ||
      liveProviderUnavailable ||
      !global.dadRadarLiveFlightApi ||
      !global.dadRadarLiveFlightState ||
      !isTrackableResolved(
        currentCalendarResolved
      )
    ) {
      return null;
    }

    if (liveRequestPromise) {
      return liveRequestPromise;
    }

    const requestedEvent =
      currentCalendarResolved.event;

    const requestedEventKey =
      eventKey(requestedEvent);

    liveRequestPromise =
      (async () => {
        try {
          const liveFlight =
            await global
              .dadRadarLiveFlightApi
              .getFlightSnapshot(
                requestedEvent
              );

          if (
            requestedEventKey !==
            liveFlightEventKey
          ) {
            return null;
          }

          currentLiveFlight =
            liveFlight;

          const resolved =
            publishResolvedState();

          global.dispatchEvent(
            new CustomEvent(
              "dad-radar:live-flight-sync",
              {
                detail: {
                  ok: true,
                  retrievedAt:
                    liveFlight
                      ?.retrievedAt ??
                    new Date()
                      .toISOString(),
                  liveFlight,
                  resolved
                }
              }
            )
          );

          return resolved;
        } catch (error) {
          if (
            error?.code ===
            "not-configured"
          ) {
            liveProviderUnavailable =
              true;
          }

          console.warn(
            "Dad Radar live flight sync failed; retaining Calendar state:",
            error
          );

          const resolved =
            publishResolvedState();

          global.dispatchEvent(
            new CustomEvent(
              "dad-radar:live-flight-sync",
              {
                detail: {
                  ok: false,
                  error,
                  resolved
                }
              }
            )
          );

          return resolved;
        }
      })();

    try {
      return await liveRequestPromise;
    } finally {
      liveRequestPromise = null;
    }
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

      liveProviderUnavailable = false;

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

      refreshLiveFlightState();

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

    if (liveTimerId !== null) {
      global.clearInterval(
        liveTimerId
      );

      liveTimerId = null;
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

    if (settings.liveFlightEnabled) {
      liveTimerId =
        global.setInterval(
          refreshLiveFlightState,
          settings.liveRefreshIntervalMs
        );
    }
  }

  global.refreshCalendarState =
    refreshCalendarState;

  global.refreshLiveFlightState =
    refreshLiveFlightState;

  global.startCalendarStateController =
    startCalendarStateController;

  global.stopCalendarStateController =
    stopCalendarStateController;
})(window);
