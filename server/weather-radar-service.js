"use strict";

const NOAA_RADAR_WMS_URL =
  "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows";
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

class WeatherRadarRequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "WeatherRadarRequestError";
    this.status = status;
  }
}

function normalizeRequest(query = {}) {
  const bbox = String(query.bbox ?? "-135,5,-55,62")
    .split(",")
    .map(Number);
  if (bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    throw new TypeError("A valid four-number radar bbox is required.");
  }

  const width = Math.max(320, Math.min(Number(query.width) || 1080, 1600));
  const height = Math.max(180, Math.min(Number(query.height) || 560, 1000));
  return { bbox, width: Math.round(width), height: Math.round(height) };
}

function buildRadarUrl(request, options = {}) {
  const url = new URL(options.baseUrl ?? process.env.NOAA_RADAR_WMS_URL ?? NOAA_RADAR_WMS_URL);
  const parameters = {
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    layers: options.layer ?? process.env.NOAA_RADAR_LAYER ?? "conus_bref_qcd",
    styles: "",
    format: "image/png",
    transparent: "true",
    srs: "EPSG:4326",
    bbox: request.bbox.join(","),
    width: request.width,
    height: request.height
  };
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function getRadarImage(query, options = {}) {
  const request = normalizeRequest(query);
  const url = buildRadarUrl(request, options);
  const cacheKey = url.toString();
  const cached = (options.cache ?? cache).get(cacheKey);
  const now = options.now ?? Date.now();
  if (cached && now - cached.storedAt < (options.cacheMs ?? CACHE_MS)) {
    return { ...cached, cached: true };
  }

  const response = await (options.fetchImpl ?? fetch)(url, {
    headers: { Accept: "image/png" }
  });
  if (!response.ok) {
    throw new WeatherRadarRequestError(`NOAA radar returned status ${response.status}.`, response.status);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("image/png")) {
    throw new WeatherRadarRequestError("NOAA radar did not return a PNG image.");
  }

  const result = {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: "image/png",
    storedAt: now,
    cached: false
  };
  (options.cache ?? cache).set(cacheKey, result);
  return result;
}

module.exports = {
  NOAA_RADAR_WMS_URL,
  WeatherRadarRequestError,
  buildRadarUrl,
  getRadarImage,
  normalizeRequest
};
