// Minimal service worker — exists only to satisfy browser installability
// criteria (a registered service worker with a fetch handler). No caching
// strategy on purpose: this app's data (orders, sync jobs, prices) changes
// constantly, so a cache-first approach would serve stale pages.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
