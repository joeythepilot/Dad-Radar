(function initializeLiveFlightStateModel(root, factory) {
  const api = factory();

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
  function createLiveFlightStateModel() {
    "use strict";

    const DEFAULT_OPTIONS = Object.freeze({
      displayTimeZone: "America/New_York",
      staleAfterMs: 3 * 60 * 1000
    });

    const AIRPORT_CITIES = Object.freeze({
      ATL: "ATLANTA",
      AVL: "ASHEVILLE",
      AVP: "SCRANTON",
      BDL: "HARTFORD",
      BOS: "BOSTON",
      CLT: "CHARLOTTE",
      DCA: "WASHINGTON",
      DFW: "DALLAS/FORT WORTH",
      DTW: "DETROIT",
      EWR: "NEWARK",
      GSP: "GREENVILLE",
      HPN: "WHITE PLAINS",
      IAD: "WASHINGTON",
      JFK: "NEW YORK",
      LGA: "NEW YORK",
      MIA: "MIAMI",
      ORD: "CHICAGO",
      PHL: "PHILADELPHIA",
      ROC: "ROCHESTER",
      TYS: "KNOXVILLE"
    });

    const STATUS_LABELS = Object.freeze({
      BOARDING: "BOARDING",
      TAXI_OUT: "TAXI OUT",
      EN_ROUTE: "EN ROUTE",
      APPROACH: "APPROACH",
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

      const staleAfterMs =
        finiteNumber(options.staleAfterMs) ??
        DEFAULT_OPTIONS.staleAfterMs;

      if (!retrievedAt || staleAfterMs < 0) {
        return false;
      }

      return (
        now.getTime() -
        retrievedAt.getTime()
      ) <= staleAfterMs;
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
      snapshot
    ) {
      const phase = String(
        snapshot?.phase ?? ""
      ).toUpperCase();

      const calendarMode =
        calendarResolved.mode;

      if (
        (phase === "EN_ROUTE" ||
          phase === "APPROACH") &&
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
        DIVERTED: "DIVERTED",
        LANDED: "ARRIVED",
        ARRIVED: "ARRIVED"
      };

      return phaseModes[phase] ??
        calendarMode;
    }

    function statusLabel(
      mode,
      snapshot,
      calendarState
    ) {
      const phase = String(
        snapshot?.phase ?? ""
      ).toUpperCase();

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
        return calendarResolved;
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

      const mode = liveMode(
        calendarResolved,
        snapshot
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

      const flight = {
        ...calendarFlight,
        number:
          liveIdent ||
          calendarFlight.number,
        origin,
        destination,
        destinationCity:
          AIRPORT_CITIES[destination] ??
          calendarFlight.destinationCity ??
          destination ??
          "---",
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
          ? "flightaware"
          : calendarFlight.timingSource,
        positionSource: hasLivePosition
          ? "flightaware"
          : calendarFlight.positionSource,
        latitude,
        longitude,
        lastPositionAt:
          position.recordedAt ?? null,
        providerStatus:
          snapshot.status ?? null,
        departureDelayMinutes:
          finiteNumber(
            snapshot.departure
              ?.delayMinutes
          ),
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
          null
      };

      return {
        ...calendarResolved,
        mode,
        state: {
          ...calendarResolved.state,
          status: statusLabel(
            mode,
            snapshot,
            calendarResolved.state
          ),
          source: "flightaware",
          liveData: true,
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
