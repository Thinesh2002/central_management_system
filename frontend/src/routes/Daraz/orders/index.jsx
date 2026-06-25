import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import DarazOrdersDashboard from "../../../pages/daraz/daraz_orders/index";
import DarazOrderDetail from "../../../pages/daraz/daraz_orders/daraz_order_detail_page/index";

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
        path="/daraz/orders"
        element={
          <ProtectedMarketplacePage>
            <DarazOrdersDashboard />
          </ProtectedMarketplacePage>
        }
      />

      <Route
        path="/daraz/orders/:orderId"
        element={
          <ProtectedMarketplacePage>
            <DarazOrderDetail />
          </ProtectedMarketplacePage>
        }
      />

    </>
  );
}