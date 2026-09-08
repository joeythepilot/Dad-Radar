(function initializeCalendarStateController(global) {
  "use strict";

  let refreshTimerId = null;
  let stateTimerId = null;
  let liveTimerId = null;
  let lastLiveRefreshAt = 0;
  let currentSchedule = null;
  let currentCalendarResolved = null;
  let currentLiveFlight = null;
  let currentFiledRoute = null;
  let previousLiveResolved = null;
  let liveFlightEventKey = null;
  let liveTrackPoints = [];
  let liveRequestPromise = null;
  let liveProviderUnavailable = false;
  let hasLoadedSchedule = false;
  let lockedFlightEventKey = null;

  const CONFIRMED_ARRIVALS_STORAGE_KEY =
    "dad-radar.confirmed-arrivals.v1";

  const CONFIRMED_ARRIVAL_RETENTION_MS =
    24 * 60 * 60 * 1000;

  const confirmedArrivalTimes =
    loadConfirmedArrivalTimes();

  const TRACKABLE_MODES = new Set([
    "BOARDING",
    "DELAYED",
    "TAXI_OUT",
    "EN_ROUTE",
    "APPROACH",
    "LANDING",
    "TRACKING_LOST",
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
      staleLandingHoldMinutes:
        settings.schedule
          .staleLandingHoldMinutes ??
        15,
      staleFlightHandoffMinutes:
        settings.schedule
          .staleFlightHandoffMinutes ??
        30,
      unconfirmedArrivalMinutes:
        settings.schedule
          .unconfirmedArrivalMinutes ??
        45,
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
      liveActiveRefreshIntervalMs:
        settings.flightData
          ?.activeRefreshIntervalMs ??
        30 * 1000,
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
        52 * 1000,
      activeVisualInterpolationMs:
        settings.flightData
          ?.activeVisualInterpolationMs ??
        27 * 1000
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

  function liveEventKey(event) {
    if (!event) return null;
    return [eventKey(event), event.origin, event.destination,
      event.carrierCode, event.flightNumber, event.liveLookupCandidates?.join(","),
      event.times?.startUtc ?? event.startUtc].join("|");
  }

  function desiredLiveRefreshInterval(
    settings
  ) {
    return global
      .dadRadarLiveRefreshSchedule
      ?.intervalForState(
        currentLiveFlight,
        currentCalendarResolved,
        {
          idleIntervalMs:
            settings
              .liveRefreshIntervalMs,
          activeIntervalMs:
            settings
              .liveActiveRefreshIntervalMs
        }
      ) ??
      settings.liveRefreshIntervalMs;
  }

  function refreshLiveFlightOnSchedule() {
    const settings = controllerSettings();
    const now = Date.now();
    const interval =
      desiredLiveRefreshInterval(
        settings
      );

    if (
      now - lastLiveRefreshAt <
      interval - 250
    ) {
      return null;
    }

    return refreshLiveFlightState();
  }

  function validDate(value) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  function loadConfirmedArrivalTimes() {
    try {
      const stored =
        global.localStorage?.getItem(
          CONFIRMED_ARRIVALS_STORAGE_KEY
        );

      const parsed = stored
        ? JSON.parse(stored)
        : {};

      return parsed &&
        typeof parsed === "object"
        ? { ...parsed }
        : {};
    } catch (_error) {
      return {};
    }
  }

  function saveConfirmedArrivalTimes() {
    try {
      global.localStorage?.setItem(
        CONFIRMED_ARRIVALS_STORAGE_KEY,
        JSON.stringify(
          confirmedArrivalTimes
        )
      );
    } catch (_error) {
      // Arrival continuity still works in memory
      // when browser storage is unavailable.
    }
  }

  function pruneConfirmedArrivalTimes(
    now = new Date()
  ) {
    let changed = false;

    Object.keys(
      confirmedArrivalTimes
    ).forEach((key) => {
      const confirmedAt = validDate(
        confirmedArrivalTimes[key]
      );

      if (
        !confirmedAt ||
        now - confirmedAt >
          CONFIRMED_ARRIVAL_RETENTION_MS ||
        confirmedAt - now > 5 * 60000
      ) {
        delete confirmedArrivalTimes[key];
        changed = true;
      }
    });

    if (changed) {
      saveConfirmedArrivalTimes();
    }
  }

  function recordConfirmedArrival(event) {
    const key = eventKey(event);

    if (!key) {
      return;
    }

    const existingArrival = validDate(
      confirmedArrivalTimes[key]
    );

    const startedAt = validDate(
      event?.times?.startUtc ??
        event?.startUtc
    );

    if (
      existingArrival &&
      (!startedAt ||
        existingArrival >= startedAt)
    ) {
      return;
    }

    confirmedArrivalTimes[key] =
      new Date().toISOString();

    pruneConfirmedArrivalTimes();
    saveConfirmedArrivalTimes();
  }

  function scheduleWithConfirmedArrivals(
    schedule
  ) {
    const now = new Date();

    pruneConfirmedArrivalTimes(now);

    if (!Array.isArray(schedule?.events)) {
      return schedule;
    }

    let changed = false;

    const events = schedule.events.map(
      (event) => {
        const confirmedAt = validDate(
          confirmedArrivalTimes[
            eventKey(event)
          ]
        );

        const startedAt = validDate(
          event?.times?.startUtc ??
            event?.startUtc
        );

        if (
          event?.kind !== "flight" ||
          !confirmedAt ||
          !startedAt ||
          confirmedAt < startedAt ||
          confirmedAt - startedAt >
            CONFIRMED_ARRIVAL_RETENTION_MS
        ) {
          return event;
        }

        changed = true;

        return {
          ...event,
          times: {
            ...event.times,
            endUtc:
              confirmedAt.toISOString()
          },
          confirmedArrivalAt:
            confirmedAt.toISOString()
        };
      }
    );

    return changed
      ? {
          ...schedule,
          events
        }
      : schedule;
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

  function releaseStaleFlightLock(
    schedule,
    settings,
    now = new Date()
  ) {
    if (
      !lockedFlightEventKey ||
      !Array.isArray(schedule?.events)
    ) {
      return false;
    }

    const lockedEvent =
      schedule.events.find(
        (event) =>
          eventKey(event) ===
          lockedFlightEventKey
      );

    if (!lockedEvent) {
      lockedFlightEventKey = null;
      return true;
    }

    const lockedStart = validDate(
      lockedEvent?.times?.startUtc ??
      lockedEvent?.startUtc
    );

    const lockedEnd = validDate(
      lockedEvent?.times?.endUtc ??
      lockedEvent?.endUtc
    );

    const newerStartedFlight =
      schedule.events
        .filter((event) => {
          const start = validDate(
            event?.times?.startUtc ??
            event?.startUtc
          );

          return Boolean(
            event?.kind === "flight" &&
            start &&
            lockedStart &&
            start > lockedStart &&
            start <= now
          );
        })
        .sort((left, right) =>
          validDate(
            left.times?.startUtc ??
            left.startUtc
          ) -
          validDate(
            right.times?.startUtc ??
            right.startUtc
          )
        )[0] ?? null;

    const evidenceAt = validDate(
      currentLiveFlight?.position
        ?.recordedAt ??
      previousLiveResolved?.state
        ?.flight?.lastPositionAt ??
      currentLiveFlight?.retrievedAt
    );

    const evidenceAgeMinutes =
      evidenceAt
        ? Math.max(
            0,
            (now - evidenceAt) / 60000
          )
        : Infinity;

    const previousPhase = String(
      previousLiveResolved?.state
        ?.livePhase ?? ""
    ).toUpperCase();

    const staleLandingCanComplete =
      previousPhase === "LANDING" &&
      lockedEnd &&
      now >= lockedEnd &&
      evidenceAgeMinutes >=
        settings
          .staleLandingHoldMinutes;

    const staleLegCanHandoff =
      Boolean(newerStartedFlight) &&
      evidenceAgeMinutes >=
        settings
          .staleFlightHandoffMinutes;

    if (
      !staleLandingCanComplete &&
      !staleLegCanHandoff
    ) {
      return false;
    }

    if (staleLandingCanComplete) {
      recordConfirmedArrival(
        lockedEvent
      );
    }

    lockedFlightEventKey = null;
    return true;
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

  function isAdsbGroundArrival() {
    const provider = currentLiveFlight?.provider;
    const adsbProvider = provider === "adsb.lol" ||
      (provider === "flightradar24" && /^ADSB$/i.test(currentLiveFlight.position?.updateType ?? ""));
    return adsbProvider &&
      currentLiveFlight.phase === "ARRIVED" && currentLiveFlight.position?.onGround === true;
  }

  function followingGroundArrival() {
    const recordedAt = Date.parse(currentLiveFlight?.position?.recordedAt ?? "");
    const age = Date.now() - recordedAt;
    return isAdsbGroundArrival() && Number.isFinite(age) && age >= -5000 && age < 300000;
  }

  function publishResolvedState() {
    if (!currentSchedule) {
      return null;
    }

    const settings =
      controllerSettings();

    releaseStaleFlightLock(
      currentSchedule,
      settings
    );

    if (isAdsbGroundArrival() && !followingGroundArrival()) {
      recordConfirmedArrival(currentCalendarResolved?.event);
      lockedFlightEventKey = null;
    }

    const effectiveSchedule =
      scheduleWithConfirmedArrivals(
        currentSchedule
      );

    const calendarResolved =
      global.dadRadarScheduleState
        .resolveScheduleState(
          effectiveSchedule,
          {
            ...settings,
            preferredEventId:
              lockedFlightEventKey
          }
        );

    const nextEventKey = liveEventKey(
      calendarResolved.event
    );

    if (
      nextEventKey !==
      liveFlightEventKey
    ) {
      currentLiveFlight = null;
      currentFiledRoute = null;
      previousLiveResolved = null;
      liveTrackPoints = [];
      liveFlightEventKey =
        nextEventKey;
      liveProviderUnavailable =
        false;
    }

    const calendarResolvedWithRoute =
      currentFiledRoute &&
      calendarResolved?.state?.flight
        ? {
            ...calendarResolved,
            state: {
              ...calendarResolved.state,
              flight: {
                ...calendarResolved.state
                  .flight,
                filedRoute:
                  currentFiledRoute
              }
            }
          }
        : calendarResolved;

    currentCalendarResolved =
      calendarResolvedWithRoute;

    const resolved =
      currentLiveFlight &&
      global.dadRadarLiveFlightState
        ? global.dadRadarLiveFlightState
            .reconcileScheduleWithLive(
              calendarResolvedWithRoute,
              currentLiveFlight,
              {
                displayTimeZone:
                  settings
                    .displayTimeZone,
                staleAfterMs: followingGroundArrival()
                  ? 300000
                  : settings.liveStaleAfterMs,
                previousResolved:
                  previousLiveResolved
              }
            )
        : calendarResolvedWithRoute;

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
      lockedFlightEventKey =
        eventKey(resolved.event);
    }

    if (
      ["ARRIVED", "LANDED"].includes(
        resolvedPhase
      )
    ) {
      recordConfirmedArrival(resolved.event);
      if (followingGroundArrival()) {
        lockedFlightEventKey = eventKey(resolved.event);
      } else {
        recordConfirmedArrival(resolved.event);
        lockedFlightEventKey = null;
      }
    }

    if (resolved?.state?.liveData) {
      previousLiveResolved =
        resolved;
    }

    const dailySchedule =
      global.dadRadarScheduleState
        .buildDailySchedule(
          effectiveSchedule,
          resolved,
          settings
        );

    const resolvedWithSchedule = {
      ...resolved,
      state: {
        ...resolved.state,
        dailySchedule,
        visualTransitionMs:
          desiredLiveRefreshInterval(
            settings
          ) ===
          settings
            .liveActiveRefreshIntervalMs
            ? settings
                .activeVisualInterpolationMs
            : settings
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
    lastLiveRefreshAt = Date.now();
    const settings =
      controllerSettings();

    if (
      !settings.liveFlightEnabled ||
      liveProviderUnavailable ||
      (["ARRIVED", "LANDED"].includes(
        String(currentLiveFlight?.phase ?? "").toUpperCase()
      ) && !followingGroundArrival()) ||
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
      liveEventKey(requestedEvent);

    liveRequestPromise =
      (async () => {
        try {
          const liveFlight =
            await global
              .dadRadarLiveFlightApi
              .getFlightSnapshot(
                requestedEvent,
                {
                  surfaceOnly: followingGroundArrival(),
                  providerFlightId:
                    currentLiveFlight
                      ?.providerFlightId ??
                    null,
                  provider:
                    currentLiveFlight
                      ?.provider ?? null
                }
              );

          if (
            requestedEventKey !==
              liveFlightEventKey
          ) {
            return null;
          }

          if (liveFlight?.filedRoute) {
            currentFiledRoute =
              liveFlight.filedRoute;
          }

          if (liveFlight?.routeOnly) {
            const resolved =
              publishResolvedState();

            global.dispatchEvent(
              new CustomEvent(
                "dad-radar:live-flight-sync",
                {
                  detail: {
                    ok: true,
                    routeOnly: true,
                    retrievedAt:
                      liveFlight.retrievedAt,
                    liveFlight: null,
                    resolved
                  }
                }
              )
            );

            return resolved;
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
        setDadRadarMode(
          error?.code ===
            "calendar-authorization-required"
            ? "CALENDAR_AUTH"
            : "OFFLINE"
        );
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

    lastLiveRefreshAt = 0;
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
      lastLiveRefreshAt = Date.now();
      liveTimerId =
        global.setInterval(
          refreshLiveFlightOnSchedule,
          Math.min(
            settings
              .liveRefreshIntervalMs,
            settings
              .liveActiveRefreshIntervalMs
          )
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
