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

  const gradualAudio = fakeAudio();
  const gradualController =
    createAltitudeChimeController({
      audioFactory: () => gradualAudio
    });

  assert.equal(
    gradualController.observe("flight-3", 8000),
    null
  );
  assert.equal(
    gradualController.observe("flight-3", 9700),
    null
  );
  assert.equal(
    gradualController.observe("flight-3", 10100),
    null
  );
  assert.equal(
    gradualController.observe("flight-3", 10600),
    "climb",
    "A gradual climb through the hysteresis band must still chime."
  );
  assert.equal(
    gradualController.observe("flight-3", 10300),
    null
  );
  assert.equal(
    gradualController.observe("flight-3", 9900),
    null
  );
  assert.equal(
    gradualController.observe("flight-3", 9400),
    "descent",
    "A gradual descent through the hysteresis band must still chime."
  );

  await Promise.resolve();
  assert.equal(gradualAudio.playCount, 2);

  // Exercise the real dashboard adapter, where provider display names enter.
  const vm = require('node:vm');
  const main = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const adapter = main.slice(main.indexOf('function observeAltitudeChime('), main.indexOf('\nwindow.addEventListener(', main.indexOf('function observeAltitudeChime(')));
  const shortAudio = fakeAudio();
  const context = {altitudeChimeController:createAltitudeChimeController({audioFactory:()=>shortAudio}),reportClientDiagnostic(){}};
  vm.createContext(context);
  vm.runInContext(adapter, context);
  const sample = (altitude,number,eventId='short-leg') => context.observeAltitudeChime({liveData:true,eventId,flight:{number,origin:'SPI',destination:'ORD',altitude}});
  sample(8000,'3637');
  sample(10600,'ENY3637');
  sample(14000,'ENY3637');
  sample(9400,'AA3637');
  await Promise.resolve();
  assert.equal(shortAudio.playCount,2,'A 14,000-foot flight chimes in both directions despite provider flight-number changes');
  sample(8000,'3637','next-leg');sample(10600,'3637','next-leg');
  assert.equal(shortAudio.playCount,3,'A distinct scheduled leg rearms the chime');

  let now=0, failures=1;
  const retryAudio=fakeAudio();
  retryAudio.play=function(){this.playCount++;return failures-- > 0 ? Promise.reject(new Error('temporary playback failure')) : Promise.resolve();};
  const retry=createAltitudeChimeController({audioFactory:()=>retryAudio,now:()=>now});
  retry.observe('retry-leg',8000);retry.observe('retry-leg',10600);
  retry.observe('retry-leg',11000);
  assert.equal(retryAudio.playCount,1,'Duplicate updates cannot interrupt pending playback');
  await new Promise(resolve=>setImmediate(resolve));
  now=1000;retry.observe('retry-leg',12000);
  assert.equal(retryAudio.playCount,1,'Failed playback has a retry cooldown');
  now=5000;retry.observe('retry-leg',14000);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(retryAudio.playCount,2,'A failed chime gets a fresh playback attempt');
  now=10000;retry.observe('retry-leg',14000);
  assert.equal(retryAudio.playCount,2,'Successful playback is never repeated');
  retry.observe('retry-leg',9400);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(retryAudio.playCount,3,'Descent still has its own chime after a climb retry');

  const blockedAudio=fakeAudio();
  blockedAudio.play=function(){this.playCount++;return Promise.reject(new Error('blocked'));};
  now=0;
  const blocked=createAltitudeChimeController({audioFactory:()=>blockedAudio,now:()=>now});
  blocked.observe('blocked',8000);
  for (const time of [0,5000,10000,15000]) {
    now=time;blocked.observe('blocked',14000);
    await new Promise(resolve=>setImmediate(resolve));
  }
  assert.equal(blockedAudio.playCount,3,'Persistent playback failure cannot cause endless retries');
  now=20000;blocked.observe('expired',8000);blocked.observe('expired',14000);
  await new Promise(resolve=>setImmediate(resolve));
  now=51000;blocked.observe('expired',14000);
  assert.equal(blockedAudio.playCount,4,'An old missed crossing is not played after its retry window');

  let rejectOld;
  const delayedAudio=fakeAudio();
  delayedAudio.play=function(){this.playCount++;return this.playCount===1 ? new Promise((_,reject)=>{rejectOld=reject;}) : Promise.resolve();};
  const delayed=createAltitudeChimeController({audioFactory:()=>delayedAudio});
  delayed.observe('old-leg',8000);delayed.observe('old-leg',10600);
  delayed.observe('new-leg',8000);delayed.observe('new-leg',10600);
  rejectOld(new Error('late old-leg failure'));
  await new Promise(resolve=>setImmediate(resolve));
  delayed.observe('new-leg',14000);
  assert.equal(delayedAudio.playCount,2,'An old playback failure cannot rearm the new leg');

  console.log("10,000-foot chime tests passed.");
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
