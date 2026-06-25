import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import DarazProductsPreviewPage from "../../../pages/daraz/product_management/index";
import DarazProductViewPage from "../../../pages/daraz/product_management/daraz_detail_view/index";
import DarazProductLogsPage from "../../../pages/daraz/daraz_logs/daraz_sync_logs_page";

function ProtectedMarketplacePage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function MarketplaceManagementRoutes() {
  return (
    <>
      <Route
        path="/daraz/products"
        element={
          <ProtectedMarketplacePage>
            <DarazProductsPreviewPage />
          </ProtectedMarketplacePage>
        }
      />

      <Route
        path="/daraz-products/view/:id"
        element={
          <ProtectedMarketplacePage>
            <DarazProductViewPage />
          </ProtectedMarketplacePage>
        }
      />

      <Route
        path="/daraz-products/logs"
        element={
          <ProtectedMarketplacePage>
            <DarazProductLogsPage />
          </ProtectedMarketplacePage>
        }
      />
    </>
  );
}