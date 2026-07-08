import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../components/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

import SkuReportPage from "../../pages/order_management/sku_report/index";
import CustomersPage from "../../pages/order_management/customers/index";
import CustomerViewPage from "../../pages/order_management/customers/view/index";
import ProductTrendsPage from "../../pages/order_management/product_trends/index";

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
    </>
  );
}
