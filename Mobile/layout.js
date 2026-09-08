(function () {
  'use strict';
  var key = 'dad-radar.family-layout.v1';
  var full = location.pathname.replace(/\/$/, '') === '/mobile/full';
  var choice = 'auto';
  var query = new URLSearchParams(location.search).get('layout');
  try { choice = localStorage.getItem(key) || 'auto'; } catch (_) {}
  if (['auto', 'full', 'compact'].indexOf(query) >= 0) choice = query;
  if (['auto', 'full', 'compact'].indexOf(choice) < 0) choice = 'auto';
  function wantsFull() {
    var width = window.innerWidth, height = window.innerHeight;
    var tablet = Math.min(screen.width, screen.height) >= 600 || Math.min(width, height) >= 600;
    return choice === 'full' || (choice === 'auto' && tablet && width >= 900 && width > height);
  }
  function route() {
    var targetFull = wantsFull();
    if (targetFull === full) return false;
    location.replace((targetFull ? '/mobile/full' : '/mobile') + '?layout=' + choice);
    return true;
  }
  if (route()) return;
  function fit() {
    if (!full) return;
    var viewer = document.querySelector('.display-viewer');
    var dashboard = document.getElementById('dashboard');
    if (!viewer || !dashboard) return;
    var width = Math.min(viewer.clientWidth, viewer.clientHeight * 16 / 9);
    dashboard.style.width = width + 'px';
    dashboard.style.height = (width * 9 / 16) + 'px';
    var clockScale = Math.min(1, width / 1100);
    var clockSizes = {
      '--family-clock-font': Math.max(10, 22 * clockScale),
      '--family-clock-label': Math.max(6, 11 * clockScale),
      '--family-clock-zone': Math.max(6, 10 * clockScale),
      '--family-clock-spacing': 1.5 * clockScale,
      '--family-clock-pad-y': 7 * clockScale,
      '--family-clock-pad-x': 10 * clockScale,
      '--family-clock-inset': 22 * clockScale,
      '--family-clock-bottom': 20 * clockScale,
      '--family-clock-gap': 24 * clockScale
    };
    Object.keys(clockSizes).forEach(function (name) { dashboard.style.setProperty(name, clockSizes[name] + 'px'); });
    var module = dashboard.querySelector('.flight-strip-module');
    var board = dashboard.querySelector('.flight-board');
    if (!module || !board) return;
    module.style.setProperty('--family-board-padding', Math.min(24, width * 0.0125) + 'px');
    var style = getComputedStyle(board);
    var boardWidth = board.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var boardHeight = board.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (boardWidth <= 0 || boardHeight <= 0) return;
    // 18 tiles, 14 within-field gaps, and three larger gaps between the four fields.
    var tile = Math.min(86, (boardWidth - 2) / (18 + 14 * 0.04 + 3 * 0.65), (boardHeight - 2) / 1.56);
    if (tile <= 0) return;
    var gap = tile * 0.04;
    var sectionGap = tile * 0.65;
    var airportWidth = tile * 3 + gap * 2;
    var sizes = {
      '--flap-width': tile, '--flap-height': tile * 1.56, '--flap-gap': gap,
      '--family-flap-font-size': tile * 0.74, '--family-flap-radius': tile * 0.08,
      '--flight-flap-group-width': tile * 4 + gap * 3,
      '--airport-flap-group-width': airportWidth,
      '--status-flap-group-width': tile * 8 + gap * 7,
      '--family-route-width': airportWidth * 2 + sectionGap,
      '--route-section-gap': sectionGap
    };
    Object.keys(sizes).forEach(function (name) { module.style.setProperty(name, sizes[name] + 'px'); });
  }
  function mount() {
    var bar = full ? document.createElement('nav') : document.querySelector('body > header');
    if (!bar) return;
    if (full) {
      bar.className = 'family-layout-bar';
      bar.setAttribute('aria-label', 'Family display');
      document.body.insertBefore(bar, document.body.firstChild);
      var brand = document.createElement('span');
      brand.textContent = 'DAD RADAR';
      brand.className = 'family-layout-brand';
      bar.appendChild(brand);
    }
    var label = document.createElement('label');
    label.className = 'family-layout-control';
    label.appendChild(document.createTextNode('Layout '));
    var select = document.createElement('select');
    select.setAttribute('aria-label', 'Display layout');
    [['auto', 'Automatic'], ['full', 'Full'], ['compact', 'Compact']].forEach(function (item) {
      var option = document.createElement('option');
      option.value = item[0]; option.textContent = item[1]; select.appendChild(option);
    });
    select.value = choice;
    select.addEventListener('change', function () {
      choice = select.value;
      try { localStorage.setItem(key, choice); } catch (_) {}
      history.replaceState(null, '', location.pathname + '?layout=' + choice);
      route(); fit();
    });
    label.appendChild(select);
    if (!full && document.getElementById('refresh')) bar.insertBefore(label, document.getElementById('refresh'));
    else bar.appendChild(label);
    fit();
    if (full && 'ResizeObserver' in window) {
      var observer = new ResizeObserver(fit);
      observer.observe(document.querySelector('.display-viewer'));
      observer.observe(document.querySelector('.flight-board'));
    } else if (full && 'MutationObserver' in window) {
      // Older iPads reveal the board after the startup animation.
      new MutationObserver(fit).observe(document.getElementById('dashboard'), {attributes: true, attributeFilter: ['hidden']});
    }
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/Mobile/sw.js', {scope: '/mobile'}).catch(function () {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (!route()) fit(); }, 200);
  });
})();
