(function initializeMapRollAudio(root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.dadRadarMapRollAudio = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function createMapRollAudioApi(root) {
  "use strict";

  const DEFAULT_SOURCE = "/assets/audio/dadradar-map-roll-v3-gearmotor.wav?v=1";
  const DEFAULT_VOLUME = 0.72;

  function createController(options = {}) {
    const source = options.source || DEFAULT_SOURCE;
    const volume = Math.max(0, Math.min(1, Number.isFinite(Number(options.volume)) ? Number(options.volume) : DEFAULT_VOLUME));
    const audioFactory = options.audioFactory || (typeof root?.Audio === "function" ? (src) => new root.Audio(src) : null);
    let audio = null;
    let token = 0;

    function ensure() {
      if (!audio && audioFactory) {
        audio = audioFactory(source);
        audio.preload = "auto";
        audio.volume = volume;
      }
      return audio;
    }

    function reset(instance) {
      if (!instance) return;
      instance.pause();
      try { instance.currentTime = 0; } catch (_) {}
      instance.volume = volume;
    }

    async function play() {
      const instance = ensure();
      if (!instance) return false;
      token += 1;
      const current = token;
      reset(instance);
      try {
        const result = instance.play();
        if (result && typeof result.then === "function") await result;
        if (current !== token) {
          reset(instance);
          return false;
        }
        return true;
      } catch (_) {
        reset(instance);
        return false;
      }
    }

    async function unlock() {
      const instance = ensure();
      if (!instance) return false;
      token += 1;
      reset(instance);
      instance.volume = 0;
      try {
        const result = instance.play();
        if (result && typeof result.then === "function") await result;
        reset(instance);
        return true;
      } catch (_) {
        reset(instance);
        return false;
      }
    }

    function stop() {
      token += 1;
      reset(audio);
    }

    return Object.freeze({play, unlock, stop});
  }

  return Object.freeze({DEFAULT_SOURCE, DEFAULT_VOLUME, createController});
});
