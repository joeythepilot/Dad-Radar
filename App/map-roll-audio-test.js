"use strict";

const assert = require("node:assert/strict");
const audioApi = require("./map-roll-audio");

const created = [];
function makeAudio() {
  let currentTime = 99;
  let volume = 0;
  const audio = {
    preload: "",
    paused: true,
    plays: 0,
    pauses: 0,
    play() { this.plays += 1; this.paused = false; return Promise.resolve(); },
    pause() { this.pauses += 1; this.paused = true; },
    get currentTime() { return currentTime; },
    set currentTime(value) { currentTime = value; },
    get volume() { return volume; },
    set volume(value) { volume = value; }
  };
  created.push(audio);
  return audio;
}

(async () => {
  const timers = [];
  const root = globalThis;
  const originalSetTimeout = root.setTimeout;
  const originalClearTimeout = root.clearTimeout;
  root.setTimeout = (fn, delay) => { timers.push({fn, delay}); return timers.length; };
  root.clearTimeout = () => {};

  try {
    const controller = audioApi.createController({
      volume: 0.5,
      audioFactory: makeAudio,
      fetch: async () => ({ok: true, text: async () => "AA=="}),
      atob: () => "\0",
      Blob: class FakeBlob {},
      URL: {
        createObjectURL: () => `blob:test-${created.length}`,
        revokeObjectURL() {}
      }
    });

    assert.equal(await controller.unlock(), true);
    assert.equal(created.length, 3, "motor/register/detent assets should preload independently");
    assert.equal(await controller.playMotor(), true);
    assert.ok(timers.some(timer => timer.delay === audioApi.MOTOR_CUTOFF_MS));
    assert.equal(await controller.playRegisterClack(), true);
    assert.equal(await controller.playDetentClack(), true);
    assert.ok(created.every(audio => audio.plays >= 2));

    controller.stopMotor();
    assert.equal(created[0].paused, true);
    controller.destroy();
    assert.equal(audioApi.MOTOR_CUTOFF_MS, 2480);
    console.log("Map roll audio tests passed.");
  } finally {
    root.setTimeout = originalSetTimeout;
    root.clearTimeout = originalClearTimeout;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
