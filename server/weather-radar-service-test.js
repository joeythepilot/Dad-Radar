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
  const concurrent = await Promise.all(Array.from({length: 10}, () => getRadarImage({}, options)));
  const first = concurrent[0];
  const second = await getRadarImage({}, options);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
  assert.throws(() => normalizeRequest({bbox: "-80,40,-90,45"}), TypeError);
  assert.throws(() => normalizeRequest({bbox: "-180,-95,180,95"}), TypeError);
  assert.deepEqual(normalizeRequest({width: 1600, height: 1000}).width, 1600);
  for (let i = 0; i < 20; i++) await getRadarImage({bbox: `${-130+i},30,${-129+i},31`}, options);
  assert.equal(radarCache.size, 16, "Moving the map cannot grow the server image cache without bound");
  let failures = 0;
  const failedOptions = {...options, cache: new Map(), fetchImpl: async () => {
    failures++; throw new Error("Fixture unavailable");
  }};
  await assert.rejects(getRadarImage({}, failedOptions));
  await assert.rejects(getRadarImage({}, failedOptions));
  assert.equal(failures, 2, "A failed request releases the shared pending slot");
  console.log("Weather radar service tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
