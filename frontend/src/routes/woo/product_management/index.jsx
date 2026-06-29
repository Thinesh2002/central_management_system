import React from "react";
import { Navigate, Route, useParams } from "react-router-dom";

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

function RedirectWooDetail() {
  const { accountId, wooProductId } = useParams();
  return <Navigate to={`/product/woo-products/${accountId}/${wooProductId}`} replace />;
}

export default function WooProductRoutes() {
  return (
    <>
      <Route
        path="/product/woo-products"
        element={
          <ProtectedWooProductPage>
            <WooProductDashboardPage />
          </ProtectedWooProductPage>
        }
      />

      <Route
        path="/product/woo-products/:accountId/:wooProductId"
        element={
          <ProtectedWooProductPage>
            <WooProductDetailPage />
          </ProtectedWooProductPage>
        }
      />

      {/* Old Woo paths redirect to new Product Management section */}
      <Route path="/woo-products" element={<Navigate to="/product/woo-products" replace />} />
      <Route path="/woo-products/:accountId/:wooProductId" element={<RedirectWooDetail />} />
      <Route path="/marketplace/woo-products" element={<Navigate to="/product/woo-products" replace />} />
      <Route path="/marketplace/woo-products/:accountId/:wooProductId" element={<RedirectWooDetail />} />
    </>
  );
}
