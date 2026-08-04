const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const serviceSource =
  fs.readFileSync(
    path.join(
      __dirname,
      "live-flight-api-service.js"
    ),
    "utf8"
  );

function createContext(fetchImpl) {
  const context = {
    AbortController,
    clearTimeout,
    fetch: fetchImpl,
    setTimeout
  };

  context.window = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(
    serviceSource,
    context,
    {
      filename:
        "services/live-flight-api-service.js"
    }
  );

  return context;
}

async function testPostsProviderNeutralLookup() {
  let request = null;

  const context = createContext(
    async (url, options) => {
      request = { url, options };

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            ok: true,
            liveFlight: {
              provider: "flightradar24",
              phase: "EN_ROUTE"
            }
          };
        }
      };
    }
  );

  const result = await context
    .dadRadarLiveFlightApi
    .getFlightSnapshot({
      origin: "ORD",
      destination: "AVL",
      liveLookupCandidates: [
        "ENY4140",
        "MQ4140"
      ],
      times: {
        startUtc:
          "2026-08-04T17:00:00.000Z"
      }
    }, {
      providerFlightId:
        "ENY4140-1754290000-airline-0001"
    });

  assert.equal(
    request.url,
    "/api/flights/lookup"
  );
  assert.equal(
    request.options.method,
    "POST"
  );

  const body = JSON.parse(
    request.options.body
  );

  assert.deepEqual(
    body.liveLookupCandidates,
    ["ENY4140", "MQ4140"]
  );
  assert.equal(body.origin, "ORD");
  assert.equal(body.destination, "AVL");
  assert.equal(
    body.providerFlightId,
    "ENY4140-1754290000-airline-0001"
  );
  assert.equal(
    result.phase,
    "EN_ROUTE"
  );
}

async function testNoMatchReturnsNull() {
  const context = createContext(
    async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          liveFlight: null
        };
      }
    })
  );

  const result = await context
    .dadRadarLiveFlightApi
    .getFlightSnapshot({
      liveLookupCandidates: [
        "ENY4140"
      ],
      times: {
        startUtc:
          "2026-08-04T17:00:00.000Z"
      }
    });

  assert.equal(result, null);
}

async function testConfigurationErrorIsTagged() {
  const context = createContext(
    async () => ({
      ok: false,
      status: 503,
      async json() {
        return {
          ok: false,
          error:
            "Flightradar24 is not configured."
        };
      }
    })
  );

  await assert.rejects(
    context
      .dadRadarLiveFlightApi
      .getFlightSnapshot({
        liveLookupCandidates: [
          "ENY4140"
        ],
        times: {
          startUtc:
            "2026-08-04T17:00:00.000Z"
        }
      }),
    (error) => {
      assert.equal(
        error.code,
        "not-configured"
      );
      assert.equal(error.status, 503);
      return true;
    }
  );
}

async function runTests() {
  await testPostsProviderNeutralLookup();
  await testNoMatchReturnsNull();
  await testConfigurationErrorIsTagged();

  console.log(
    "Live flight API service tests passed."
  );
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
