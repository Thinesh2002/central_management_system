import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ToastProvider } from "./components/common/toast/ToastProvider.jsx";
import { PermissionsProvider } from "./components/common/permissions/PermissionsProvider.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <PermissionsProvider>
          <App />
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
}
