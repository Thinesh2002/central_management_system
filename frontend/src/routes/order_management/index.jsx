import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../components/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

import SkuReportPage from "../../pages/order_management/sku_report/index";
import CustomersPage from "../../pages/order_management/customers/index";
import CustomerViewPage from "../../pages/order_management/customers/view/index";
import ProductTrendsPage from "../../pages/order_management/product_trends/index";
import OrdersPage from "../../pages/order_management/orders/index";
import OrderDetailPage from "../../pages/order_management/orders/view/index";
import CreateManualOrderPage from "../../pages/order_management/orders/create/index";
import OrderSyncSettingsPage from "../../pages/order_management/sync_settings/index";
import MessageTemplatesPage from "../../pages/order_management/message_templates/index";

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

      <Route
        path="/order-management/customers"
        element={
          <ProtectedOrderPage>
            <CustomersPage />
          </ProtectedOrderPage>
        }
      />

      <Route
        path="/order-management/customers/:id"
        element={
          <ProtectedOrderPage>
            <CustomerViewPage />
          </ProtectedOrderPage>
        }
      />

      <Route
        path="/order-management/product-trends"
        element={
          <ProtectedOrderPage>
            <ProductTrendsPage />
          </ProtectedOrderPage>
        }
      />

      <Route
        path="/order-management/orders"
        element={
          <ProtectedOrderPage>
            <OrdersPage />
          </ProtectedOrderPage>
        }
      />

      <Route
        path="/order-management/orders/create"
        element={
          <ProtectedOrderPage>
            <CreateManualOrderPage />
          </ProtectedOrderPage>
        }
      />

      <Route
        path="/order-management/orders/:source/:id"
        element={
          <ProtectedOrderPage>
            <OrderDetailPage />
          </ProtectedOrderPage>
        }
      />

      <Route
        path="/order-management/sync-settings"
        element={
          <ProtectedOrderPage>
            <OrderSyncSettingsPage />
          </ProtectedOrderPage>
        }
      />

      <Route
        path="/order-management/message-templates"
        element={
          <ProtectedOrderPage>
            <MessageTemplatesPage />
          </ProtectedOrderPage>
        }
      />
    </>
  );
}
