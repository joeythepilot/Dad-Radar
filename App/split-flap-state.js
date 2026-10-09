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

    // Only scheduled metadata. Never derive a passenger brand from liveIdent,
    // number or ADS-B callsigns: regional operators can fly several brands.
    function airlineBrandForState(state = {}) {
      const flight = state.flight;
      if (!flight) return null;
      const scheduledCarrier = Object.prototype.hasOwnProperty.call(flight, "scheduledCarrierCode")
        ? flight.scheduledCarrierCode : flight.carrierCode;
      const code = String(flight.marketingCarrierCode ?? scheduledCarrier ?? '').trim().toUpperCase();
      return ({AA:'american',AAL:'american',MQ:'american',ENY:'american',
        UA:'united',UAL:'united',DL:'delta',DAL:'delta',WN:'southwest',SWA:'southwest',
        B6:'jetblue',JBU:'jetblue',AS:'alaska',ASA:'alaska',G4:'allegiant',AAY:'allegiant'})[code] ?? null;
    }

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
        LANDING: "LANDING",
        "NO TRACK": "NO TRACK",
        DIVERTED: "DIVERTED",
        LANDED: "LANDED",
        CANCELLED: "CANCELED",
        ARRIVED: "ARRIVED",
        "AT BASE": "AT BASE",
        LAYOVER: "LAYOVER",
        "COMMUTING HOME": "TO HOME",
        OFFLINE: "OFFLINE",
        "CAL AUTH": "CAL AUTH"
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
      airlineBrandForState,
      fieldsForState,
      formatAirport,
      formatFlightNumber,
      formatStatus
    });
  }
);
