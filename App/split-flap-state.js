(function initializeSplitFlapState(root, factory) {
  "use strict";

  const api = factory();

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarSplitFlapState =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createSplitFlapState() {
    const STATUS_FLAP_COUNT = 8;

    function fixedWidth(
      value,
      characterCount
    ) {
      return String(value ?? "")
        .toUpperCase()
        .slice(0, characterCount)
        .padEnd(characterCount, " ");
    }

    function formatFlightNumber(
      rawFlightNumber
    ) {
      const flightText = String(
        rawFlightNumber ?? ""
      )
        .toUpperCase()
        .trim();

      const numberMatch =
        flightText.match(/(\d{1,4})$/);

      if (numberMatch) {
        return numberMatch[1]
          .padStart(4, "0");
      }

      return flightText
        .replace(/\s+/g, "")
        .slice(-4)
        .padStart(4, " ");
    }

    function formatAirport(value) {
      const code = String(value ?? "")
        .trim()
        .toUpperCase();

      return fixedWidth(
        /^[A-Z0-9]{3}$/.test(code)
          ? code
          : "",
        3
      );
    }

    function formatStatus(status) {
      const statusLabels = {
        HOME: "HOME",
        "LOCATION UNKNOWN": "LOC UNKN",
        "COMMUTING TO BASE": "TO BASE",
        BOARDING: "BOARDING",
        DELAYED: "DELAYED",
        DEADHEAD: "DEADHEAD",
        "TAXI OUT": "TAXI OUT",
        "EN ROUTE": "EN ROUTE",
        APPROACH: "APPROACH",
        DIVERTED: "DIVERTED",
        LANDED: "LANDED",
        CANCELLED: "CANCELED",
        ARRIVED: "ARRIVED",
        LAYOVER: "LAYOVER",
        "COMMUTING HOME": "TO HOME",
        OFFLINE: "OFFLINE"
      };

      const normalizedStatus = String(
        status ?? "OFFLINE"
      )
        .toUpperCase()
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return fixedWidth(
        statusLabels[normalizedStatus] ??
          normalizedStatus,
        STATUS_FLAP_COUNT
      );
    }

    function fieldsForState(state = {}) {
      const flight = state.flight ?? null;

      if (flight) {
        return Object.freeze({
          flightNumber:
            formatFlightNumber(
              flight.number
            ),
          origin:
            formatAirport(flight.origin),
          destination:
            formatAirport(
              flight.destination
            ),
          status:
            formatStatus(state.status)
        });
      }

      return Object.freeze({
        flightNumber: "    ",
        origin: "   ",
        destination:
          formatAirport(
            state.locationAirport
          ),
        status:
          formatStatus(state.status)
      });
    }

    return Object.freeze({
      STATUS_FLAP_COUNT,
      fieldsForState,
      formatAirport,
      formatFlightNumber,
      formatStatus
    });
  }
);
