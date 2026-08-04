import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import BrightHubProductDashboardPage from "../../../pages/brighthub/product_management/index";
import BrightHubProductDetailPage from "../../../pages/brighthub/product_management/brighthub_product_detail_page/index";
import BrightHubCreateProductPage from "../../../pages/brighthub/product_management/brighthub_create_product_page/index";
import BrightHubEditProductPage from "../../../pages/brighthub/product_management/brighthub_edit_product_page/index";

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
        path="/product/brighthub-products/create/:accountId"
        element={
          <ProtectedBrightHubProductPage>
            <BrightHubCreateProductPage />
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

      <Route
        path="/product/brighthub-products/:accountId/:bhid/edit"
        element={
          <ProtectedBrightHubProductPage>
            <BrightHubEditProductPage />
          </ProtectedBrightHubProductPage>
        }
      />
    </>
  );
}
