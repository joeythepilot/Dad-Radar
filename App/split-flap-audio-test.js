const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  createSplitFlapAudioController
} = require("./split-flap-audio");

function fakeAudio() {
  return {
    currentTime: 0,
    paused: true,
    playCount: 0,
    preload: "",
    volume: 1,
    pause() {
      this.paused = true;
    },
    play() {
      this.paused = false;
      this.playCount += 1;
      return Promise.resolve();
    }
  };
}

async function testStartsAtRequestedCue() {
  const audio = fakeAudio();

  const controller =
    createSplitFlapAudioController({
      source:
        "./assets/audio/split-flap.mp3",
      cueSeconds: 5.195,
      volume: 0.6,
      audioFactory: () => audio
    });

  const started =
    await controller.start();

  assert.equal(started, true);
  assert.equal(audio.playCount, 1);
  assert.equal(audio.currentTime, 5.195);
  assert.equal(audio.volume, 0.6);
  assert.equal(audio.preload, "auto");
}

function testConfiguredAudioAssetExists() {
  const asset = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "assets",
      "audio",
      "split-flap.mp3"
    )
  );

  assert.ok(
    asset.length > 100000,
    "The split-flap recording should be packaged with the dashboard."
  );

  assert.equal(
    asset.subarray(0, 3).toString(),
    "ID3",
    "The packaged split-flap recording should be a browser-ready MP3."
  );
}

async function testFadesAfterAnimation() {
  const audio = fakeAudio();
  const frames = [];
  let now = 1000;

  const controller =
    createSplitFlapAudioController({
      cueSeconds: 5.195,
      fadeOutMs: 200,
      volume: 0.8,
      audioFactory: () => audio,
      now: () => now,
      requestFrame: (callback) => {
        frames.push(callback);
        return frames.length;
      },
      cancelFrame() {}
    });

  await controller.start();
  controller.stop();

  assert.equal(frames.length, 1);

  now = 1100;
  frames.shift()(now);

  assert.ok(
    Math.abs(audio.volume - 0.4) <
      0.0001
  );
  assert.equal(audio.paused, false);

  now = 1200;
  frames.shift()(now);

  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 5.195);
  assert.equal(audio.volume, 0.8);
}

async function testSilentGestureUnlock() {
  const audio = fakeAudio();

  const controller =
    createSplitFlapAudioController({
      cueSeconds: 5.195,
      volume: 0.7,
      audioFactory: () => audio
    });

  const unlocked =
    await controller.unlock();

  assert.equal(unlocked, true);
  assert.equal(audio.playCount, 1);
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 5.195);
  assert.equal(audio.volume, 0.7);
}

async function runTests() {
  testConfiguredAudioAssetExists();
  await testStartsAtRequestedCue();
  await testFadesAfterAnimation();
  await testSilentGestureUnlock();

  console.log(
    "Split-flap audio tests passed."
  );
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
