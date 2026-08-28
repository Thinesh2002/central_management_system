import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ToastProvider } from "./components/common/toast/ToastProvider.jsx";
import { PermissionsProvider } from "./components/common/permissions/PermissionsProvider.jsx";
import { PageOverlayProvider } from "./components/common/page_overlay/PageOverlayProvider.jsx";
import { ConfirmProvider } from "./components/common/confirm_modal/ConfirmProvider.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <PermissionsProvider>
          <PageOverlayProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </PageOverlayProvider>
        </PermissionsProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// The service worker previously registered here (for PWA installability)
// caused installed-app windows to get permanently stuck serving an old
// build after a deploy, surviving even repeated hard-refreshes - because
// whichever worker was active when the window launched keeps controlling
// it regardless of what the page itself does. public/sw.js now ships as a
// one-time kill switch that unregisters itself and reloads every open
// window; this file must NOT re-register a worker, or every reload would
// just reinstall that same kill switch forever instead of ever settling
// into a normal, unstuck, worker-free state.
//
// Still listen for controllerchange in case a client is mid-transition
// away from an old worker when this bundle loads - reload once so it
// doesn't sit half-upgraded.
if ("serviceWorker" in navigator) {
  let reloadedForNewWorker = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForNewWorker) return;
    reloadedForNewWorker = true;
    window.location.reload();
  });
}
