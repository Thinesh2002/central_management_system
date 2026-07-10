import React from "react";
import { Navigate, Route, useParams } from "react-router-dom";

import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";

import DarazProductsPreviewPage from "../../../pages/daraz/product_management/index";
import DarazProductViewPage from "../../../pages/daraz/product_management/daraz_detail_view/index";
import DarazEditProductPage from "../../../pages/daraz/product_management/daraz_edit_product_page/index";
import DarazCreateProductPage from "../../../pages/daraz/product_management/daraz_create_product_page/index";
import DarazTransferProductPage from "../../../pages/daraz/product_management/daraz_transfer_product_page/index";
import DarazTransferPreviewPage from "../../../pages/daraz/product_management/daraz_transfer_preview_page/index";
import DarazTitleOptimizerPage from "../../../pages/daraz/product_management/daraz_title_optimizer_page/index";
import DarazProductLogsPage from "../../../pages/daraz/daraz_logs/daraz_sync_logs_page";

function ProtectedProductPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function RedirectDarazView() {
  const { id } = useParams();
  return <Navigate to={`/product/daraz-products/view/${id}`} replace />;
}

export default function DarazProductRoutes() {
  return (
    <>
      <Route
        path="/product/daraz-products"
        element={
          <ProtectedProductPage>
            <DarazProductsPreviewPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/daraz-products/view/:id"
        element={
          <ProtectedProductPage>
            <DarazProductViewPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/daraz-products/edit/:id"
        element={
          <ProtectedProductPage>
            <DarazEditProductPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/daraz-products/create"
        element={
          <ProtectedProductPage>
            <DarazCreateProductPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/daraz-products/transfer"
        element={
          <ProtectedProductPage>
            <DarazTransferProductPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/daraz-products/transfer-preview/:productId"
        element={
          <ProtectedProductPage>
            <DarazTransferPreviewPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/daraz-products/title-optimizer"
        element={
          <ProtectedProductPage>
            <DarazTitleOptimizerPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/sync-logs"
        element={
          <ProtectedProductPage>
            <DarazProductLogsPage />
          </ProtectedProductPage>
        }
      />

      {/* Old paths redirect to new Product Management section */}
      <Route path="/daraz/products" element={<Navigate to="/product/daraz-products" replace />} />
      <Route path="/Daraz/products" element={<Navigate to="/product/daraz-products" replace />} />
      <Route path="/daraz-products/logs" element={<Navigate to="/product/sync-logs" replace />} />
      <Route path="/daraz-products/view/:id" element={<RedirectDarazView />} />
    </>
  );
}
