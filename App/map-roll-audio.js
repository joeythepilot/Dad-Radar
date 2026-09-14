(function initializeMapRollAudio(root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.dadRadarMapRollAudio = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function createMapRollAudioApi(root) {
  "use strict";

  const DEFAULT_SOURCE = "/assets/audio/dadradar-map-roll-v3-gearmotor.mp3.b64?v=1";
  const DEFAULT_VOLUME = 0.72;
  const MOTOR_CUTOFF_MS = 2480;

  function createController(options = {}) {
    const source = options.source || DEFAULT_SOURCE;
    const volume = Math.max(0, Math.min(1, Number.isFinite(Number(options.volume)) ? Number(options.volume) : DEFAULT_VOLUME));
    const audioFactory = options.audioFactory || (typeof root?.Audio === "function" ? (src) => new root.Audio(src) : null);
    const fetchImpl = options.fetch || root?.fetch?.bind(root) || null;
    const atobImpl = options.atob || root?.atob?.bind(root) || null;
    const BlobCtor = options.Blob || root?.Blob || null;
    const urlApi = options.URL || root?.URL || null;
    const AudioContextCtor = options.AudioContext || root?.AudioContext || root?.webkitAudioContext || null;
    let audio = null;
    let objectUrl = null;
    let sourcePromise = null;
    let token = 0;
    let motorTimer = null;
    let context = null;

    function decodeBase64(text) {
      if (!atobImpl || !BlobCtor || !urlApi?.createObjectURL) return null;
      const binary = atobImpl(String(text).replace(/\s+/g, ""));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return urlApi.createObjectURL(new BlobCtor([bytes], {type: "audio/mpeg"}));
    }

    function loadSource() {
      if (!sourcePromise) {
        sourcePromise = fetchImpl
          ? fetchImpl(source, {cache: "force-cache"})
              .then(response => {
                if (!response.ok) throw new Error(`Map-roll audio load failed (${response.status}).`);
                return response.text();
              })
              .then(text => {
                objectUrl = decodeBase64(text);
                return objectUrl;
              })
              .catch(() => null)
          : Promise.resolve(source);
      }
      return sourcePromise;
    }

    async function ensure() {
      if (audio) return audio;
      if (!audioFactory) return null;
      const resolved = await loadSource();
      if (!resolved) return null;
      audio = audioFactory(resolved);
      audio.preload = "auto";
      audio.volume = volume;
      return audio;
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
      reset(audio);
    }

    async function playMotor() {
      const instance = await ensure();
      if (!instance) return false;
      stopMotor();
      token += 1;
      const current = token;
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

    function ensureContext() {
      if (!context && AudioContextCtor) {
        try { context = new AudioContextCtor(); } catch (_) { context = null; }
      }
      return context;
    }

    function mechanicalClack(strength, lowHz) {
      const ctx = ensureContext();
      if (!ctx) return false;
      try { if (ctx.state === "suspended") void ctx.resume(); } catch (_) {}
      const duration = 0.16;
      const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index += 1) {
        const t = index / ctx.sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t / 0.012);
        const body = Math.sin(2 * Math.PI * lowHz * t) * Math.exp(-t / 0.045);
        const rattle = Math.sin(2 * Math.PI * lowHz * 0.52 * t) * Math.exp(-t / 0.075);
        data[index] = strength * (0.64 * noise + 0.24 * body + 0.12 * rattle);
      }
      const sourceNode = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0.42;
      sourceNode.buffer = buffer;
      sourceNode.connect(gain);
      gain.connect(ctx.destination);
      sourceNode.start();
      return true;
    }

    function playRegisterClack() { return mechanicalClack(0.78, 78); }
    function playDetentClack() { return mechanicalClack(0.52, 96); }

    async function unlock() {
      const instance = await ensure();
      const ctx = ensureContext();
      try { if (ctx?.state === "suspended") await ctx.resume(); } catch (_) {}
      if (!instance) return Boolean(ctx);
      stopMotor();
      instance.volume = 0;
      try {
        const result = instance.play();
        if (result && typeof result.then === "function") await result;
        reset(instance);
        return true;
      } catch (_) {
        reset(instance);
        return Boolean(ctx);
      }
    }

    function destroy() {
      stopMotor();
      audio = null;
      if (objectUrl && urlApi?.revokeObjectURL) urlApi.revokeObjectURL(objectUrl);
      objectUrl = null;
      sourcePromise = null;
      try { void context?.close?.(); } catch (_) {}
      context = null;
    }

    void loadSource();
    return Object.freeze({playMotor, unlock, stopMotor, playRegisterClack, playDetentClack, destroy});
  }

  return Object.freeze({DEFAULT_SOURCE, DEFAULT_VOLUME, MOTOR_CUTOFF_MS, createController});
});
