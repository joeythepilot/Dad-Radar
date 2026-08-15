const assert = require("node:assert/strict");

const {
  createPosterImageLoader,
  posterAssetUrl
} = require("./poster-image-loader");

function testPosterAssetUrl() {
  assert.equal(
    posterAssetUrl(
      "./assets/poster.png",
      {
        version: "ipad-poster-2"
      }
    ),
    "./assets/poster.png?v=ipad-poster-2"
  );

  assert.equal(
    posterAssetUrl(
      "./assets/poster.png?size=full",
      {
        version: "ipad-poster-2",
        attempt: 1,
        nonce: 42
      }
    ),
    "./assets/poster.png?size=full&v=ipad-poster-2&retry=42-1"
  );
}

function createHarness() {
  const images = [];
  const timers = [];
  const loaded = [];
  const failed = [];

  const loader =
    createPosterImageLoader({
      version: "ipad-poster-2",
      nonce: () => 99,
      createImage() {
        const image = {};
        images.push(image);
        return image;
      },
      setTimer(callback, delay) {
        const timer = {
          callback,
          delay,
          cancelled: false
        };

        timers.push(timer);
        return timer;
      },
      clearTimer(timer) {
        timer.cancelled = true;
      }
    });

  return {
    failed,
    images,
    loaded,
    loader,
    timers,
    callbacks: {
      onLoad(result) {
        loaded.push(result);
      },
      onError(result) {
        failed.push(result);
      }
    }
  };
}

function testFailedPosterRetriesWithFreshUrls() {
  const harness = createHarness();

  harness.loader.load(
    "./assets/ord.png",
    harness.callbacks
  );

  assert.equal(
    harness.images[0].src,
    "./assets/ord.png?v=ipad-poster-2"
  );

  harness.images[0].onerror();

  assert.equal(
    harness.timers[0].delay,
    1200
  );

  harness.timers[0].callback();

  assert.equal(
    harness.images[1].src,
    "./assets/ord.png?v=ipad-poster-2&retry=99-1"
  );

  harness.images[1].onerror();

  assert.equal(
    harness.timers[1].delay,
    4000
  );

  harness.timers[1].callback();

  assert.equal(
    harness.images[2].src,
    "./assets/ord.png?v=ipad-poster-2&retry=99-2"
  );

  harness.images[2].onload();

  assert.equal(harness.failed.length, 0);
  assert.equal(harness.loaded.length, 1);
  assert.equal(
    harness.loaded[0].attempt,
    2
  );
}

function testNewPosterCancelsOldRequest() {
  const harness = createHarness();

  harness.loader.load(
    "./assets/ord.png",
    harness.callbacks
  );

  const oldImage = harness.images[0];

  harness.loader.load(
    "./assets/hpn.png",
    harness.callbacks
  );

  oldImage.onload();

  assert.equal(
    harness.loaded.length,
    0,
    "A late image event from the previous destination must be ignored."
  );

  harness.images[1].onload();

  assert.equal(harness.loaded.length, 1);
  assert.match(
    harness.loaded[0].source,
    /hpn\.png/
  );
}

function testFinalFailureUsesFallback() {
  const harness = createHarness();

  harness.loader.load(
    "./assets/ord.png",
    harness.callbacks
  );

  harness.images[0].onerror();
  harness.timers[0].callback();
  harness.images[1].onerror();
  harness.timers[1].callback();
  harness.images[2].onerror();

  assert.equal(harness.loaded.length, 0);
  assert.equal(harness.failed.length, 1);
  assert.equal(
    harness.failed[0].attempts,
    3
  );
}

function runTests() {
  testPosterAssetUrl();
  testFailedPosterRetriesWithFreshUrls();
  testNewPosterCancelsOldRequest();
  testFinalFailureUsesFallback();

  console.log(
    "Poster image loader tests passed."
  );
}

runTests();
