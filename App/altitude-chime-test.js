const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  createAltitudeChimeController
} = require("./altitude-chime");

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

async function runTests() {
  const audioAsset = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "assets",
      "audio",
      "ten-thousand-foot-chime.mp3"
    )
  );

  assert.ok(audioAsset.length > 50000);
  assert.equal(audioAsset[0], 0xff);
  assert.equal(
    audioAsset[1] & 0xe0,
    0xe0,
    "The packaged chime should begin with an MP3 frame header."
  );

  const audio = fakeAudio();
  const controller =
    createAltitudeChimeController({
      source: "./assets/audio/ten-thousand-foot-chime.mp3",
      volume: 0.62,
      audioFactory: () => audio
    });

  assert.equal(
    controller.observe("flight-1", 8000),
    null
  );
  assert.equal(
    controller.observe("flight-1", 10600),
    "climb"
  );
  assert.equal(
    controller.observe("flight-1", 9900),
    null,
    "Climb chime must not retrigger after normal altitude jitter."
  );
  assert.equal(
    controller.observe("flight-1", 10100),
    null
  );
  assert.equal(
    controller.observe("flight-1", 11000),
    null
  );
  assert.equal(
    controller.observe("flight-1", 9400),
    "descent"
  );
  assert.equal(
    controller.observe("flight-1", 10100),
    null,
    "Descent chime must play only once per flight."
  );

  await Promise.resolve();
  assert.equal(audio.playCount, 2);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.volume, 0.62);
  assert.equal(audio.preload, "auto");

  assert.equal(
    controller.observe("flight-2", 11000),
    null,
    "A new flight initializes its altitude baseline without a false chime."
  );
  assert.equal(
    controller.observe("flight-2", 9000),
    "descent"
  );

  console.log("10,000-foot chime tests passed.");
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
