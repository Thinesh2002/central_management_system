import React from "react";
import { Route } from "react-router-dom";

import ManualOrdersDashboard from "../../pages/order_management/manual_orders/dashboard";
import ManualOrderCreatePage from "../../pages/order_management/manual_orders/ManualOrderCreatePage";
import ManualOrderEditPage from "../../pages/order_management/manual_orders/ManualOrderEditPage";
import ManualOrderDetailPage from "../../pages/order_management/manual_orders/ManualOrderDetailPage";

import Layout from "../../components/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function ManualOrderRoute() {
  return (
    <>
      <Route
        path="/manual/orders"
        element={
          <ProtectedLayout>
            <ManualOrdersDashboard />
          </ProtectedLayout>
        }
      />

      <Route
        path="/orders/create"
        element={
          <ProtectedLayout>
            <ManualOrderCreatePage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/orders/:orderId"
        element={
          <ProtectedLayout>
            <ManualOrderDetailPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/orders/:orderId/edit"
        element={
          <ProtectedLayout>
            <ManualOrderEditPage />
          </ProtectedLayout>
        }
      />
    </>
  );
}