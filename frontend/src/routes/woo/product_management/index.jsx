import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import WooProductDashboardPage from "../../../pages/woo/product_management/index";
import WooProductDetailPage from "../../../pages/woo/product_management/woo_product_detail_page/index";

function ProtectedWooProductPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function WooProductRoutes() {
  return (
    <>
      <Route
        path="/woo-products"
        element={
          <ProtectedWooProductPage>
            <WooProductDashboardPage />
          </ProtectedWooProductPage>
        }
      />

      <Route
        path="/woo-products/:accountId/:wooProductId"
        element={
          <ProtectedWooProductPage>
            <WooProductDetailPage />
          </ProtectedWooProductPage>
        }
      />
    </>
  );
}