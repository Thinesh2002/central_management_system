import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "../pages/login";
import InventoryPage from "../pages/inventory/InventoryPage";
import SkuReportPage from "../pages/order_management/sku_report/index";
import DarazTransferPreviewPage from "../pages/daraz/product_management/daraz_transfer_preview_page/index";
import ProductManagementRoutes from "../routes/product_management/index";

import Layout from "../components/Layout";
import ProtectedRoute from "../config/ProtectedRoute";

const HOME = "/product/local-products";

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center">
      <h1 className="text-center text-3xl font-bold text-red-500 sm:text-4xl">
        404 Page Not Found
      </h1>
    </div>
  );
}

const INVENTORY_PATHS = ["/inventory", "/inventory/dashboard", "/inventory/add", "/inventory/modify"];

export default function InventoryApp() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Navigate to={HOME} replace />} />
      <Route path="/dashboard" element={<Navigate to={HOME} replace />} />

      {ProductManagementRoutes()}

      {INVENTORY_PATHS.map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedLayout>
              <InventoryPage />
            </ProtectedLayout>
          }
        />
      ))}

      {/* Opened in the page overlay from the Local Products list. */}
      <Route
        path="/order-management/sku-report/:sku"
        element={
          <ProtectedLayout>
            <SkuReportPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/product/daraz-products/transfer-preview/:productId"
        element={
          <ProtectedLayout>
            <DarazTransferPreviewPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="*"
        element={
          <ProtectedLayout>
            <NotFoundPage />
          </ProtectedLayout>
        }
      />
    </Routes>
  );
}
