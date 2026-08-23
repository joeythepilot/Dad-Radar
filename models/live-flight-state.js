(function initializeLiveFlightStateModel(root, factory) {
  const airportCatalog =
    typeof module === "object" &&
    module.exports
      ? require(
          "../data/airport-catalog"
        )
      : root?.dadRadarAirports;

  const api = factory(airportCatalog);

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarLiveFlightState =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createLiveFlightStateModel(
    airportCatalog
  ) {
    "use strict";

    const DEFAULT_OPTIONS = Object.freeze({
      displayTimeZone: "America/New_York",
      staleAfterMs: 3 * 60 * 1000
    });

    const APPROACH_RELEASE_ALTITUDE_FEET =
      12500;

    const LANDING_ENTRY_AGL_FEET =
      3000;

    const LANDING_RELEASE_AGL_FEET =
      3500;

    const STATUS_LABELS = Object.freeze({
      BOARDING: "BOARDING",
      TAXI_OUT: "TAXI OUT",
      EN_ROUTE: "EN ROUTE",
      APPROACH: "APPROACH",
      LANDING: "LANDING",
      DIVERTED: "DIVERTED",
      LANDED: "LANDED",
      ARRIVED: "ARRIVED",
      CANCELLED: "CANCELLED"
    });

    function toDate(value) {
      if (value instanceof Date) {
        return Number.isNaN(value.getTime())
          ? null
          : value;
      }

      if (!value) {
        return null;
      }

      const date = new Date(value);

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    function finiteNumber(value) {
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

    function normalizeAirport(value) {
      const code = String(value ?? "")
        .trim()
        .toUpperCase();

      return code || null;
    }

    function formatTime(value, timeZone) {
      const date = toDate(value);

      if (!date) {
        return "--:--";
      }

      return new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone,
          hour: "numeric",
          minute: "2-digit"
        }
      ).format(date);
    }

    function formatFlightIdent(value) {
      const ident = String(value ?? "")
        .trim()
        .toUpperCase();

      const match = ident.match(
        /^([A-Z]{2,3})(\d{1,4}[A-Z]?)$/
      );

      return match
        ? `${match[1]} ${match[2]}`
        : ident;
    }

    function isLiveSnapshotFresh(
      snapshot,
      providedOptions = {}
    ) {
      if (!snapshot) {
        return false;
      }

      const options = {
        ...DEFAULT_OPTIONS,
        ...providedOptions
      };

      const now =
        toDate(options.now) ??
        new Date();

      const retrievedAt = toDate(
        snapshot.retrievedAt
      );

      const recordedAt = toDate(
        snapshot?.position?.recordedAt
      );

      const staleAfterMs =
        finiteNumber(options.staleAfterMs) ??
        DEFAULT_OPTIONS.staleAfterMs;

      if (!retrievedAt || staleAfterMs < 0) {
        return false;
      }

      const retrievalIsFresh = (
        now.getTime() -
        retrievedAt.getTime()
      ) <= staleAfterMs;

      const positionIsFresh =
        !recordedAt ||
        (
          now.getTime() -
          recordedAt.getTime()
        ) <= staleAfterMs;

      return retrievalIsFresh &&
        positionIsFresh;
    }

    function routeMatches(event, snapshot) {
      const expectedOrigin =
        normalizeAirport(event?.origin);

      const expectedDestination =
        normalizeAirport(event?.destination);

      const liveOrigin =
        normalizeAirport(snapshot?.origin);

      const liveDestination =
        normalizeAirport(snapshot?.destination);

      return (
        (!expectedOrigin ||
          !liveOrigin ||
          expectedOrigin === liveOrigin) &&
        (!expectedDestination ||
          !liveDestination ||
          expectedDestination ===
            liveDestination)
      );
    }

    function liveMode(
      calendarResolved,
      phase,
      previousResolved
    ) {
      const calendarMode =
        calendarResolved.mode;

      if (
        calendarMode === "DELAYED" &&
        ["BOARDING", "TAXI_OUT"].includes(
          phase
        )
      ) {
        if (
          hasConfirmedTaxiOutClamp(
            calendarResolved,
            previousResolved
          )
        ) {
          return "TAXI_OUT";
        }

        return "DELAYED";
      }

      if (
        [
          "EN_ROUTE",
          "APPROACH",
          "LANDING"
        ].includes(phase) &&
        (calendarMode ===
          "COMMUTING_TO_BASE" ||
          calendarMode ===
          "COMMUTING_HOME")
      ) {
        return calendarMode;
      }

      const phaseModes = {
        BOARDING: "BOARDING",
        TAXI_OUT: "TAXI_OUT",
        EN_ROUTE: "EN_ROUTE",
        APPROACH: "APPROACH",
        LANDING: "LANDING",
        DIVERTED: "DIVERTED",
        LANDED: "ARRIVED",
        ARRIVED: "ARRIVED"
      };

      return phaseModes[phase] ??
        calendarMode;
    }

    function statusLabel(
      mode,
      phase,
      calendarState
    ) {
      if (
        mode === "DELAYED" &&
        ![
          "EN_ROUTE",
          "APPROACH",
          "LANDING",
          "DIVERTED",
          "CANCELLED",
          "LANDED",
          "ARRIVED"
        ].includes(phase)
      ) {
        return "DELAYED";
      }

      if (STATUS_LABELS[phase]) {
        return STATUS_LABELS[phase];
      }

      const modeLabels = {
        COMMUTING_TO_BASE:
          "COMMUTING TO BASE",
        COMMUTING_HOME:
          "COMMUTING HOME"
      };

      return modeLabels[mode] ??
        calendarState?.status ??
        mode.replace(/_/g, " ");
    }

    function resolvedEventKey(resolved) {
      const value =
        resolved?.event?.id ??
        resolved?.state?.eventId;

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return null;
      }

      return String(value);
    }

    function isSameResolvedFlight(
      currentResolved,
      previousResolved
    ) {
      const currentEventKey =
        resolvedEventKey(
          currentResolved
        );

      return (
        currentEventKey !== null &&
        currentEventKey ===
          resolvedEventKey(
            previousResolved
          )
      );
    }

    function hasConfirmedTaxiOutClamp(
      calendarResolved,
      previousResolved
    ) {
      return Boolean(
        calendarResolved?.mode ===
          "DELAYED" &&
        previousResolved?.mode ===
          "TAXI_OUT" &&
        isSameResolvedFlight(
          calendarResolved,
          previousResolved
        )
      );
    }

    function shouldPreserveConfirmedLiveState(
      calendarResolved,
      previousResolved
    ) {
      if (
        !isSameResolvedFlight(
          calendarResolved,
          previousResolved
        )
      ) {
        return false;
      }

      if (
        calendarResolved.mode ===
          "ARRIVED"
      ) {
        return previousResolved.mode ===
          "ARRIVED";
      }

      const previousPhase = String(
        previousResolved?.state
          ?.livePhase ?? ""
      )
        .trim()
        .toUpperCase();

      return [
        "BOARDING",
        "DELAYED",
        "TAXI_OUT",
        "EN_ROUTE",
        "APPROACH",
        "LANDING",
        "COMMUTING_TO_BASE",
        "COMMUTING_HOME"
      ].includes(calendarResolved.mode) &&
        [
          "TAXI_OUT",
          "EN_ROUTE",
          "APPROACH",
          "LANDING",
          "DIVERTED"
        ].includes(previousPhase);
    }

    function clampedLiveState(
      calendarResolved,
      previousResolved
    ) {
      return {
        ...calendarResolved,
        mode: previousResolved.mode,
        state: {
          ...calendarResolved.state,
          status:
            previousResolved.state
              .status,
          source:
            previousResolved.state
              .source ??
            calendarResolved.state.source,
          liveData: false,
          livePhase:
            previousResolved.state
              .livePhase,
          flight: {
            ...calendarResolved.state
              .flight,
            ...previousResolved.state
              .flight,
            progress:
              previousResolved.mode ===
                "ARRIVED"
                ? 100
                : previousResolved.state
                    .flight.progress
          }
        },
        liveFlight:
          previousResolved.liveFlight ??
          null
      };
    }

    function isClimbingSnapshot(
      snapshot
    ) {
      const altitudeTrend = String(
        snapshot?.position
          ?.altitudeTrend ?? ""
      )
        .trim()
        .toUpperCase();

      return [
        "C",
        "U",
        "UP",
        "CLIMBING"
      ].includes(altitudeTrend);
    }

    function altitudeAboveDestinationFeet(
      calendarResolved,
      snapshot
    ) {
      const altitudeFeet = finiteNumber(
        snapshot?.position?.altitudeFeet
      );

      const destination =
        normalizeAirport(
          snapshot?.destination
        ) ??
        normalizeAirport(
          calendarResolved?.state
            ?.flight?.destination
        ) ??
        normalizeAirport(
          calendarResolved?.event
            ?.destination
        );

      const fieldElevationFeet =
        finiteNumber(
          airportCatalog
            ?.lookupAirport?.(
              destination
            )?.elevationFeet
        );

      if (
        altitudeFeet === null ||
        fieldElevationFeet === null
      ) {
        return null;
      }

      return Math.max(
        0,
        altitudeFeet -
          fieldElevationFeet
      );
    }

    function isConfirmedApproachRelease(
      snapshot
    ) {
      const altitudeFeet = finiteNumber(
        snapshot?.position?.altitudeFeet
      );

      return (
        isClimbingSnapshot(snapshot) &&
        altitudeFeet !== null &&
        altitudeFeet >=
          APPROACH_RELEASE_ALTITUDE_FEET
      );
    }

    function stabilizedLivePhase(
      calendarResolved,
      snapshot,
      previousResolved
    ) {
      const phase = String(
        snapshot?.phase ?? ""
      )
        .trim()
        .toUpperCase();

      const currentEventKey =
        resolvedEventKey(
          calendarResolved
        );

      const previousEventKey =
        resolvedEventKey(
          previousResolved
        );

      const previousPhase = String(
        previousResolved?.state
          ?.livePhase ?? ""
      )
        .trim()
        .toUpperCase();

      const sameFlight =
        currentEventKey !== null &&
        currentEventKey ===
          previousEventKey;

      if (
        [
          "LANDED",
          "ARRIVED",
          "DIVERTED",
          "CANCELLED"
        ].includes(phase)
      ) {
        return phase;
      }

      if (
        sameFlight &&
        previousResolved?.mode ===
          "TAXI_OUT" &&
        ![
          "EN_ROUTE",
          "APPROACH",
          "LANDING"
        ].includes(phase)
      ) {
        return "TAXI_OUT";
      }

      const altitudeAgl =
        altitudeAboveDestinationFeet(
          calendarResolved,
          snapshot
        );

      if (
        sameFlight &&
        previousPhase === "LANDING"
      ) {
        if (
          altitudeAgl !== null &&
          altitudeAgl >=
            LANDING_RELEASE_AGL_FEET &&
          isClimbingSnapshot(snapshot)
        ) {
          return "APPROACH";
        }

        return "LANDING";
      }

      let stabilizedPhase = phase;

      if (
        sameFlight &&
        previousPhase === "APPROACH" &&
        phase === "EN_ROUTE" &&
        !isConfirmedApproachRelease(
          snapshot
        )
      ) {
        stabilizedPhase = "APPROACH";
      }

      if (
        stabilizedPhase === "APPROACH" &&
        finiteNumber(
          snapshot?.progressPercent
        ) >= 65 &&
        altitudeAgl !== null &&
        altitudeAgl <
          LANDING_ENTRY_AGL_FEET &&
        !isClimbingSnapshot(snapshot)
      ) {
        return "LANDING";
      }

      return stabilizedPhase;
    }

    function reconcileScheduleWithLive(
      calendarResolved,
      snapshot,
      providedOptions = {}
    ) {
      if (
        !calendarResolved?.state ||
        !calendarResolved?.event ||
        !calendarResolved.state.flight
      ) {
        return calendarResolved;
      }

      const options = {
        ...DEFAULT_OPTIONS,
        ...providedOptions
      };

      const preserveConfirmedLiveState =
        shouldPreserveConfirmedLiveState(
          calendarResolved,
          options.previousResolved
        );

      if (
        !isLiveSnapshotFresh(
          snapshot,
          options
        ) ||
        !routeMatches(
          calendarResolved.event,
          snapshot
        )
      ) {
        return preserveConfirmedLiveState
          ? clampedLiveState(
              calendarResolved,
              options.previousResolved
            )
          : calendarResolved;
      }

      const calendarFlight =
        calendarResolved.state.flight;

      const position =
        snapshot.position ?? {};

      const latitude = finiteNumber(
        position.latitude
      );

      const longitude = finiteNumber(
        position.longitude
      );

      const hasLivePosition =
        latitude !== null &&
        longitude !== null;

      const phase =
        stabilizedLivePhase(
          calendarResolved,
          snapshot,
          options.previousResolved
        );

      const mode = liveMode(
        calendarResolved,
        phase,
        options.previousResolved
      );

      const origin =
        normalizeAirport(snapshot.origin) ??
        calendarFlight.origin;

      const destination =
        normalizeAirport(
          snapshot.destination
        ) ?? calendarFlight.destination;

      const arrivalTime =
        snapshot.arrival?.best ??
        snapshot.arrival?.estimated ??
        snapshot.arrival?.scheduled;

      const liveIdent =
        formatFlightIdent(
          snapshot.displayIdent ??
          snapshot.ident
        );

      const liveProgress = finiteNumber(
        snapshot.progressPercent
      );

      const provider =
        String(
          snapshot.provider ??
          "live-flight"
        ).trim() || "live-flight";

      const originAirport =
        airportCatalog
          ?.lookupAirport?.(origin);

      const destinationAirport =
        airportCatalog
          ?.lookupAirport?.(
            destination
          );

      const altitudeAgl =
        altitudeAboveDestinationFeet(
          calendarResolved,
          snapshot
        );

      const providerDepartureDelayMinutes =
        finiteNumber(
          snapshot.departure
            ?.delayMinutes
        );

      const previousDepartureDelayMinutes =
        isSameResolvedFlight(
          calendarResolved,
          options.previousResolved
        )
          ? finiteNumber(
              options.previousResolved
                ?.state?.flight
                ?.departureDelayMinutes
            )
          : null;

      const flight = {
        ...calendarFlight,
        number:
          liveIdent ||
          calendarFlight.number,
        origin,
        originCity:
          originAirport?.city ??
          calendarFlight.originCity ??
          origin ??
          "---",
        originLocation:
          airportCatalog
            ?.formatLocation?.(origin) ??
          calendarFlight.originLocation ??
          origin ??
          "---",
        destination,
        destinationCity:
          destinationAirport?.city ??
          calendarFlight.destinationCity ??
          destination ??
          "---",
        destinationLocation:
          airportCatalog
            ?.formatLocation?.(
              destination
            ) ??
          calendarFlight
            .destinationLocation ??
          destination ??
          "---",
        isCommute:
          Boolean(
            calendarFlight.isCommute ??
            calendarResolved.event
              ?.isCommute
          ),
        isDeadhead:
          Boolean(
            calendarFlight.isDeadhead ??
            calendarResolved.event
              ?.isDeadhead
          ),
        travelRole:
          calendarFlight.travelRole ??
          calendarResolved.event
            ?.travelRole ??
          "operating",
        airspeed: null,
        groundSpeed: finiteNumber(
          position.groundSpeedKnots
        ),
        heading: finiteNumber(
          position.headingDegrees
        ),
        altitude: finiteNumber(
          position.altitudeFeet
        ),
        altitudeAgl,
        progress:
          liveProgress ??
          calendarFlight.progress,
        eta: arrivalTime
          ? formatTime(
              arrivalTime,
              options.displayTimeZone
            )
          : calendarFlight.eta,
        timingSource: arrivalTime
          ? provider
          : calendarFlight.timingSource,
        positionSource: hasLivePosition
          ? provider
          : calendarFlight.positionSource,
        latitude,
        longitude,
        lastPositionAt:
          position.recordedAt ?? null,
        providerStatus:
          snapshot.status ?? null,
        departureDelayMinutes:
          mode === "DELAYED"
            ? Math.max(
                providerDepartureDelayMinutes ??
                  0,
                finiteNumber(
                  calendarFlight
                    .departureDelayMinutes
                ) ?? 0
              )
            : providerDepartureDelayMinutes ??
              previousDepartureDelayMinutes,
        arrivalDelayMinutes:
          finiteNumber(
            snapshot.arrival
              ?.delayMinutes
          ),
        departureTerminal:
          snapshot.departure?.terminal ??
          null,
        departureGate:
          snapshot.departure?.gate ?? null,
        arrivalTerminal:
          snapshot.arrival?.terminal ??
          null,
        arrivalGate:
          snapshot.arrival?.gate ?? null,
        aircraftRegistration:
          snapshot.aircraft
            ?.registration ?? null,
        aircraftType:
          snapshot.aircraft?.type ?? null,
        providerFlightId:
          snapshot.providerFlightId ??
          null,
        actualTrack:
          Array.isArray(
            snapshot.actualTrack
          )
            ? snapshot.actualTrack
            : calendarFlight.actualTrack ??
              [],
        filedRoute:
          snapshot.filedRoute ??
          calendarFlight.filedRoute ??
          null
      };

      return {
        ...calendarResolved,
        mode,
        state: {
          ...calendarResolved.state,
          status: statusLabel(
            mode,
            phase,
            calendarResolved.state
          ),
          source: provider,
          liveData: true,
          livePhase: phase,
          flight
        },
        liveFlight: snapshot
      };
    }

    return Object.freeze({
      isLiveSnapshotFresh,
      reconcileScheduleWithLive
    });
  }
);
