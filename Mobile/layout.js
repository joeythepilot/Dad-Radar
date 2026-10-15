(function () {
  'use strict';
  var splitFlapGeometry;
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
    // Measure the original flow, not our positioned plate's resulting width.
    // This prevents ResizeObserver feedback from progressively shrinking it.
    if (splitFlapGeometry) module.classList.remove('family-splitflap-mounted');
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
    if (splitFlapGeometry) {
      // Keep the existing tile height/material/mechanisms. Register the intact
      // photograph independently on each axis; its measured openings are taller
      // in proportion than the existing responsive tile assemblies.
      var photoWidth = Math.min(module.clientWidth - 8, (tile * 5 + gap * 4) * splitFlapGeometry.width / splitFlapGeometry.windows[0].width);
      var xScale = photoWidth / splitFlapGeometry.width;
      var tileHeight = originalTile * 1.56;
      var photoHeight = tileHeight * splitFlapGeometry.height / splitFlapGeometry.windows[0].height;
      var fittedTile = (splitFlapGeometry.windows[0].width * xScale - gap * 4) / 5;
      module.style.setProperty('--family-plate-width', photoWidth + 'px');
      module.style.setProperty('--family-plate-height', photoHeight + 'px');
      module.style.setProperty('--flap-width', fittedTile + 'px');
      var ids = ['flight-number', 'flight-origin', 'flight-destination', 'status-value'];
      splitFlapGeometry.windows.forEach(function (opening, index) {
        var group = document.getElementById(ids[index]);
        group.style.setProperty('--plate-group-left', opening.x * xScale + 'px');
        group.style.setProperty('--plate-group-top', opening.y * photoHeight / splitFlapGeometry.height + 'px');
        group.style.setProperty('--plate-group-width', opening.width * xScale + 'px');
        group.style.setProperty('--plate-group-gap', (opening.width * xScale - fittedTile * opening.tiles) / (opening.tiles - 1) + 'px');
      });
      module.classList.add('family-splitflap-mounted');
    }
  }
  function mount() {
    // Leave the existing board usable if the optional hardware asset cannot load.
    if (window.fetch) window.fetch('/assets/hardware/HomingBeacon_SplitFlap_Geometry_v3.json').then(function (response) {
      if (!response.ok) throw new Error('Split-flap geometry unavailable');
      return response.json();
    }).then(function (geometry) {
      var board = document.querySelector('.flight-board');
      var plate = document.createElement('img');
      plate.className = 'family-splitflap-plate';
      plate.alt = ''; plate.setAttribute('aria-hidden', 'true'); plate.draggable = false;
      plate.onload = function () {
        splitFlapGeometry = geometry;
        board.closest('.flight-strip-module').classList.add('family-splitflap-mounted');
        fit();
      };
      plate.onerror = function () { if (plate.parentNode) plate.parentNode.removeChild(plate); };
      plate.src = '/assets/hardware/HomingBeacon_SplitFlap_Measured_Transparent_v3.png';
      board.insertBefore(plate, board.firstChild);
    }).catch(function () {});
    // The approved photographic plate is a separate mobile-only rear layer.
    // Keep every existing instrument child and its mechanism unchanged.
    document.querySelectorAll('.instrument-slot .instrument').forEach(function (instrument) {
      var plate = document.createElement('img');
      plate.className = 'family-instrument-plate';
      plate.src = '/assets/hardware/HomingBeacon_Approved_Instrument_Plate_Transparent_v1.png';
      plate.alt = '';
      plate.setAttribute('aria-hidden', 'true');
      plate.draggable = false;
      instrument.insertBefore(plate, instrument.firstChild);
    });
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
