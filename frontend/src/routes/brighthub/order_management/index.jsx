import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import BrightHubOrderDetailPage from "../../../pages/brighthub/order_management/brighthub_order_detail_page/index";

function ProtectedBrightHubOrderPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

// The standalone Website Orders list page/route was removed - BrightHub
// orders now show merged into the main Orders page (/order-management/orders)
// alongside Daraz/Woo/local orders. This detail page stays, reached from
// that unified list's View/Print/Track actions for brighthub-sourced rows.
export default function BrightHubOrderRoutes() {
  return (
    <Route
      path="/product/brighthub-orders/:accountId/:id"
      element={
        <ProtectedBrightHubOrderPage>
          <BrightHubOrderDetailPage />
        </ProtectedBrightHubOrderPage>
      }
    />
  );
}
