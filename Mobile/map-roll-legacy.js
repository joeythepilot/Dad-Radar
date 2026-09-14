(function (root) {
  'use strict';
  var shell = root.document && root.document.getElementById('route-map-shell');
  if (!shell) return;
  var DURATION = 2550;
  var MOTOR_CUTOFF = 2480;
  shell.style.setProperty('--map-roll-duration', DURATION + 'ms');

  function addCss() {
    if (root.document.querySelector('link[data-dad-radar-map-roll-mobile]')) return;
    var link = root.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/UI/map-roll-transition.css?v=5';
    link.setAttribute('data-dad-radar-map-roll-mobile', 'true');
    root.document.head.appendChild(link);
  }
  addCss();

  ['top', 'bottom'].forEach(function (edge) {
    if (shell.querySelector('.map-roll-edge-shadow.is-' + edge)) return;
    var node = root.document.createElement('div');
    node.className = 'map-roll-edge-shadow is-' + edge;
    node.setAttribute('aria-hidden', 'true');
    shell.appendChild(node);
  });
  if (!shell.querySelector('.map-roll-splice')) {
    var splice = root.document.createElement('div');
    splice.className = 'map-roll-splice';
    splice.setAttribute('aria-hidden', 'true');
    shell.appendChild(splice);
  }

  var sources = {
    motor: '/assets/audio/dadradar-map-roll-v3-gearmotor.mp3.b64?v=3',
    register: '/assets/audio/dadradar-map-roll-register.mp3.b64?v=1',
    detent: '/assets/audio/dadradar-map-roll-detent.mp3.b64?v=1'
  };
  var audios = {};
  var sourcePromises = {};
  var objectUrls = [];
  var motorTimer = null;

  function decode(text) {
    try {
      var binary = root.atob(String(text).replace(/\s+/g, ''));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      var url = root.URL.createObjectURL(new Blob([bytes], {type: 'audio/mpeg'}));
      objectUrls.push(url);
      return url;
    } catch (_) { return null; }
  }
  function ensure(name) {
    if (audios[name]) return Promise.resolve(audios[name]);
    if (!sourcePromises[name]) {
      sourcePromises[name] = root.fetch(sources[name], {cache: 'force-cache'})
        .then(function (response) { return response.ok ? response.text() : Promise.reject(new Error('audio')); })
        .then(decode)
        .then(function (url) {
          if (!url) return null;
          var audio = new Audio(url);
          audio.preload = 'auto';
          audio.volume = .72;
          audios[name] = audio;
          return audio;
        })
        .catch(function () { return null; });
    }
    return sourcePromises[name];
  }
  function reset(audio) {
    if (!audio) return;
    audio.pause();
    try { audio.currentTime = 0; } catch (_) {}
    audio.volume = .72;
  }
  function stopMotor() {
    if (motorTimer !== null) { root.clearTimeout(motorTimer); motorTimer = null; }
    reset(audios.motor);
  }
  function play(name, gain) {
    return ensure(name).then(function (audio) {
      if (!audio) return false;
      reset(audio);
      audio.volume = .72 * (gain || 1);
      try {
        var result = audio.play();
        if (result && typeof result.catch === 'function') result.catch(function () {});
        return true;
      } catch (_) { return false; }
    });
  }
  function playMotor() {
    stopMotor();
    play('motor', 1).then(function () {
      motorTimer = root.setTimeout(stopMotor, MOTOR_CUTOFF);
    });
  }
  function clacks() {
    stopMotor();
    play('register', .95);
    root.setTimeout(function () { play('detent', .82); }, 135);
  }
  root.addEventListener('pointerdown', function unlock() {
    ['motor', 'register', 'detent'].forEach(function (name) {
      ensure(name).then(function (audio) {
        if (!audio) return;
        audio.volume = 0;
        try {
          var p = audio.play();
          if (p && typeof p.then === 'function') p.then(function () { reset(audio); }, function () { reset(audio); });
          else reset(audio);
        } catch (_) { reset(audio); }
      });
    });
  }, {once: true});
  ensure('motor'); ensure('register'); ensure('detent');

  var surface = null;
  var surfaceObserver = null;
  var currentSurface = false;
  var moving = false;
  var suppress = false;
  var queued = null;
  var lastToken = null;

  function hidden(node, value) {
    suppress = true;
    node.hidden = value;
    root.setTimeout(function () { suppress = false; }, 0);
  }
  function clearClasses() {
    shell.classList.remove('map-roll-to-surface', 'map-roll-to-regional', 'map-roll-demo-out', 'map-roll-demo-in');
  }
  function finish(target) {
    if (!moving) return;
    clacks();
    clearClasses();
    shell.classList.toggle('is-surface-registered', target);
    if (surface) hidden(surface, !target);
    currentSurface = target;
    moving = false;
    if (queued !== null && queued !== currentSurface) {
      var next = queued; queued = null;
      root.setTimeout(function () { transition(next); }, 180);
    } else queued = null;
  }
  function transition(target) {
    if (!surface) return;
    if (moving) { queued = target; return; }
    if (target === currentSurface) { hidden(surface, !target); return; }
    moving = true;
    hidden(surface, false);
    clearClasses();
    shell.classList.remove('is-surface-registered');
    void shell.offsetHeight;
    playMotor();
    var map = shell.querySelector('.route-map-svg');
    var ended = false;
    function onEnd(event) {
      if (ended || event.target !== map) return;
      ended = true;
      map.removeEventListener('animationend', onEnd);
      finish(target);
    }
    if (map) map.addEventListener('animationend', onEnd);
    shell.classList.add(target ? 'map-roll-to-surface' : 'map-roll-to-regional');
    root.setTimeout(function () { if (!ended) { ended = true; if (map) map.removeEventListener('animationend', onEnd); finish(target); } }, DURATION + 500);
  }
  function attach(layer) {
    if (!layer || layer === surface) return;
    if (surfaceObserver) surfaceObserver.disconnect();
    surface = layer;
    var requested = !layer.hidden;
    currentSurface = false;
    surfaceObserver = new MutationObserver(function () {
      if (suppress) return;
      transition(!surface.hidden);
    });
    surfaceObserver.observe(surface, {attributes: true, attributeFilter: ['hidden']});
    if (requested) root.setTimeout(function () { transition(true); }, 0);
    else hidden(surface, true);
  }
  function discover() { attach(shell.querySelector('.airport-surface-layer')); }
  discover();
  new MutationObserver(discover).observe(shell, {childList: true, subtree: true});

  root.addEventListener('dad-radar:visual-state-change', function (event) {
    var diagnostics = event.detail && event.detail.state && event.detail.state.diagnostics;
    var token = diagnostics && diagnostics.shutterTestToken;
    if (!token || token === lastToken) return;
    lastToken = token;
    if (surface) {
      var target = currentSurface;
      transition(!target);
      root.setTimeout(function () { transition(target); }, DURATION + 900);
    }
  }, true);
})(window);
