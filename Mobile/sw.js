// No schedule, position, authentication response, or API data is stored offline.
// A failed navigation gets an unmistakable offline page, never a cached ETA.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#171b1c"><title>Dad Radar · Offline</title><body style="background:#171b1c;color:#f2e4c8;font:18px/1.6 system-ui;padding:30px"><h1>Dad Radar</h1><h2>Connection unavailable</h2><p>Current position and arrival time cannot be confirmed. Check your connection and try again.</p><a style="color:#efca86" href="/mobile">Try again</a></body></html>`, { headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'} })));
});
