(function initializeOperationalScheduleState(root, factory) {
  const base =
    typeof module === "object" && module.exports
      ? require("./schedule-state")
      : root?.dadRadarScheduleState;

  const api = factory(base);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && api) {
    root.dadRadarScheduleState = Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createOperationalScheduleState(base) {
    "use strict";

    if (!base) return null;

    function toDate(value) {
      const date = value instanceof Date ? value : value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) ? date : null;
    }

    function plannedStart(event) {
      return toDate(
        event?.calendarPlan?.startUtc ??
        event?.times?.startUtc ??
        event?.startUtc
      );
    }

    function plannedEnd(event) {
      return toDate(
        event?.calendarPlan?.endUtc ??
        event?.times?.endUtc ??
        event?.endUtc
      );
    }

    function operational(event) {
      return event?.kind === "flight" && event?.operational?.provider === "flightaware"
        ? event.operational
        : null;
    }

    function bestDeparture(event) {
      const op = operational(event);
      return toDate(op?.actualOut) ??
        toDate(op?.estimatedOut) ??
        plannedStart(event);
    }

    function bestArrival(event) {
      const op = operational(event);
      return toDate(op?.actualIn) ??
        toDate(op?.estimatedIn) ??
        toDate(op?.actualOn) ??
        toDate(op?.estimatedOn) ??
        plannedEnd(event);
    }

    function effectiveEnd(event) {
      const op = operational(event);
      const planned = plannedEnd(event);
      const actualIn = toDate(op?.actualIn);
      if (actualIn) return actualIn;
      const revised = toDate(op?.estimatedIn) ?? toDate(op?.estimatedOn);
      if (!planned) return revised;
      if (!revised) return planned;
      return revised > planned ? revised : planned;
    }

    function effectiveEvent(event) {
      if (!event || event.kind !== "flight" || !operational(event)) return event;
      const end = effectiveEnd(event);
      if (!end) return event;
      return {
        ...event,
        times: {
          ...(event.times || {}),
          endUtc: end.toISOString()
        }
      };
    }

    function effectiveSchedule(schedule) {
      if (!Array.isArray(schedule?.events)) return schedule;
      return {
        ...schedule,
        events: schedule.events.map(effectiveEvent)
      };
    }

    function eventId(event) {
      if (event?.id !== null && event?.id !== undefined) return String(event.id);
      return null;
    }

    function originalEvent(schedule, event) {
      if (!event || !Array.isArray(schedule?.events)) return event;
      const id = eventId(event);
      if (!id) return event;
      return schedule.events.find(candidate => eventId(candidate) === id) ?? event;
    }

    function restoreCalendarPlan(event) {
      if (!event) return event;
      const start = event?.calendarPlan?.startUtc;
      const end = event?.calendarPlan?.endUtc;
      const op = operational(event);
      if (!start && !end && !op?.actualIn) return event;
      return {
        ...event,
        times: {
          ...(event.times || {}),
          ...(start ? {startUtc: start} : {}),
          ...(end ? {endUtc: end} : {})
        },
        ...(op?.actualIn ? {confirmedArrivalAt: op.actualIn} : {})
      };
    }

    function finiteMinutes(value) {
      if (value === null || value === undefined || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, Math.round(number)) : null;
    }

    function operationalMode(event, now, options = {}) {
      const op = operational(event);
      if (!op) return null;
      const status = String(op.status ?? "").trim().toUpperCase();

      if (op.cancelled || /CANCELLED|CANCELED/.test(status)) return "CANCELLED";
      if (toDate(op.actualIn)) return "ARRIVED";
      if (toDate(op.actualOn)) return "TAXI_IN";
      if (op.diverted || /DIVERT/.test(status)) return "DIVERTED";
      if (toDate(op.actualOff)) return "EN_ROUTE";
      if (toDate(op.actualOut)) return "TAXI_OUT";

      const grace = Number.isFinite(Number(options.delayGraceMinutes))
        ? Number(options.delayGraceMinutes)
        : 5;
      const delay = finiteMinutes(op.departureDelayMinutes);
      const scheduledOut = toDate(op.scheduledOut) ?? plannedStart(event);
      const estimatedOut = toDate(op.estimatedOut);
      const estimateDelay = scheduledOut && estimatedOut
        ? (estimatedOut - scheduledOut) / 60000
        : null;

      if (/DELAY/.test(status) ||
          (delay !== null && delay > grace) ||
          (estimateDelay !== null && estimateDelay > grace)) {
        return "DELAYED";
      }

      const start = plannedStart(event);
      if (start && start <= now) return "BOARDING";
      return null;
    }

    function formatTime(value, timeZone) {
      const date = toDate(value);
      if (!date) return "--:--";
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone || "America/New_York",
        hour: "numeric",
        minute: "2-digit"
      }).format(date);
    }

    function statusLabel(mode) {
      const labels = {
        TAXI_OUT: "TAXI OUT",
        TAXI_IN: "TAXI IN",
        EN_ROUTE: "EN ROUTE",
        CANCELLED: "CANCELLED",
        DIVERTED: "DIVERTED",
        ARRIVED: "ARRIVED",
        DELAYED: "DELAYED",
        BOARDING: "BOARDING"
      };
      return labels[mode] ?? String(mode ?? "").replace(/_/g, " ");
    }

    function operationalResolved(baseResolved, schedule, providedOptions = {}) {
      if (!baseResolved?.event || baseResolved.event.kind !== "flight") return baseResolved;
      const event = restoreCalendarPlan(originalEvent(schedule, baseResolved.event));
      const op = operational(event);
      if (!op || !baseResolved?.state?.flight) {
        return event === baseResolved.event ? baseResolved : {...baseResolved, event};
      }

      const now = toDate(providedOptions.now) ?? new Date();
      let mode = operationalMode(event, now, providedOptions) ?? baseResolved.mode;
      if (
        event.isCommute === true &&
        mode === "EN_ROUTE" &&
        ["COMMUTING_TO_BASE", "COMMUTING_HOME"].includes(baseResolved.mode)
      ) {
        mode = baseResolved.mode;
      }
      const delay = finiteMinutes(op.departureDelayMinutes);
      const arrivalDelay = finiteMinutes(op.arrivalDelayMinutes);
      const arrival = bestArrival(event);
      const progress = ["ARRIVED", "TAXI_IN"].includes(mode)
        ? 100
        : ["BOARDING", "DELAYED", "TAXI_OUT", "CANCELLED"].includes(mode)
          ? 0
          : baseResolved.state.flight.progress;

      return {
        ...baseResolved,
        mode,
        state: {
          ...baseResolved.state,
          status: statusLabel(mode),
          flight: {
            ...baseResolved.state.flight,
            progress,
            eta: formatTime(arrival, providedOptions.displayTimeZone),
            timingSource: "flightaware",
            operational: op,
            departureDelayMinutes: delay,
            arrivalDelayMinutes: arrivalDelay,
            scheduledOut: op.scheduledOut ?? event?.calendarPlan?.startUtc ?? event?.times?.startUtc ?? null,
            estimatedOut: op.estimatedOut ?? null,
            actualOut: op.actualOut ?? null,
            estimatedOff: op.estimatedOff ?? null,
            actualOff: op.actualOff ?? null,
            estimatedOn: op.estimatedOn ?? null,
            actualOn: op.actualOn ?? null,
            scheduledIn: op.scheduledIn ?? event?.calendarPlan?.endUtc ?? event?.times?.endUtc ?? null,
            estimatedIn: op.estimatedIn ?? null,
            actualIn: op.actualIn ?? null
          }
        },
        event
      };
    }

    function resolveScheduleState(schedule, providedOptions = {}) {
      const resolved = base.resolveScheduleState(
        effectiveSchedule(schedule),
        providedOptions
      );
      return operationalResolved(resolved, schedule, providedOptions);
    }

    function displayEventById(schedule, id) {
      if (!Array.isArray(schedule?.events)) return null;
      return schedule.events.find(event => eventId(event) === String(id)) ?? null;
    }

    function cancelledContext(resolved) {
      if (resolved?.mode !== "CANCELLED") return null;
      const flight = resolved?.state?.flight;
      const destination = String(
        flight?.destinationLocation ?? flight?.destinationCity ?? flight?.destination ?? "THE NEXT STOP"
      ).toUpperCase();
      return resolved?.event?.isDeadhead
        ? `DADDY'S RIDE TO ${destination} IS CANCELLED`
        : `DADDY'S FLIGHT TO ${destination} IS CANCELLED`;
    }

    function buildDailySchedule(schedule, resolved, providedOptions = {}) {
      const timeline = base.buildDailySchedule(
        effectiveSchedule(schedule),
        resolved,
        providedOptions
      );
      const timeZone = providedOptions.displayTimeZone ?? "America/New_York";
      const entries = timeline.entries.map(entry => {
        const event = displayEventById(schedule, entry.id);
        if (!event || event.kind !== "flight" || !operational(event) || entry.time === "ALL DAY") {
          return entry;
        }
        const op = operational(event);
        const delay = finiteMinutes(op?.departureDelayMinutes);
        const revisedOut = toDate(op?.estimatedOut);
        const plannedOut = toDate(op?.scheduledOut) ?? plannedStart(event);
        const hasProjectedDelay =
          !toDate(op?.actualOut) &&
          revisedOut &&
          plannedOut &&
          (
            (delay !== null && delay > 5) ||
            (revisedOut - plannedOut) / 60000 > 5 ||
            /DELAY/.test(String(op?.status ?? "").toUpperCase())
          );
        const estimatedDelayMinutes =
          revisedOut && plannedOut
            ? Math.max(0, Math.round((revisedOut - plannedOut) / 60000))
            : null;
        const displayDelayMinutes =
          delay !== null ? delay : estimatedDelayMinutes;
        return {
          ...entry,
          time: formatTime(bestDeparture(event), timeZone),
          ...(hasProjectedDelay ? {
            operationalStamp: {
              kind: "delay",
              label: "DELAYED",
              detail: displayDelayMinutes === 1
                ? "1 MINUTE"
                : `${displayDelayMinutes} MINUTES`
            }
          } : {})
        };
      });
      return {
        ...timeline,
        context: cancelledContext(resolved) ?? timeline.context,
        entries
      };
    }

    function calculateProgress(event, now) {
      return base.calculateProgress(effectiveEvent(event), now);
    }

    function sortEvents(events) {
      return base.sortEvents((Array.isArray(events) ? events : []).map(effectiveEvent));
    }

    return {
      ...base,
      buildDailySchedule,
      calculateProgress,
      resolveScheduleState,
      sortEvents,
      operationalMode,
      bestDeparture,
      bestArrival
    };
  }
);
