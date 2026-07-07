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
