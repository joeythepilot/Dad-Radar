(function initializeSequenceHistoryModel(root, factory) {
  "use strict";

  const api = factory();

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarSequenceHistory =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createSequenceHistoryModel() {
    "use strict";

    const DEFAULT_SEQUENCE_GAP_MS =
      48 * 60 * 60 * 1000;

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

    function isWorkFlight(event) {
      return Boolean(
        event?.kind === "flight" &&
        event?.isCommute !== true
      );
    }

    function eventFingerprint(event) {
      if (!event) {
        return null;
      }

      return [
        event.id ?? "",
        event.travelRole ??
          (event.isDeadhead
            ? "deadhead"
            : event.isCommute
              ? "commute"
              : "operating"),
        event.carrierCode ?? "",
        event.flightNumber ?? "",
        event.origin ?? "",
        event.destination ?? "",
        eventStart(event)?.toISOString() ?? "",
        eventEnd(event)?.toISOString() ?? ""
      ]
        .map((value) =>
          String(value)
            .trim()
            .toUpperCase()
        )
        .join("|");
    }

    function normalizedWorkFlights(schedule) {
      return (
        Array.isArray(schedule?.events)
          ? schedule.events
          : []
      )
        .filter(isWorkFlight)
        .filter((event) =>
          eventStart(event) &&
          eventEnd(event) &&
          event.status !== "cancelled"
        )
        .slice()
        .sort(
          (left, right) =>
            eventStart(left) -
            eventStart(right)
        );
    }

    function groupWorkFlights(
      schedule,
      providedOptions = {}
    ) {
      const gapMs = Number(
        providedOptions.gapMs ??
        DEFAULT_SEQUENCE_GAP_MS
      );

      const sequenceGapMs =
        Number.isFinite(gapMs) &&
        gapMs >= 0
          ? gapMs
          : DEFAULT_SEQUENCE_GAP_MS;

      const flights =
        normalizedWorkFlights(schedule);

      const groups = [];

      for (const flight of flights) {
        const previousGroup =
          groups[groups.length - 1];

        const previousFlight =
          previousGroup?.events?.[
            previousGroup.events.length - 1
          ];

        const gapFromPrevious =
          previousFlight
            ? eventStart(flight).getTime() -
              eventEnd(previousFlight).getTime()
            : Number.POSITIVE_INFINITY;

        if (
          !previousGroup ||
          gapFromPrevious > sequenceGapMs
        ) {
          groups.push({
            id:
              `sequence:${eventFingerprint(flight)}`,
            startedAt:
              eventStart(flight).toISOString(),
            events: [flight]
          });
          continue;
        }

        previousGroup.events.push(flight);
      }

      return groups.map((group) => ({
        ...group,
        lastScheduledFlightAt:
          eventEnd(
            group.events[
              group.events.length - 1
            ]
          ).toISOString()
      }));
    }

    function findReferenceGroup(
      groups,
      referenceEvent
    ) {
      if (!isWorkFlight(referenceEvent)) {
        return null;
      }

      const fingerprint =
        eventFingerprint(referenceEvent);

      return groups.find((group) =>
        group.events.some(
          (event) =>
            eventFingerprint(event) ===
            fingerprint
        )
      ) ?? null;
    }

    function findCurrentFlightGroup(
      groups,
      now
    ) {
      return groups.find((group) =>
        group.events.some((event) => {
          const start = eventStart(event);
          const end = eventEnd(event);

          return start <= now &&
            now <= end;
        })
      ) ?? null;
    }

    function findRecentGroup(
      groups,
      now,
      gapMs
    ) {
      let best = null;
      let bestEnd = null;

      for (const group of groups) {
        for (const event of group.events) {
          const end = eventEnd(event);

          if (
            !end ||
            end > now ||
            now.getTime() - end.getTime() >
              gapMs
          ) {
            continue;
          }

          if (!bestEnd || end > bestEnd) {
            best = group;
            bestEnd = end;
          }
        }
      }

      return best;
    }

    function summarizeSequence(
      group,
      now
    ) {
      if (!group) {
        return null;
      }

      const events = group.events.map((event) => ({
        id: event.id ?? null,
        fingerprint:
          eventFingerprint(event),
        travelRole:
          event.travelRole ??
          (event.isDeadhead
            ? "deadhead"
            : "operating"),
        carrierCode:
          event.carrierCode ?? null,
        flightNumber:
          event.flightNumber ?? null,
        origin: event.origin ?? null,
        destination:
          event.destination ?? null,
        startUtc:
          eventStart(event)?.toISOString() ??
          null,
        endUtc:
          eventEnd(event)?.toISOString() ??
          null,
        status:
          eventEnd(event) <= now
            ? "completed"
            : eventStart(event) <= now
              ? "current"
              : "upcoming"
      }));

      const previousFlights =
        group.events.filter(
          (event) => eventEnd(event) <= now
        );

      const lastCompleted =
        previousFlights[
          previousFlights.length - 1
        ] ?? null;

      return {
        id: group.id,
        startedAt: group.startedAt,
        lastScheduledFlightAt:
          group.lastScheduledFlightAt,
        lastCompletedFlightAt:
          eventEnd(lastCompleted)
            ?.toISOString() ?? null,
        events
      };
    }

    function resolveActiveSequence(
      schedule,
      referenceEvent = null,
      providedOptions = {}
    ) {
      const gapMs = Number(
        providedOptions.gapMs ??
        DEFAULT_SEQUENCE_GAP_MS
      );

      const sequenceGapMs =
        Number.isFinite(gapMs) &&
        gapMs >= 0
          ? gapMs
          : DEFAULT_SEQUENCE_GAP_MS;

      const now =
        toDate(providedOptions.now) ??
        new Date();

      const groups = groupWorkFlights(
        schedule,
        { gapMs: sequenceGapMs }
      );

      const group =
        findReferenceGroup(
          groups,
          referenceEvent
        ) ??
        findCurrentFlightGroup(
          groups,
          now
        ) ??
        findRecentGroup(
          groups,
          now,
          sequenceGapMs
        );

      return summarizeSequence(
        group,
        now
      );
    }

    return {
      DEFAULT_SEQUENCE_GAP_MS,
      eventEnd,
      eventFingerprint,
      eventStart,
      groupWorkFlights,
      isWorkFlight,
      resolveActiveSequence
    };
  }
);