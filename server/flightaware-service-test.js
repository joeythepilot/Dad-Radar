const assert = require("node:assert/strict");

const {
  FlightAwareConfigurationError,
  getLiveFlightSnapshot,
  normalizeFlightSnapshot,
  normalizePosition,
  prioritizeLookupCandidates,
  selectBestFlight
} = require("./flightaware-service");

const SCHEDULED_START =
  "2026-08-04T14:00:00.000Z";

function createLookup(overrides = {}) {
  return {
    liveLookupCandidates: [
      "AA4140",
      "MQ4140",
      "ENY4140"
    ],
    origin: "ORD",
    destination: "AVP",
    startUtc: SCHEDULED_START,
    ...overrides
  };
}

function createFlight(overrides = {}) {
  return {
    ident: "ENY4140",
    ident_icao: "ENY4140",
    ident_iata: "MQ4140",
    fa_flight_id:
      "ENY4140-1754290000-airline-0001",
    origin: {
      code: "KORD",
      code_iata: "ORD",
      terminal: "3"
    },
    destination: {
      code: "KAVP",
      code_iata: "AVP",
      terminal: null
    },
    scheduled_out:
      SCHEDULED_START,
    estimated_out:
      "2026-08-04T14:12:00.000Z",
    actual_out:
      "2026-08-04T14:14:00.000Z",
    actual_off:
      "2026-08-04T14:27:00.000Z",
    scheduled_in:
      "2026-08-04T16:00:00.000Z",
    estimated_in:
      "2026-08-04T16:18:00.000Z",
    actual_on: null,
    actual_in: null,
    progress_percent: 72,
    gate_origin: "L10A",
    gate_destination: "4",
    status: "En Route / Delayed",
    cancelled: false,
    diverted: false,
    registration: "N123HQ",
    aircraft_type: "E75L",
    ...overrides
  };
}

function jsonResponse(body, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json"
      }
    }
  );
}

function testIcaoCandidatesArePrioritized() {
  assert.deepEqual(
    prioritizeLookupCandidates([
      "AA4140",
      "MQ4140",
      "ENY4140"
    ]),
    [
      "ENY4140",
      "AAL4140",
      "AA4140",
      "MQ4140"
    ]
  );

  assert.deepEqual(
    prioritizeLookupCandidates([
      "UA1234"
    ]),
    ["UAL1234", "UA1234"]
  );
}

function testBestFlightUsesRouteAndTime() {
  const lookup = createLookup();

  const result = selectBestFlight(
    [
      createFlight({
        fa_flight_id: "wrong-route",
        destination: {
          code_iata: "GSP"
        }
      }),
      createFlight({
        fa_flight_id: "far-away",
        scheduled_out:
          "2026-08-04T19:30:00.000Z"
      }),
      createFlight({
        fa_flight_id: "best-match",
        scheduled_out:
          "2026-08-04T14:08:00.000Z"
      })
    ],
    {
      ...lookup,
      startUtc:
        new Date(lookup.startUtc)
    }
  );

  assert.equal(
    result.fa_flight_id,
    "best-match"
  );
}

function testSnapshotNormalization() {
  const snapshot =
    normalizeFlightSnapshot(
      createFlight(),
      "ENY4140",
      {
        last_position: {
          latitude: 40.4,
          longitude: -79.7,
          altitude: 85,
          altitude_change: "D",
          groundspeed: 248,
          heading: 106,
          timestamp:
            "2026-08-04T15:32:00.000Z",
          update_type: "A"
        }
      },
      "2026-08-04T15:32:05.000Z"
    );

  assert.equal(
    snapshot.provider,
    "flightaware"
  );
  assert.equal(snapshot.phase, "APPROACH");
  assert.equal(snapshot.origin, "ORD");
  assert.equal(
    snapshot.destination,
    "AVP"
  );
  assert.equal(
    snapshot.progressPercent,
    72
  );
  assert.equal(
    snapshot.aircraft.registration,
    "N123HQ"
  );
  assert.equal(
    snapshot.departure.delayMinutes,
    14
  );
  assert.equal(
    snapshot.arrival.delayMinutes,
    18
  );
  assert.equal(
    snapshot.position.altitudeFeet,
    8500
  );
  assert.equal(
    snapshot.position.groundSpeedKnots,
    248
  );
  assert.equal(
    snapshot.position.headingDegrees,
    106
  );
}

function testMissingNumbersStayNull() {
  const position = normalizePosition({
    latitude: null,
    longitude: undefined,
    altitude: null,
    groundspeed: null,
    heading: null
  });

  assert.equal(position.latitude, null);
  assert.equal(position.longitude, null);
  assert.equal(
    position.altitudeFeet,
    null
  );
  assert.equal(
    position.groundSpeedKnots,
    null
  );
  assert.equal(
    position.headingDegrees,
    null
  );
}

async function testLiveLookupAndPosition() {
  const requests = [];

  async function fakeFetch(url, options) {
    requests.push({
      url: String(url),
      options
    });

    if (
      String(url).includes("/position")
    ) {
      return jsonResponse({
        last_position: {
          latitude: 41.1,
          longitude: -78.2,
          altitude: 210,
          altitude_change: "-",
          groundspeed: 410,
          heading: 95,
          timestamp:
            "2026-08-04T15:10:00.000Z",
          update_type: "A"
        }
      });
    }

    return jsonResponse({
      flights: [createFlight()]
    });
  }

  const snapshot =
    await getLiveFlightSnapshot(
      createLookup(),
      {
        apiKey: "test-key",
        fetchImpl: fakeFetch
      }
    );

  assert.equal(requests.length, 2);
  assert.match(
    requests[0].url,
    /\/aeroapi\/flights\/ENY4140/
  );
  assert.match(
    requests[0].url,
    /ident_type=designator/
  );
  assert.equal(
    requests[0].options.headers[
      "x-apikey"
    ],
    "test-key"
  );
  assert.match(
    requests[1].url,
    /\/position$/
  );
  assert.equal(
    snapshot.providerFlightId,
    createFlight().fa_flight_id
  );
  assert.equal(snapshot.phase, "EN_ROUTE");
  assert.equal(
    snapshot.position.altitudeFeet,
    21000
  );
}

async function testMissingCandidateReturnsNull() {
  let requestCount = 0;

  const result =
    await getLiveFlightSnapshot(
      createLookup({
        liveLookupCandidates: [
          "ENY9999"
        ]
      }),
      {
        apiKey: "test-key",
        fetchImpl: async () => {
          requestCount += 1;
          return jsonResponse(
            { title: "Not Found" },
            404
          );
        }
      }
    );

  assert.equal(result, null);
  assert.equal(requestCount, 1);
}

async function testMissingApiKeyIsExplicit() {
  await assert.rejects(
    () =>
      getLiveFlightSnapshot(
        createLookup(),
        { apiKey: "" }
      ),
    FlightAwareConfigurationError
  );
}

async function runTests() {
  testIcaoCandidatesArePrioritized();
  testBestFlightUsesRouteAndTime();
  testSnapshotNormalization();
  testMissingNumbersStayNull();
  await testLiveLookupAndPosition();
  await testMissingCandidateReturnsNull();
  await testMissingApiKeyIsExplicit();

  console.log(
    "FlightAware service tests passed."
  );
}

runTests();
