(function initializeStationIdent(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dadRadarStationIdent = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function stationIdentApi(root) {
  'use strict';

  const MORSE = Object.freeze({
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
    G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
    M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
    S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..'
  });
  const STORAGE_KEY = 'dad-radar:station-ident-played:v1';
  const SAMPLE_RATE = 44100;
  const DOT = 60 / 13 / 50;

  function createStationIdentWav(identifier = 'MAX') {
    const letters = String(identifier).toUpperCase();
    if (!/^[A-Z]{3}$/.test(letters)) throw new Error('Station ID must be three letters');
    const segments = [[false, 0.30]];
    for (let i = 0; i < letters.length; i += 1) {
      const code = MORSE[letters[i]];
      for (let j = 0; j < code.length; j += 1) {
        segments.push([true, DOT * (code[j] === '-' ? 3 : 1)]);
        if (j < code.length - 1) segments.push([false, DOT]);
      }
      if (i < letters.length - 1) segments.push([false, 3 * DOT]);
    }
    segments.push([false, 0.45]);

    const frameCount = segments.reduce((sum, [, seconds]) => sum + Math.round(seconds * SAMPLE_RATE), 0);
    const bytes = new Uint8Array(44 + frameCount * 2);
    const view = new DataView(bytes.buffer);
    const label = (at, value) => {
      for (let i = 0; i < value.length; i += 1) bytes[at + i] = value.charCodeAt(i);
    };
    label(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true);
    label(8, 'WAVE'); label(12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true); view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    label(36, 'data'); view.setUint32(40, frameCount * 2, true);

    let frame = 0;
    let phase = 0;
    for (const [on, seconds] of segments) {
      const frames = Math.round(seconds * SAMPLE_RATE);
      for (let i = 0; i < frames; i += 1) {
        let value = 0;
        if (on) {
          const time = i / SAMPLE_RATE;
          const envelope = Math.max(0, Math.min(1, time / .012, (seconds - time) / .015));
          phase += 2 * Math.PI * (590 + Math.sin(2 * Math.PI * 2.8 * time)) / SAMPLE_RATE;
          value = (Math.sin(phase) + .11 * Math.sin(2 * phase)) * envelope * .48;
        }
        view.setInt16(44 + frame * 2, Math.round(value * 32767), true);
        frame += 1;
      }
    }
    return bytes;
  }

  function createStationIdentController(options = {}) {
    const identifier = String(options.identifier ?? 'MAX').toUpperCase();
    const storage = options.storage ?? root?.localStorage;
    const now = options.now ?? Date.now;
    const canPlay = options.canPlay ?? (() => true);
    const isSuppressed=options.isSuppressed??(()=>false);
    let generation=0;
    const volume = Math.max(0, Math.min(1, Number(options.volume ?? .48)));
    const audioFactory = options.audioFactory ?? (source => new root.Audio(source));
    let audio = null;
    let objectUrl = null;
    let pending = null;
    const played = new Set();
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) saved.forEach(id => played.add(String(id)));
    } catch (_) {}

    function ensureAudio() {
      if (!audio) {
        let source = options.source;
        if (!source) {
          if (!root?.Blob || !root?.URL?.createObjectURL) return null;
          objectUrl = root.URL.createObjectURL(new root.Blob(
            [createStationIdentWav(identifier)], {type: 'audio/wav'}
          ));
          source = objectUrl;
        }
        audio = audioFactory(source);
        audio.preload = 'auto';
        audio.volume = volume;
      }
      return audio;
    }

    function freshAdsbPosition(state) {
      const flight = state?.flight;
      if (!state?.eventId || !state.liveData || !flight ||
          ['ARRIVED', 'LANDED'].includes(String(state.livePhase).toUpperCase())) return false;
      const provider = String(flight.positionSource ?? '').toLowerCase();
      if (provider !== 'adsb.lol' &&
          !(provider === 'flightradar24' && /^ADSB$/i.test(flight.surfacePosition?.source ?? ''))) return false;
      if (flight.latitude === null || flight.latitude === undefined ||
          flight.longitude === null || flight.longitude === undefined) return false;
      const latitude = Number(flight.latitude);
      const longitude = Number(flight.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
      const age = now() - Date.parse(flight.lastPositionAt ?? '');
      return Number.isFinite(age) && age >= -5000 && age <= 90000;
    }

    function observe(state) {
      if (!freshAdsbPosition(state)) return false;
      const key = String(state.eventId);
      if(isSuppressed()){
        played.add(key);
        try{storage?.setItem(STORAGE_KEY,JSON.stringify([...played].slice(-100)));}catch(_){}
        return false;
      }
      if(!canPlay())return false;
      if (played.has(key) || pending !== null) return false;
      const instance = ensureAudio();
      if (!instance) return false;
      pending = key;
      const token=generation;
      try { instance.currentTime = 0; } catch (_) {}
      try {
        Promise.resolve(instance.play()).then(() => {
          if(token!==generation||isSuppressed())instance.pause();
          played.add(key);
          try { storage?.setItem(STORAGE_KEY, JSON.stringify([...played].slice(-100))); } catch (_) {}
        }).catch(() => {}).finally(() => {pending = null;});
      } catch (_) {
        pending = null;
        return false;
      }
      return true;
    }

    async function playTest() {
      if(isSuppressed())return false;
      const instance = ensureAudio();
      if (!instance) return false;
      try {
        instance.currentTime = 0;
        await instance.play();
        return true;
      } catch (_) { return false; }
    }

    async function unlock() {
      const instance = ensureAudio();
      if (!instance) return false;
      instance.volume = 0;
      try {
        await instance.play();
        instance.pause();
        instance.currentTime = 0;
        return true;
      } catch (_) { return false; }
      finally { instance.volume = volume; }
    }

    function destroy() {
      generation++;
      audio?.pause();
      audio = null;
      if (objectUrl) root.URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }

    return Object.freeze({observe, playTest, unlock, destroy,stop(){generation++;audio?.pause();}});
  }

  return Object.freeze({createStationIdentWav, createStationIdentController});
});
