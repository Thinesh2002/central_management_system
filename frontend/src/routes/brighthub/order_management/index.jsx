import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import BrightHubOrderDashboardPage from "../../../pages/brighthub/order_management/index";
import BrightHubOrderDetailPage from "../../../pages/brighthub/order_management/brighthub_order_detail_page/index";

function ProtectedBrightHubOrderPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function BrightHubOrderRoutes() {
  return (
    <>
      <Route
        path="/product/brighthub-orders"
        element={
          <ProtectedBrightHubOrderPage>
            <BrightHubOrderDashboardPage />
          </ProtectedBrightHubOrderPage>
        }
      />

      <Route
        path="/product/brighthub-orders/:accountId/:id"
        element={
          <ProtectedBrightHubOrderPage>
            <BrightHubOrderDetailPage />
          </ProtectedBrightHubOrderPage>
        }
      />
    </>
  );
}
