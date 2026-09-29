import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import InventoryApp from "./InventoryApp.jsx";
import { AppShellProvider } from "../components/common/app_shell/AppShellContext.jsx";
import { ToastProvider } from "../components/common/toast/ToastProvider.jsx";
import { PermissionsProvider } from "../components/common/permissions/PermissionsProvider.jsx";
import { PageOverlayProvider } from "../components/common/page_overlay/PageOverlayProvider.jsx";
import { ConfirmProvider } from "../components/common/confirm_modal/ConfirmProvider.jsx";
import { staticMenu } from "../utils/sidebarMenu.js";
import "../index.css";

// Standalone Inventory Management app (inventory.teckvora.com). Same pages,
// API and login as the CMS - only the shell differs: the sidebar is limited
// to the Product Management + Inventory sections.
const INVENTORY_SECTIONS = ["PRODUCT MANAGEMENT", "INVENTORY"];

const inventoryShell = {
  title: "Inventory Management",
  loginTitle: "Inventory Management",
  homePath: "/product/local-products",
  menu: staticMenu.filter((item) => INVENTORY_SECTIONS.includes(item.section)),
};

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShellProvider value={inventoryShell}>
        <ToastProvider>
          <PermissionsProvider>
            <PageOverlayProvider>
              <ConfirmProvider>
                <InventoryApp />
              </ConfirmProvider>
            </PageOverlayProvider>
          </PermissionsProvider>
        </ToastProvider>
      </AppShellProvider>
    </BrowserRouter>
  </React.StrictMode>
);
