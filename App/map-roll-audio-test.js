"use strict";

const assert = require("node:assert/strict");
const audioApi = require("./map-roll-audio");

let played = 0;
let paused = 0;
let currentTime = 99;
let volume = 0;
const fakeAudio = {
  preload: "",
  paused: true,
  play() { played += 1; this.paused = false; return Promise.resolve(); },
  pause() { paused += 1; this.paused = true; },
  get currentTime() { return currentTime; },
  set currentTime(value) { currentTime = value; },
  get volume() { return volume; },
  set volume(value) { volume = value; }
};

(async () => {
  const controller = audioApi.createController({
    source: "/test.b64",
    volume: 0.5,
    audioFactory: () => fakeAudio,
    fetch: async () => ({ok: true, text: async () => "AA=="}),
    atob: () => "\0",
    Blob: class FakeBlob {},
    URL: {
      createObjectURL: () => "blob:test",
      revokeObjectURL() {}
    },
    AudioContext: null
  });

  assert.equal(await controller.unlock(), true);
  assert.equal(await controller.playMotor(), true);
  assert.equal(played, 2);
  assert.ok(paused >= 2);
  assert.equal(currentTime, 0);
  assert.equal(volume, 0.5);
  assert.equal(controller.playRegisterClack(), false);
  assert.equal(controller.playDetentClack(), false);

  controller.stopMotor();
  assert.equal(fakeAudio.paused, true);
  controller.destroy();
  assert.equal(audioApi.MOTOR_CUTOFF_MS, 2480);
  console.log("Map roll audio tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
