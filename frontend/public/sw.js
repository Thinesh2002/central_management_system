// Self-unregistering "kill switch" — a stuck installed-PWA window keeps
// whatever worker was active when it launched controlling it indefinitely,
// even after later deploys fix the page it's serving (main.jsx's
// controllerchange reload only helps if the OLD page already has that
// listener, which a client running a pre-fix bundle never does). Once the
// browser picks up this new sw.js (it always re-fetches the worker script
// itself, bypassing any HTTP cache), it removes the service worker
// entirely and forces every open window to reload - breaking the loop
// without needing a manual uninstall/clear-site-data from every affected
// user. This intentionally drops PWA "Install app" support; re-add a
// normal worker in a later deploy if that's still wanted once everyone's
// unstuck.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.registration.unregister();

      const clientsList = await self.clients.matchAll({ type: "window" });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});
