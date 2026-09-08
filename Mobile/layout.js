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
