(function initializeSplitFlapAudio(
  root,
  factory
) {
  const api = factory(root);

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarSplitFlapAudio =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createSplitFlapAudioApi(root) {
    "use strict";

    const DEFAULT_CUE_SECONDS = 5.195;
    const DEFAULT_FADE_OUT_MS = 260;
    const DEFAULT_VOLUME = 0.68;

    function finiteNumber(
      value,
      fallback
    ) {
      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : fallback;
    }

    function createSplitFlapAudioController(
      providedOptions = {}
    ) {
      const cueSeconds = Math.max(
        0,
        finiteNumber(
          providedOptions.cueSeconds,
          DEFAULT_CUE_SECONDS
        )
      );

      const fadeOutMs = Math.max(
        0,
        finiteNumber(
          providedOptions.fadeOutMs,
          DEFAULT_FADE_OUT_MS
        )
      );

      const volume = Math.min(
        1,
        Math.max(
          0,
          finiteNumber(
            providedOptions.volume,
            DEFAULT_VOLUME
          )
        )
      );

      const now =
        providedOptions.now ??
        (() =>
          root?.performance?.now?.() ??
          Date.now());

      const requestFrame =
        providedOptions.requestFrame ??
        root?.requestAnimationFrame
          ?.bind(root) ??
        ((callback) =>
          root.setTimeout(
            () => callback(now()),
            16
          ));

      const cancelFrame =
        providedOptions.cancelFrame ??
        root?.cancelAnimationFrame
          ?.bind(root) ??
        ((frameId) =>
          root.clearTimeout(frameId));

      const audioFactory =
        providedOptions.audioFactory ??
        (
          typeof root?.Audio ===
            "function"
            ? (source) =>
                new root.Audio(source)
            : null
        );

      let audio = null;
      let fadeFrameId = null;
      let playbackToken = 0;

      function ensureAudio() {
        if (!audio && audioFactory) {
          audio = audioFactory(
            providedOptions.source
          );

          if (audio) {
            audio.preload = "auto";
            audio.volume = volume;
          }
        }

        return audio;
      }

      function cancelFade() {
        if (fadeFrameId !== null) {
          cancelFrame(fadeFrameId);
          fadeFrameId = null;
        }
      }

      function resetToCue(instance) {
        if (!instance) {
          return;
        }

        instance.pause();

        try {
          instance.currentTime =
            cueSeconds;
        } catch {
          // The cue is applied again when playback starts.
        }

        instance.volume = volume;
      }

      async function start() {
        const instance = ensureAudio();

        if (!instance) {
          return false;
        }

        playbackToken += 1;
        const token = playbackToken;

        cancelFade();
        resetToCue(instance);

        try {
          const playResult =
            instance.play();

          if (
            playResult &&
            typeof playResult.then ===
              "function"
          ) {
            await playResult;
          }

          if (token !== playbackToken) {
            resetToCue(instance);
            return false;
          }

          return true;
        } catch {
          resetToCue(instance);
          return false;
        }
      }

      async function unlock() {
        const instance = ensureAudio();

        if (!instance) {
          return false;
        }

        playbackToken += 1;
        cancelFade();
        resetToCue(instance);
        instance.volume = 0;

        try {
          const playResult =
            instance.play();

          if (
            playResult &&
            typeof playResult.then ===
              "function"
          ) {
            await playResult;
          }

          resetToCue(instance);
          return true;
        } catch {
          resetToCue(instance);
          return false;
        }
      }

      function stop() {
        const instance = audio;

        playbackToken += 1;
        cancelFade();

        if (!instance) {
          return;
        }

        if (
          fadeOutMs === 0 ||
          instance.paused
        ) {
          resetToCue(instance);
          return;
        }

        const startedAt = now();
        const startingVolume =
          finiteNumber(
            instance.volume,
            volume
          );

        function fadeStep(timestamp) {
          const progress = Math.min(
            1,
            Math.max(
              0,
              (
                timestamp -
                startedAt
              ) / fadeOutMs
            )
          );

          instance.volume =
            startingVolume *
            (1 - progress);

          if (progress >= 1) {
            fadeFrameId = null;
            resetToCue(instance);
            return;
          }

          fadeFrameId =
            requestFrame(fadeStep);
        }

        fadeFrameId =
          requestFrame(fadeStep);
      }

      function destroy() {
        playbackToken += 1;
        cancelFade();
        resetToCue(audio);
        audio = null;
      }

      return Object.freeze({
        start,
        unlock,
        stop,
        destroy
      });
    }

    return Object.freeze({
      DEFAULT_CUE_SECONDS,
      DEFAULT_FADE_OUT_MS,
      createSplitFlapAudioController
    });
  }
);
