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
  // Only pass through same-origin requests. Re-dispatching a cross-origin
  // request via fetch(event.request) from inside the worker does not
  // reliably reproduce the original CORS context — it was intermittently
  // failing on calls to the API host with "No Access-Control-Allow-Origin
  // header", even though the exact same request succeeds when the page
  // makes it directly. This worker only exists for PWA installability, so
  // it has no reason to touch cross-origin API calls at all.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(fetch(event.request));
});
