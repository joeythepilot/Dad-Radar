(function initializeScheduleStateModel(root, factory) {
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
    root.dadRadarScheduleState =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createScheduleStateModel(
    airportCatalog
  ) {
    "use strict";

    const DEFAULT_OPTIONS = Object.freeze({
      homeAirport: "AVL",
      baseAirport: "ORD",
      displayTimeZone: "America/New_York",
      preFlightLeadMinutes: 45,
      arrivedHoldMinutes: 45
    });

    const ACTIVE_EVENT_PRIORITY = Object.freeze({
      flight: 4,
      layover: 3,
      "duty-free": 2,
      other: 1
    });

    function airportInfo(code) {
      return airportCatalog
        ?.lookupAirport?.(code) ?? null;
    }

    function airportCity(
      code,
      fallback = null
    ) {
      return airportInfo(code)?.city ??
        code ??
        fallback;
    }

    function airportLocation(
      code,
      fallback = null
    ) {
      return airportCatalog
        ?.formatLocation?.(code) ??
        airportCity(code, fallback);
    }

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

    function displayDateKey(
      value,
      timeZone
    ) {
      const date = toDate(value);

      if (!date) {
        return null;
      }

      const parts =
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }
        ).formatToParts(date);

      const partValue = (type) =>
        parts.find(
          (part) => part.type === type
        )?.value ?? "";

      return [
        partValue("year"),
        partValue("month"),
        partValue("day")
      ].join("-");
    }

    function formatDateLabel(
      value,
      timeZone
    ) {
      const date = toDate(value);

      if (!date) {
        return "TODAY";
      }

      return new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone,
          weekday: "short",
          month: "short",
          day: "numeric"
        }
      )
        .format(date)
        .replace(/,/g, "")
        .toUpperCase();
    }

    function eventIdentity(event) {
      if (!event) {
        return null;
      }

      return String(
        event.id ??
        [
          event.kind,
          event.origin ?? event.airport,
          event.destination,
          eventStart(event)?.toISOString()
        ].join("|")
      );
    }

    function dailyEventLabel(event) {
      if (event.kind === "flight") {
        return [
          event.origin ?? "---",
          event.destination ?? "---"
        ].join(" → ");
      }

      if (event.kind === "layover") {
        const airport =
          event.airport ?? "DESTINATION";

        return `LAYOVER · ${
          airportCity(airport, airport)
        }`;
      }

      if (event.kind === "duty-free") {
        return "HOME · DAY OFF";
      }

      return String(
        event.summary ?? "SCHEDULED ACTIVITY"
      )
        .trim()
        .toUpperCase();
    }

    function dailyEventTag(event) {
      if (event.kind === "flight") {
        return event.isCommute
          ? "COMMUTE"
          : event.flightNumber
            ? `FLT ${event.flightNumber}`
            : "FLIGHT";
      }

      if (event.kind === "layover") {
        return "GROUND";
      }

      if (event.kind === "duty-free") {
        return "OFF DUTY";
      }

      return "";
    }

    function dailyContext(
      resolved,
      entries
    ) {
      const mode =
        resolved?.mode ??
        "LOCATION_UNKNOWN";

      const destinationLabel =
        resolved?.state?.flight
          ?.destinationLocation ??
        resolved?.state?.flight
          ?.destinationCity ??
        resolved?.state?.flight
          ?.destination ??
        null;

      const destination =
        destinationLabel
          ? String(
              destinationLabel
            ).toUpperCase()
          : null;

      const resolvedAirport =
        resolved?.state
          ?.locationAirport ??
        resolved?.event?.airport ??
        resolved?.event?.destination ??
        null;

      const resolvedLocation =
        String(
          airportLocation(
            resolvedAirport,
            "DESTINATION"
          )
        ).toUpperCase();

      const contextByMode = {
        COMMUTING_TO_BASE:
          destination
            ? `DADDY IS COMMUTING TO ${destination}`
            : "DADDY IS COMMUTING TO BASE",
        COMMUTING_HOME:
          "DADDY IS FLYING HOME",
        PRE_FLIGHT:
          destination
            ? `DADDY IS GETTING READY TO FLY TO ${destination}`
            : "DADDY IS GETTING READY TO FLY",
        BOARDING:
          destination
            ? `DADDY IS BOARDING FOR ${destination}`
            : "DADDY IS BOARDING",
        TAXI_OUT:
          destination
            ? `DADDY IS TAXIING FOR ${destination}`
            : "DADDY IS TAXIING",
        EN_ROUTE:
          destination
            ? `DADDY IS FLYING TO ${destination}`
            : "DADDY IS FLYING",
        APPROACH:
          destination
            ? `DADDY IS ALMOST IN ${destination}`
            : "DADDY IS ALMOST THERE",
        DIVERTED:
          destination
            ? `DADDY'S FLIGHT DIVERTED TO ${destination}`
            : "DADDY'S FLIGHT HAS DIVERTED",
        ARRIVED:
          destination
            ? `DADDY HAS ARRIVED IN ${destination}`
            : "DADDY HAS ARRIVED",
        LAYOVER:
          `DADDY IS ON LAYOVER IN ${resolvedLocation}`,
        LOCATION_UNKNOWN:
          "DADDY'S LOCATION IS NOT CONFIRMED",
        OFFLINE:
          "UPDATING TODAY'S SCHEDULE"
      };

      if (contextByMode[mode]) {
        return contextByMode[mode];
      }

      const nextFlight =
        entries.find(
          (entry) =>
            entry.kind === "flight" &&
            entry.status === "upcoming"
        );

      if (nextFlight) {
        return `DADDY IS HOME · NEXT FLIGHT ${nextFlight.time}`;
      }

      return entries.length > 0
        ? "DADDY IS HOME TODAY"
        : "NO FLYING SCHEDULED TODAY";
    }

    function buildDailySchedule(
      schedule,
      resolved,
      providedOptions = {}
    ) {
      const options = {
        ...DEFAULT_OPTIONS,
        ...providedOptions
      };

      const now =
        toDate(providedOptions.now) ??
        new Date();

      const todayKey =
        displayDateKey(
          now,
          options.displayTimeZone
        );

      const resolvedEventIdentity =
        eventIdentity(resolved?.event);

      const entries = sortEvents(
        schedule?.events
      )
        .filter((event) => {
          const startKey =
            displayDateKey(
              eventStart(event),
              options.displayTimeZone
            );

          const inclusiveEnd =
            new Date(
              eventEnd(event).getTime() - 1
            );

          const endKey =
            displayDateKey(
              inclusiveEnd,
              options.displayTimeZone
            );

          return (
            startKey <= todayKey &&
            todayKey <= endKey
          );
        })
        .map((event) => {
          const start = eventStart(event);
          const end = eventEnd(event);
          const isResolvedEvent =
            resolvedEventIdentity &&
            eventIdentity(event) ===
              resolvedEventIdentity;

          let status = "upcoming";

          if (
            isResolvedEvent ||
            (
              !resolvedEventIdentity &&
              start <= now &&
              now < end
            )
          ) {
            status = "current";
          } else if (end <= now) {
            status = "completed";
          }

          const startsToday =
            displayDateKey(
              start,
              options.displayTimeZone
            ) === todayKey;

          return {
            id: eventIdentity(event),
            kind: event.kind ?? "other",
            time:
              event.kind === "duty-free" ||
              !startsToday
                ? "ALL DAY"
                : formatTime(
                    start,
                    options.displayTimeZone
                  ),
            label: dailyEventLabel(event),
            tag: dailyEventTag(event),
            status
          };
        });

      return {
        dateLabel: formatDateLabel(
          now,
          options.displayTimeZone
        ),
        timeZoneLabel:
          options.displayTimeZoneLabel ??
          options.displayTimeZone,
        context: dailyContext(
          resolved,
          entries
        ),
        entries
      };
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

      const originAirport =
        airportInfo(event.origin);

      const destinationAirport =
        airportInfo(event.destination);

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
            originCity:
              originAirport?.city ??
              event.origin ??
              "---",
            originLocation:
              airportLocation(
                event.origin,
                event.origin ?? "---"
              ),
            destination:
              event.destination ?? null,
            destinationCity:
              destinationAirport?.city ??
              event.destination ??
              "---",
            destinationLocation:
              airportLocation(
                event.destination,
                event.destination ?? "---"
              ),
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
      event = null,
      locationAirport = null
    ) {
      const statusLabels = {
        HOME: "HOME",
        LAYOVER: "LAYOVER",
        LOCATION_UNKNOWN:
          "LOCATION UNKNOWN",
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
          locationAirport:
            locationAirport ??
            event?.airport ??
            null,
          flight: null
        },
        event
      };
    }

    function createGroundLocationState(
      airport,
      options,
      event = null
    ) {
      const normalizedAirport =
        String(airport ?? "")
          .trim()
          .toUpperCase();

      if (!normalizedAirport) {
        return createMessageState(
          "LOCATION_UNKNOWN",
          "DADDY'S LOCATION IS NOT CONFIRMED",
          event
        );
      }

      if (
        normalizedAirport ===
        options.homeAirport
      ) {
        return createMessageState(
          "HOME",
          "DADDY IS HOME",
          event,
          normalizedAirport
        );
      }

      const location =
        String(
          airportLocation(
            normalizedAirport,
            normalizedAirport
          )
        ).toUpperCase();

      return createMessageState(
        "LAYOVER",
        `DADDY IS ON THE GROUND IN ${location}`,
        event,
        normalizedAirport
      );
    }

    function inferGroundAirport(
      events,
      now
    ) {
      const lastFlight = events
        .filter(
          (event) =>
            event.kind === "flight" &&
            eventEnd(event) <= now
        )
        .at(-1) ?? null;

      if (lastFlight?.destination) {
        return lastFlight.destination;
      }

      const nextFlight =
        events.find(
          (event) =>
            event.kind === "flight" &&
            eventStart(event) > now
        ) ?? null;

      return nextFlight?.origin ?? null;
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

        const location = String(
          airportLocation(
            airport,
            airport
          )
        ).toUpperCase();

        return createMessageState(
          "LAYOVER",
          `DADDY IS ON LAYOVER IN ${location}`,
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
        if (
          activeEvent.kind ===
          "duty-free"
        ) {
          return createGroundLocationState(
            inferGroundAirport(
              events,
              now
            ),
            options,
            activeEvent
          );
        }

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

        return createGroundLocationState(
          lastFlight.destination,
          options
        );
      }

      return createGroundLocationState(
        nextFlight?.origin ?? null,
        options
      );
    }

    return {
      buildDailySchedule,
      calculateProgress,
      resolveScheduleState,
      sortEvents
    };
  }
);
