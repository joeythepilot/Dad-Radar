const assert = require("node:assert/strict");

const {
  Flightradar24ConfigurationError,
  determinePhase,
  getLiveFlightSnapshot,
  normalizeFlightSnapshot,
  normalizeLookup,
  normalizePosition,
  selectBestFlight
} = require("./flightradar24-service");

const START_UTC =
  "2026-08-04T17:00:00.000Z";

function lookup(overrides = {}) {
  return {
    liveLookupCandidates: [
      "AA3429",
      "MQ3429",
      "ENY3429"
    ],
    origin: "DFW",
    destination: "BIL",
    startUtc: START_UTC,
    ...overrides
  };
}

function liveRecord(overrides = {}) {
  return {
    fr24_id: "3abc1234",
    flight: "AA3429",
    callsign: "ENY3429",
    lat: 39.8,
    lon: -103.4,
    track: 324,
    alt: 34000,
    gspeed: 431,
    vspeed: 0,
    timestamp:
      "2026-08-04T17:59:30.000Z",
    source: "ADSB",
    type: "E75L",
    reg: "N234XY",
    operating_as: "ENY",
    painted_as: "AAL",
    orig_iata: "DFW",
    orig_icao: "KDFW",
    dest_iata: "BIL",
    dest_icao: "KBIL",
    eta: "2026-08-04T19:15:00.000Z",
    ...overrides
  };
}

function jsonResponse(
  body,
  status = 200
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

function testLookupSeparatesCommercialAndCallsigns() {
  const normalized = normalizeLookup(
    lookup()
  );

  assert.deepEqual(
    normalized.flights,
    ["AA3429", "MQ3429"]
  );

  assert.deepEqual(
    normalized.callsigns,
    ["AAL3429", "ENY3429"]
  );
}

function testPositionUsesNativeFr24Units() {
  assert.deepEqual(
    normalizePosition(
      liveRecord({ vspeed: -850 })
    ),
    {
      latitude: 39.8,
      longitude: -103.4,
      altitudeFeet: 34000,
      altitudeTrend: "D",
      verticalSpeedFeetPerMinute: -850,
      groundSpeedKnots: 431,
      headingDegrees: 324,
      recordedAt:
        "2026-08-04T17:59:30.000Z",
      updateType: "ADSB"
    }
  );
}

function testSnapshotNormalizesFullRecord() {
  const normalizedLookup =
    normalizeLookup(lookup());

  const snapshot =
    normalizeFlightSnapshot(
      liveRecord(),
      normalizedLookup,
      "2026-08-04T18:00:00.000Z"
    );

  assert.equal(
    snapshot.provider,
    "flightradar24"
  );
  assert.equal(
    snapshot.providerFlightId,
    "3abc1234"
  );
  assert.equal(snapshot.ident, "ENY3429");
  assert.equal(
    snapshot.displayIdent,
    "AA3429"
  );
  assert.equal(snapshot.origin, "DFW");
  assert.equal(snapshot.destination, "BIL");
  assert.equal(snapshot.phase, "EN_ROUTE");
  assert.equal(snapshot.position.altitudeFeet, 34000);
  assert.equal(snapshot.position.groundSpeedKnots, 431);
  assert.equal(
    snapshot.arrival.best,
    "2026-08-04T19:15:00.000Z"
  );
  assert.equal(snapshot.filedRoute, null);
  assert.ok(
    snapshot.progressPercent > 20 &&
    snapshot.progressPercent < 90
  );
}

function testTelemetryDrivesSurfacePhases() {
  assert.equal(
    determinePhase(
      {
        altitudeFeet: 3700,
        groundSpeedKnots: 210,
        verticalSpeedFeetPerMinute: -700
      },
      {
        progressPercent: 90,
        distanceFromOrigin: 450,
        distanceToDestination: 32
      }
    ),
    "APPROACH"
  );

  assert.equal(
    determinePhase(
      {
        altitudeFeet: 650,
        groundSpeedKnots: 24,
        verticalSpeedFeetPerMinute: 0
      },
      {
        progressPercent: 1,
        distanceFromOrigin: 1.2,
        distanceToDestination: 470
      }
    ),
    "TAXI_OUT"
  );

  assert.equal(
    determinePhase(
      {
        altitudeFeet: 650,
        groundSpeedKnots: 0,
        verticalSpeedFeetPerMinute: 0
      },
      {
        progressPercent: 0,
        distanceFromOrigin: 0.4,
        distanceToDestination: 470
      }
    ),
    "BOARDING"
  );

  assert.equal(
    determinePhase(
      {
        altitudeFeet: 3600,
        groundSpeedKnots: 32,
        verticalSpeedFeetPerMinute: 0
      },
      {
        progressPercent: 100,
        distanceFromOrigin: 470,
        distanceToDestination: 1.1
      }
    ),
    "ARRIVED"
  );
}

function testLowSlowDepartureIsNotApproach() {
  assert.equal(
    determinePhase(
      {
        altitudeFeet: 205,
        groundSpeedKnots: 60,
        verticalSpeedFeetPerMinute: 0
      },
      {
        progressPercent: 1,
        distanceFromOrigin: 3.4,
        distanceToDestination: 520
      }
    ),
    "TAXI_OUT",
    "Low speed and altitude near the origin must not resemble an arrival."
  );
}

function testExactProviderIdWins() {
  const normalizedLookup =
    normalizeLookup(
      lookup({
        providerFlightId: "wanted"
      })
    );

  const selected = selectBestFlight(
    [
      liveRecord({
        fr24_id: "other"
      }),
      liveRecord({
        fr24_id: "wanted"
      })
    ],
    normalizedLookup
  );

  assert.equal(selected.fr24_id, "wanted");
}

async function testLiveLookupUsesOfficialFullEndpoint() {
  const requests = [];

  const snapshot =
    await getLiveFlightSnapshot(
      lookup(),
      {
        apiToken: "test-token",
        async fetchImpl(url, options) {
          requests.push({
            url: String(url),
            options
          });

          return jsonResponse({
            data: [liveRecord()]
          });
        }
      }
    );

  assert.equal(requests.length, 1);
  assert.match(
    requests[0].url,
    /\/api\/live\/flight-positions\/full/
  );
  assert.match(
    requests[0].url,
    /callsigns=AAL3429%2CENY3429/
  );
  assert.equal(
    requests[0].options.headers
      .Authorization,
    "Bearer test-token"
  );
  assert.equal(
    requests[0].options.headers[
      "Accept-Version"
    ],
    "v1"
  );
  assert.equal(
    snapshot.providerFlightId,
    "3abc1234"
  );
}

async function testCommercialFlightFallback() {
  const requests = [];

  const snapshot =
    await getLiveFlightSnapshot(
      lookup(),
      {
        apiToken: "test-token",
        async fetchImpl(url) {
          requests.push(String(url));

          return requests.length === 1
            ? jsonResponse(
                { message: "Not found" },
                404
              )
            : jsonResponse({
                data: [liveRecord()]
              });
        }
      }
    );

  assert.equal(requests.length, 2);
  assert.match(
    requests[1],
    /flights=AA3429%2CMQ3429/
  );
  assert.equal(snapshot.displayIdent, "AA3429");
}

async function testContinuingFlightUsesLightTelemetry() {
  const metadataCache = new Map([
    [
      "3abc1234",
      {
        ...liveRecord(),
        lat: undefined,
        lon: undefined,
        alt: undefined,
        gspeed: undefined,
        track: undefined,
        vspeed: undefined
      }
    ]
  ]);

  let requestedUrl = null;

  const snapshot =
    await getLiveFlightSnapshot(
      lookup({
        providerFlightId: "3abc1234"
      }),
      {
        apiToken: "test-token",
        metadataCache,
        async fetchImpl(url) {
          requestedUrl = String(url);

          return jsonResponse({
            data: [
              {
                fr24_id: "3abc1234",
                hex: "a12345",
                callsign: "ENY3429",
                lat: 40.2,
                lon: -104.1,
                track: 326,
                alt: 33100,
                gspeed: 423,
                vspeed: -500,
                timestamp:
                  "2026-08-04T18:00:30.000Z",
                source: "ADSB"
              }
            ]
          });
        }
      }
    );

  assert.match(
    requestedUrl,
    /\/live\/flight-positions\/light/
  );
  assert.equal(
    snapshot.displayIdent,
    "AA3429"
  );
  assert.equal(snapshot.origin, "DFW");
  assert.equal(snapshot.destination, "BIL");
  assert.equal(snapshot.position.altitudeFeet, 33100);
  assert.equal(snapshot.position.altitudeTrend, "D");
}

async function testMissingTokenIsExplicit() {
  await assert.rejects(
    () =>
      getLiveFlightSnapshot(
        lookup(),
        { apiToken: "" }
      ),
    Flightradar24ConfigurationError
  );
}

async function run() {
  testLookupSeparatesCommercialAndCallsigns();
  testPositionUsesNativeFr24Units();
  testSnapshotNormalizesFullRecord();
  testTelemetryDrivesSurfacePhases();
  testLowSlowDepartureIsNotApproach();
  testExactProviderIdWins();
  await testLiveLookupUsesOfficialFullEndpoint();
  await testCommercialFlightFallback();
  await testContinuingFlightUsesLightTelemetry();
  await testMissingTokenIsExplicit();

  console.log(
    "Flightradar24 service tests passed."
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
