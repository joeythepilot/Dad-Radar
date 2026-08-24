"use strict";

const assert = require("node:assert/strict");
const {
  buildRadarUrl,
  getRadarImage,
  normalizeRequest
} = require("./weather-radar-service");

const request = normalizeRequest({ bbox: "-135,5,-55,62", width: "1080", height: "560" });
const url = buildRadarUrl(request, { baseUrl: "https://example.test/wms" });
assert.equal(url.searchParams.get("bbox"), "-135,5,-55,62");
assert.equal(url.searchParams.get("format"), "image/png");

(async () => {
  let calls = 0;
  const radarCache = new Map();
  const options = {
    cache: radarCache,
    now: 1000,
    baseUrl: "https://example.test/wms",
    async fetchImpl() {
      calls += 1;
      return {
        ok: true,
        status: 200,
        headers: { get: () => "image/png" },
        async arrayBuffer() { return Uint8Array.from([137, 80, 78, 71]).buffer; }
      };
    }
  };
  const first = await getRadarImage({}, options);
  const second = await getRadarImage({}, options);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
  console.log("Weather radar service tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
