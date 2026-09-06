"use strict";

const assert = require("node:assert/strict");

const {
  getFlightTrack,
  normalizeTrackPoint
} = require("./fr24-flight-track-service");

assert.deepEqual(
  normalizeTrackPoint({
    lat: 35.595,
    lon: -82.551,
    alt: 12500,
    timestamp: "2026-09-06T18:00:00Z"
  }),
  {
    latitude: 35.595,
    longitude: -82.551,
    altitudeFeet: 12500,
    recordedAt: "2026-09-06T18:00:00Z"
  }
);

const requestedUrls = [];

async function fakeFetch(url) {
  requestedUrls.push(String(url));

  return {
    ok: true,
    status: 200,
    async json() {
      return [
        {
          fr24_id: "track123",
          tracks: [
            {
              lat: 33.4342,
              lon: -112.0116,
              alt: 1200,
              timestamp:
                "2026-09-06T16:00:00Z"
            },
            {
              lat: 34.2,
              lon: -110.4,
              alt: 18000,
              timestamp:
                "2026-09-06T16:20:00Z"
            }
          ]
        }
      ];
    }
  };
}

(async () => {
  const track = await getFlightTrack(
    "track123",
    {
      apiToken: "test-token",
      baseUrl:
        "https://example.test/api",
      fetchImpl: fakeFetch
    }
  );

  assert.equal(track.length, 2);
  assert.equal(
    track[1].altitudeFeet,
    18000
  );

  const requestedUrl = new URL(
    requestedUrls[0]
  );

  assert.equal(
    requestedUrl.pathname,
    "/api/flight-tracks"
  );
  assert.equal(
    requestedUrl.searchParams.get(
      "flight_id"
    ),
    "track123"
  );

  console.log(
    "FR24 flight track service tests passed."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});