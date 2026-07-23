import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import BrightHubProductDashboardPage from "../../../pages/brighthub/product_management/index";
import BrightHubProductDetailPage from "../../../pages/brighthub/product_management/brighthub_product_detail_page/index";

function ProtectedBrightHubProductPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function BrightHubProductRoutes() {
  return (
    <>
      <Route
        path="/product/brighthub-products"
        element={
          <ProtectedBrightHubProductPage>
            <BrightHubProductDashboardPage />
          </ProtectedBrightHubProductPage>
        }
      />

      <Route
        path="/product/brighthub-products/:accountId/:bhid"
        element={
          <ProtectedBrightHubProductPage>
            <BrightHubProductDetailPage />
          </ProtectedBrightHubProductPage>
        }
      />
    </>
  );
}
