"use strict";

const {
  FR24_API_BASE_URL,
  Flightradar24ConfigurationError,
  requestFr24
} = require("./flightradar24-service");

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

function normalizeTrackPoint(point) {
  const latitude = finiteNumber(
    point?.lat ?? point?.latitude
  );

  const longitude = finiteNumber(
    point?.lon ?? point?.longitude
  );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    altitudeFeet:
      finiteNumber(
        point?.alt ??
        point?.altitudeFeet
      ),
    recordedAt:
      point?.timestamp ??
      point?.recordedAt ?? null
  };
}

async function getFlightTrack(
  providerFlightId,
  providedOptions = {}
) {
  const flightId = String(
    providerFlightId ?? ""
  ).trim();

  if (!flightId) {
    throw new TypeError(
      "A Flightradar24 flight id is required for track recovery."
    );
  }

  const apiToken =
    providedOptions.apiToken ??
    process.env.FR24_API_TOKEN;

  if (!apiToken) {
    throw new Flightradar24ConfigurationError(
      "FR24_API_TOKEN is not configured."
    );
  }

  const records = await requestFr24(
    "/flight-tracks",
    { flight_id: flightId },
    {
      apiToken,
      baseUrl:
        providedOptions.baseUrl ??
        FR24_API_BASE_URL,
      fetchImpl:
        providedOptions.fetchImpl ?? fetch,
      requestTimeoutMs:
        providedOptions.requestTimeoutMs
    }
  );

  const record = records.find(
    (candidate) =>
      String(
        candidate?.fr24_id ??
        candidate?.flight_id ?? ""
      ) === flightId
  ) ?? records[0] ?? null;

  return (
    Array.isArray(record?.tracks)
      ? record.tracks
      : []
  )
    .map(normalizeTrackPoint)
    .filter(Boolean);
}

module.exports = {
  getFlightTrack,
  normalizeTrackPoint
};