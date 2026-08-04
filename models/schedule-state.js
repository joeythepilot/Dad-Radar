(function initializeScheduleStateModel(root, factory) {
  const api = factory();

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarScheduleState =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createScheduleStateModel() {
    "use strict";

    const DEFAULT_OPTIONS = Object.freeze({
      homeAirport: "AVL",
      baseAirport: "ORD",
      displayTimeZone: "America/New_York",
      preFlightLeadMinutes: 45,
      arrivedHoldMinutes: 45
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

    const ACTIVE_EVENT_PRIORITY = Object.freeze({
      flight: 4,
      layover: 3,
      "duty-free": 2,
      other: 1
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

    function eventStart(event) {
      return toDate(
        event?.times?.startUtc ??
        event?.startUtc
      );
    }

    function eventEnd(event) {
      return toDate(
        event?.times?.endUtc ??
        event?.endUtc
      );
    }

    function isUsableEvent(event) {
      return (
        event &&
        event.status !== "cancelled" &&
        eventStart(event) &&
        eventEnd(event)
      );
    }

    function sortEvents(events) {
      return (Array.isArray(events)
        ? events
        : [])
        .filter(isUsableEvent)
        .slice()
        .sort(
          (left, right) =>
            eventStart(left) -
            eventStart(right)
        );
    }

    function clamp(value, minimum, maximum) {
      return Math.min(
        Math.max(value, minimum),
        maximum
      );
    }

    function calculateProgress(
      event,
      now
    ) {
      const start = eventStart(event);
      const end = eventEnd(event);

      if (!start || !end) {
        return 0;
      }

      const duration =
        end.getTime() -
        start.getTime();

      if (duration <= 0) {
        return 0;
      }

      return Math.round(
        clamp(
          (
            now.getTime() -
            start.getTime()
          ) / duration * 100,
          0,
          100
        )
      );
    }

    function formatTime(
      value,
      timeZone
    ) {
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

    function getFlightLabel(event) {
      const carrier =
        String(
          event.carrierCode ??
          (event.isCommute ? "" : "AA")
        )
          .trim()
          .toUpperCase();

      const number =
        String(event.flightNumber ?? "")
          .trim();

      return [carrier, number]
        .filter(Boolean)
        .join(" ");
    }

    function createFlightState(
      event,
      mode,
      now,
      options
    ) {
      const progress =
        mode === "PRE_FLIGHT"
          ? 0
          : mode === "ARRIVED"
            ? 100
            : calculateProgress(
                event,
                now
              );

      const statusLabels = {
        COMMUTING_TO_BASE:
          "COMMUTING TO BASE",
        COMMUTING_HOME:
          "COMMUTING HOME",
        PRE_FLIGHT: "PRE-FLIGHT",
        EN_ROUTE: "EN ROUTE",
        APPROACH: "APPROACH",
        ARRIVED: "ARRIVED"
      };

      const endTime =
        event?.times?.endEastern ??
        event?.times?.endUtc;

      return {
        mode,
        state: {
          status:
            statusLabels[mode] ??
            mode.replace(/_/g, " "),
          source: "calendar",
          eventId: event.id ?? null,
          flight: {
            number:
              getFlightLabel(event),
            carrierCode:
              event.carrierCode ?? null,
            origin:
              event.origin ?? null,
            destination:
              event.destination ?? null,
            destinationCity:
              AIRPORT_CITIES[
                event.destination
              ] ??
              event.destination ??
              "---",
            airspeed: null,
            heading: null,
            altitude: null,
            progress,
            eta: formatTime(
              endTime,
              options.displayTimeZone
            ),
            timingSource:
              event?.times?.source ?? null,
            positionSource:
              "schedule-estimate",
            liveLookupCandidates:
              event.liveLookupCandidates ?? []
          }
        },
        event
      };
    }

    function inferCommuteMode(
      event,
      options
    ) {
      if (
        event.destination ===
        options.homeAirport
      ) {
        return "COMMUTING_HOME";
      }

      if (
        event.origin ===
          options.homeAirport ||
        event.destination ===
          options.baseAirport
      ) {
        return "COMMUTING_TO_BASE";
      }

      return "COMMUTING_HOME";
    }

    function createMessageState(
      mode,
      message,
      event = null
    ) {
      const statusLabels = {
        HOME: "HOME",
        LAYOVER: "LAYOVER",
        OFFLINE: "OFFLINE"
      };

      return {
        mode,
        state: {
          status:
            statusLabels[mode] ?? mode,
          message,
          source: "calendar",
          eventId: event?.id ?? null,
          flight: null
        },
        event
      };
    }

    function selectActiveEvent(
      events,
      now
    ) {
      return events
        .filter((event) => {
          const start = eventStart(event);
          const end = eventEnd(event);

          return (
            start <= now &&
            now < end
          );
        })
        .sort((left, right) => {
          const priorityDifference =
            (
              ACTIVE_EVENT_PRIORITY[
                right.kind
              ] ?? 0
            ) -
            (
              ACTIVE_EVENT_PRIORITY[
                left.kind
              ] ?? 0
            );

          return priorityDifference ||
            eventStart(right) -
              eventStart(left);
        })[0] ?? null;
    }

    function resolveActiveEvent(
      event,
      now,
      options
    ) {
      if (event.kind === "flight") {
        if (event.isCommute) {
          return createFlightState(
            event,
            inferCommuteMode(
              event,
              options
            ),
            now,
            options
          );
        }

        return createFlightState(
          event,
          "EN_ROUTE",
          now,
          options
        );
      }

      if (event.kind === "layover") {
        const airport =
          event.airport ?? "DESTINATION";

        return createMessageState(
          "LAYOVER",
          `DAD IS ON LAYOVER IN ${airport}`,
          event
        );
      }

      if (event.kind === "duty-free") {
        return createMessageState(
          "HOME",
          "DAD IS HOME",
          event
        );
      }

      return null;
    }

    function resolveScheduleState(
      schedule,
      providedOptions = {}
    ) {
      const options = {
        ...DEFAULT_OPTIONS,
        ...providedOptions
      };

      const now =
        toDate(providedOptions.now) ??
        new Date();

      const events = sortEvents(
        schedule?.events
      );

      const activeEvent =
        selectActiveEvent(
          events,
          now
        );

      if (activeEvent) {
        const activeState =
          resolveActiveEvent(
            activeEvent,
            now,
            options
          );

        if (activeState) {
          return activeState;
        }
      }

      const nextFlight =
        events.find(
          (event) =>
            event.kind === "flight" &&
            eventStart(event) > now
        ) ?? null;

      if (nextFlight) {
        const minutesUntilDeparture =
          (
            eventStart(nextFlight) -
            now
          ) / 60000;

        if (
          minutesUntilDeparture <=
          options.preFlightLeadMinutes
        ) {
          return createFlightState(
            nextFlight,
            "PRE_FLIGHT",
            now,
            options
          );
        }
      }

      const completedFlights =
        events.filter(
          (event) =>
            event.kind === "flight" &&
            eventEnd(event) <= now
        );

      const lastFlight =
        completedFlights.at(-1) ?? null;

      if (lastFlight) {
        const minutesSinceArrival =
          (
            now - eventEnd(lastFlight)
          ) / 60000;

        if (
          minutesSinceArrival <=
          options.arrivedHoldMinutes
        ) {
          return createFlightState(
            lastFlight,
            "ARRIVED",
            now,
            options
          );
        }

        if (
          lastFlight.destination !==
            options.homeAirport &&
          nextFlight
        ) {
          return createMessageState(
            "LAYOVER",
            `DAD IS ON THE GROUND IN ${lastFlight.destination}`,
            lastFlight
          );
        }
      }

      return createMessageState(
        "HOME",
        "DAD IS HOME"
      );
    }

    return {
      AIRPORT_CITIES,
      calculateProgress,
      resolveScheduleState,
      sortEvents
    };
  }
);
