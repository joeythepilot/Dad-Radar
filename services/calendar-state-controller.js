(function initializeCalendarStateController(global) {
  "use strict";

  let refreshTimerId = null;
  let stateTimerId = null;
  let liveTimerId = null;
  let currentSchedule = null;
  let currentCalendarResolved = null;
  let currentLiveFlight = null;
  let previousLiveResolved = null;
  let liveFlightEventKey = null;
  let liveTrackPoints = [];
  let liveRequestPromise = null;
  let liveProviderUnavailable = false;
  let hasLoadedSchedule = false;
  let lockedFlightEventId = null;

  const TRACKABLE_MODES = new Set([
    "BOARDING",
    "DELAYED",
    "TAXI_OUT",
    "EN_ROUTE",
    "APPROACH",
    "LANDING",
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
      displayTimeZoneLabel:
        settings.displayTimeZoneLabel,
      lookAheadDays:
        settings.schedule
          .lookAheadDays,
      refreshIntervalMs:
        settings.schedule
          .refreshIntervalMs,
      stateCheckIntervalMs:
        settings.schedule
          .stateCheckIntervalMs,
      boardingLeadMinutes:
        settings.schedule
          .boardingLeadMinutes ?? 30,
      delayGraceMinutes:
        settings.schedule
          .delayGraceMinutes ?? 5,
      legLockTimeoutMinutes:
        settings.schedule
          .legLockTimeoutMinutes ??
        8 * 60,
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
      liveAcquisitionLeadMinutes:
        settings.flightData
          ?.acquisitionLeadMinutes ??
        30,
      liveStaleAfterMs:
        settings.flightData
          ?.staleAfterMs ??
        3 * 60 * 1000,
      visualInterpolationMs:
        settings.flightData
          ?.visualInterpolationMs ??
        52 * 1000
    };
  }

  function scheduleEventIdentity(event) {
    if (!event) {
      return null;
    }

    return String(
      event.id ??
      [
        event.kind,
        event.origin ?? event.airport,
        event.destination,
        event.times?.startUtc ??
          event.startUtc
      ].join("|")
    );
  }

  function eventKey(event) {
    if (!event) {
      return null;
    }

    if (
      event.kind === "flight" &&
      global.dadRadarSequenceHistory
        ?.eventFingerprint
    ) {
      return global
        .dadRadarSequenceHistory
        .eventFingerprint(event);
    }

    return scheduleEventIdentity(event);
  }

  function finiteCoordinate(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function appendLiveTrackPoint(snapshot) {
    const latitude = finiteCoordinate(
      snapshot?.position?.latitude
    );

    const longitude = finiteCoordinate(
      snapshot?.position?.longitude
    );

    if (
      latitude === null ||
      longitude === null
    ) {
      return liveTrackPoints.slice();
    }

    const point = {
      latitude,
      longitude,
      recordedAt:
        snapshot.position.recordedAt ??
        snapshot.retrievedAt ??
        new Date().toISOString()
    };

    const previous =
      liveTrackPoints[
        liveTrackPoints.length - 1
      ];

    const isDuplicate = Boolean(
      previous &&
      (
        previous.recordedAt ===
          point.recordedAt ||
        (
          Math.abs(
            previous.latitude -
            point.latitude
          ) < 0.0001 &&
          Math.abs(
            previous.longitude -
            point.longitude
          ) < 0.0001
        )
      )
    );

    if (!isDuplicate) {
      liveTrackPoints.push(point);

      if (liveTrackPoints.length > 180) {
        liveTrackPoints =
          liveTrackPoints.slice(-180);
      }
    }

    return liveTrackPoints.slice();
  }

  function isTrackableResolved(
    resolved
  ) {
    const mode = resolved?.mode;

    if (
      mode === "BOARDING" ||
      mode === "DELAYED"
    ) {
      const start = new Date(
        resolved.event?.times?.startUtc ??
        resolved.event?.startUtc ?? ""
      );

      const leadMilliseconds =
        controllerSettings()
          .liveAcquisitionLeadMinutes *
        60 * 1000;

      if (
        Number.isNaN(start.getTime()) ||
        start.getTime() - Date.now() >
          leadMilliseconds
      ) {
        return false;
      }
    }

    return Boolean(
      resolved?.event?.kind ===
        "flight" &&
      resolved.state?.flight &&
      TRACKABLE_MODES.has(
        mode
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
          {
            ...settings,
            preferredEventId:
              lockedFlightEventId
          }
        );

    const nextEventKey = eventKey(
      calendarResolved.event
    );

    if (
      nextEventKey !==
      liveFlightEventKey
    ) {
      currentLiveFlight = null;
      previousLiveResolved = null;
      liveTrackPoints = [];
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
                    .liveStaleAfterMs,
                previousResolved:
                  previousLiveResolved
              }
            )
        : calendarResolved;

    const resolvedPhase = String(
      resolved?.state?.livePhase ?? ""
    ).toUpperCase();

    if (
      resolved?.event?.kind === "flight" &&
      (
        resolved.mode === "DELAYED" ||
        [
          "TAXI_OUT",
          "EN_ROUTE",
          "APPROACH",
          "LANDING",
          "DIVERTED"
        ].includes(resolvedPhase)
      )
    ) {
      lockedFlightEventId =
        scheduleEventIdentity(
          resolved.event
        );
    }

    if (
      ["ARRIVED", "LANDED"].includes(
        resolvedPhase
      )
    ) {
      lockedFlightEventId = null;
    }

    if (resolved?.state?.liveData) {
      previousLiveResolved =
        resolved;
    }

    const dailySchedule =
      global.dadRadarScheduleState
        .buildDailySchedule(
          currentSchedule,
          resolved,
          settings
        );

    const resolvedWithSchedule = {
      ...resolved,
      state: {
        ...resolved.state,
        dailySchedule,
        visualTransitionMs:
          settings
            .visualInterpolationMs
      }
    };

    setDadRadarState(
      resolvedWithSchedule.state,
      resolvedWithSchedule.mode
    );

    return resolvedWithSchedule;
  }

  async function refreshLiveFlightState() {
    const settings =
      controllerSettings();

    if (
      !settings.liveFlightEnabled ||
      liveProviderUnavailable ||
      ["ARRIVED", "LANDED"].includes(
        String(
          currentLiveFlight?.phase ?? ""
        ).toUpperCase()
      ) ||
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
                requestedEvent,
                {
                  providerFlightId:
                    currentLiveFlight
                      ?.providerFlightId ??
                    null
                }
              );

          if (
            requestedEventKey !==
            liveFlightEventKey
          ) {
            return null;
          }

          if (liveFlight) {
            currentLiveFlight = {
              ...liveFlight,
              actualTrack:
                appendLiveTrackPoint(
                  liveFlight
                )
            };
          }

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