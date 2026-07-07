import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../components/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

import SkuReportPage from "../../pages/order_management/sku_report/index";

function ProtectedOrderPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function OrderManagementRoutes() {
  return (
    <>
      <Route
        path="/order-management/sku-report/:sku"
        element={
          <ProtectedOrderPage>
            <SkuReportPage />
          </ProtectedOrderPage>
        }
      />
    </>
  );
}
