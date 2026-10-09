(function () {
  'use strict';
  function fit() {
    var viewer = document.querySelector('.display-viewer');
    var dashboard = document.getElementById('dashboard');
    if (!viewer || !dashboard) return;
    var portrait = window.innerHeight > window.innerWidth;
    document.documentElement.classList.toggle('family-full-portrait', portrait);
    var width = portrait ? viewer.clientWidth : Math.min(viewer.clientWidth, viewer.clientHeight * 16 / 9);
    dashboard.style.width = width + 'px';
    dashboard.style.height = (portrait ? Math.max(1000, viewer.clientHeight) : width * 9 / 16) + 'px';
    // The raster Today’s Duty card has calibrated overlay geometry and must scale
    // as one physical object. Legacy web duty panels may still reflow when narrow.
    var duty = dashboard.querySelector('.daily-schedule-panel');
    if (duty && duty.clientWidth > 0) {
      var physicalDutyCard = duty.classList.contains('is-physical-duty-card');
      var narrowDuty = !physicalDutyCard && duty.clientWidth < 300;
      duty.classList.toggle('family-duty-narrow', narrowDuty);
      if (narrowDuty) duty.setAttribute('tabindex', '0');
      else duty.removeAttribute('tabindex');
    }
    var module = dashboard.querySelector('.flight-strip-module');
    var board = dashboard.querySelector('.flight-board');
    if (!module || !board) return;
    module.style.setProperty('--family-board-padding', Math.min(24, width * 0.0125) + 'px');
    var style = getComputedStyle(board);
    var boardWidth = board.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var boardHeight = board.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (boardWidth <= 0 || boardHeight <= 0) return;
    var originalTile = Math.min(86, (boardWidth - 2) / (18 + 14 * 0.04 + 3 * 0.65), (boardHeight - 2) / 1.56);
    if (originalTile <= 0) return;
    var gap = Math.floor(originalTile * 0.04 * 64) / 64;
    var tile = Math.floor((18 * originalTile - gap) / 19 * 64) / 64;
    var sectionGap = originalTile * 0.65;
    var airportWidth = tile * 3 + gap * 2;
    var sizes = {
      '--flap-width': tile, '--flap-height': originalTile * 1.56, '--flap-gap': gap,
      '--family-flap-font-size': originalTile * 0.74, '--family-flap-radius': tile * 0.08,
      '--flight-flap-group-width': tile * 5 + gap * 4,
      '--airport-flap-group-width': airportWidth,
      '--status-flap-group-width': tile * 8 + gap * 7,
      '--family-route-width': airportWidth * 2 + sectionGap,
      '--route-section-gap': sectionGap
    };
    Object.keys(sizes).forEach(function (name) { module.style.setProperty(name, sizes[name] + 'px'); });
  }
  function mount() {
    fit();
    if ('ResizeObserver' in window) {
      var observer = new ResizeObserver(fit);
      observer.observe(document.querySelector('.display-viewer'));
      observer.observe(document.querySelector('.flight-board'));
    } else if ('MutationObserver' in window) {
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
    resizeTimer = setTimeout(fit, 200);
  });
})();
