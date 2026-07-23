import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import BrightHubProductDashboardPage from "../../../pages/brighthub/product_management/index";

function ProtectedBrightHubProductPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function BrightHubProductRoutes() {
  return (
    <Route
      path="/product/brighthub-products"
      element={
        <ProtectedBrightHubProductPage>
          <BrightHubProductDashboardPage />
        </ProtectedBrightHubProductPage>
      }
    />
  );
}
