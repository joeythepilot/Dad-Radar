(function initializeMapRollAudio(root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.dadRadarMapRollAudio = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function createMapRollAudioApi(root) {
  "use strict";

  const MOTOR_SOURCE = "/assets/audio/dadradar-map-roll-v3-gearmotor.mp3.b64?v=3";
  const REGISTER_SOURCE = "/assets/audio/dadradar-map-roll-register.mp3.b64?v=1";
  const DETENT_SOURCE = "/assets/audio/dadradar-map-roll-detent.mp3.b64?v=1";
  const DEFAULT_VOLUME = 0.72;
  const MOTOR_CUTOFF_MS = 2480;

  function createController(options = {}) {
    const volume = Math.max(0, Math.min(1, Number.isFinite(Number(options.volume)) ? Number(options.volume) : DEFAULT_VOLUME));
    const audioFactory = options.audioFactory || (typeof root?.Audio === "function" ? (src) => new root.Audio(src) : null);
    const fetchImpl = options.fetch || root?.fetch?.bind(root) || null;
    const atobImpl = options.atob || root?.atob?.bind(root) || null;
    const BlobCtor = options.Blob || root?.Blob || null;
    const urlApi = options.URL || root?.URL || null;
    const sources = options.sources || {motor: MOTOR_SOURCE, register: REGISTER_SOURCE, detent: DETENT_SOURCE};
    const cache = {};
    const urls = [];
    let motorTimer = null;
    let token = 0;

    function decodeBase64(text) {
      if (!atobImpl || !BlobCtor || !urlApi?.createObjectURL) return null;
      const binary = atobImpl(String(text).replace(/\s+/g, ""));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const url = urlApi.createObjectURL(new BlobCtor([bytes], {type: "audio/mpeg"}));
      urls.push(url);
      return url;
    }

    async function ensure(name) {
      if (cache[name]?.audio) return cache[name].audio;
      if (!cache[name]) {
        cache[name] = {promise: null, audio: null};
      }
      if (!cache[name].promise) {
        cache[name].promise = (async () => {
          if (!audioFactory) return null;
          let resolved = sources[name];
          if (fetchImpl) {
            try {
              const response = await fetchImpl(sources[name], {cache: "force-cache"});
              if (!response.ok) return null;
              resolved = decodeBase64(await response.text());
            } catch (_) { return null; }
          }
          if (!resolved) return null;
          const audio = audioFactory(resolved);
          audio.preload = "auto";
          audio.volume = volume;
          cache[name].audio = audio;
          return audio;
        })();
      }
      return cache[name].promise;
    }

    function reset(instance) {
      if (!instance) return;
      instance.pause();
      try { instance.currentTime = 0; } catch (_) {}
      instance.volume = volume;
    }

    function stopMotor() {
      if (motorTimer !== null) {
        root?.clearTimeout?.(motorTimer);
        motorTimer = null;
      }
      token += 1;
      reset(cache.motor?.audio);
    }

    async function playMotor() {
      stopMotor();
      reset(cache.register?.audio);
      reset(cache.detent?.audio);
      const current = token;
      const instance = await ensure("motor");
      if (!instance || current !== token) return false;
      try {
        const result = instance.play();
        if (result && typeof result.then === "function") await result;
        if (current !== token) {
          reset(instance);
          return false;
        }
        motorTimer = root?.setTimeout?.(() => stopMotor(), MOTOR_CUTOFF_MS) ?? null;
        return true;
      } catch (_) {
        reset(instance);
        return false;
      }
    }

    async function playOne(name, gain = 1) {
      const current = token;
      const instance = await ensure(name);
      if (!instance || current !== token) return false;
      reset(instance);
      instance.volume = Math.max(0, Math.min(1, volume * gain));
      try {
        const result = instance.play();
        if (result && typeof result.then === "function") await result;
        return true;
      } catch (_) {
        reset(instance);
        return false;
      }
    }

    function playRegisterClack() { return playOne("register", 0.95); }
    function playDetentClack() { return playOne("detent", 0.82); }

    async function unlock() {
      const audios = await Promise.all([ensure("motor"), ensure("register"), ensure("detent")]);
      let unlocked = false;
      for (const instance of audios) {
        if (!instance) continue;
        reset(instance);
        instance.volume = 0;
        try {
          const result = instance.play();
          if (result && typeof result.then === "function") await result;
          unlocked = true;
        } catch (_) {}
        reset(instance);
      }
      return unlocked;
    }

    function destroy() {
      stopMotor();
      for (const entry of Object.values(cache)) reset(entry?.audio);
      for (const url of urls) urlApi?.revokeObjectURL?.(url);
      urls.length = 0;
    }

    void ensure("motor");
    void ensure("register");
    void ensure("detent");
    return Object.freeze({playMotor, unlock, stopMotor, playRegisterClack, playDetentClack, destroy});
  }

  return Object.freeze({MOTOR_SOURCE, REGISTER_SOURCE, DETENT_SOURCE, DEFAULT_VOLUME, MOTOR_CUTOFF_MS, createController});
});
