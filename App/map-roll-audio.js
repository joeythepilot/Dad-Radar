(function initializeMapRollAudio(root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.dadRadarMapRollAudio = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function createMapRollAudioApi(root) {
  "use strict";

  const DEFAULT_SOURCE = "/assets/audio/dadradar-map-roll-v3-gearmotor.mp3.b64?v=2";
  const DEFAULT_VOLUME = 0.72;

  function createController(options = {}) {
    const source = options.source || DEFAULT_SOURCE;
    const volume = Math.max(0, Math.min(1, Number.isFinite(Number(options.volume)) ? Number(options.volume) : DEFAULT_VOLUME));
    const audioFactory = options.audioFactory || (typeof root?.Audio === "function" ? (src) => new root.Audio(src) : null);
    const fetchImpl = options.fetch || root?.fetch?.bind(root) || null;
    const atobImpl = options.atob || root?.atob?.bind(root) || null;
    const BlobCtor = options.Blob || root?.Blob || null;
    const urlApi = options.URL || root?.URL || null;
    let audio = null;
    let objectUrl = null;
    let sourcePromise = null;
    let token = 0;

    function decodeBase64(text) {
      if (!atobImpl || !BlobCtor || !urlApi?.createObjectURL) return null;
      const binary = atobImpl(String(text).replace(/\s+/g, ""));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      objectUrl = urlApi.createObjectURL(new BlobCtor([bytes], {type: "audio/mpeg"}));
      return objectUrl;
    }

    function loadSource() {
      if (!sourcePromise) {
        sourcePromise = fetchImpl
          ? fetchImpl(source, {cache: "force-cache"})
              .then(response => {
                if (!response.ok) throw new Error(`Map-roll audio load failed (${response.status}).`);
                return response.text();
              })
              .then(decodeBase64)
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

    async function play() {
      const instance = await ensure();
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
      const instance = await ensure();
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

    function destroy() {
      stop();
      audio = null;
      if (objectUrl && urlApi?.revokeObjectURL) urlApi.revokeObjectURL(objectUrl);
      objectUrl = null;
      sourcePromise = null;
    }

    void loadSource();
    return Object.freeze({play, unlock, stop, destroy});
  }

  return Object.freeze({DEFAULT_SOURCE, DEFAULT_VOLUME, createController});
});
