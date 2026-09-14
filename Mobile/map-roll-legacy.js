// Legacy entry point retained for cached family pages. There is only one controller.
(function () {
  'use strict';
  if (document.querySelector('script[data-map-roll-shared]')) return;
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/Mobile/map-hardware.css?v=7';
  document.head.appendChild(link);
  var script = document.createElement('script');
  script.src = '/App/map-roll-browser.js?v=7';
  script.setAttribute('data-map-roll-shared', 'true');
  document.body.appendChild(script);
})();
