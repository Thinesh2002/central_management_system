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

// Registers a minimal service worker so the browser offers "Install app" —
// required for PWA installability alongside the manifest link in index.html.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });

  // A tab a user already had open stays controlled by whichever service
  // worker was active when it loaded, even after a newer one finishes
  // installing in the background - the open tab's React app is still the
  // old build, referencing asset hashes a later deploy already deleted
  // (confirmed live: repeated hard-refreshes alone didn't clear this,
  // because the stale *worker*, not just cached HTTP responses, was the
  // one still in control). `controllerchange` fires exactly when a new
  // worker takes over - reload once, right then, instead of leaving the
  // tab stuck until the user manually unregisters it or closes every tab.
  let reloadedForNewWorker = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForNewWorker) return;
    reloadedForNewWorker = true;
    window.location.reload();
  });
}
