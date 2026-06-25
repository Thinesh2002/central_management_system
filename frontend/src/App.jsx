import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/users/UsersPage";
import AccessControlPage from "./pages/access/AccessControlPage";
import LogsPage from "./pages/logs/LogsPage";
import ProductManagementRoutes from "./routes/product_management/index";
import MarketplaceManagementRoutes from "./routes/marketplace_management/index";
import DarazProductRoute from "./routes/Daraz/product_management/index";
import DarazOrderRoute from "./routes/Daraz/orders/index";
import WooProductsRoutes from "./routes/woo/product_management/index";
import ManualOrderRoute from "./routes/order_management/orderManagementRoutes";

import Layout from "./components/Layout";
import ProtectedRoute from "./config/ProtectedRoute";

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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedLayout>
            <UsersPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/access-control"
        element={
          <ProtectedLayout>
            <AccessControlPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/logs"
        element={
          <ProtectedLayout>
            <LogsPage />
          </ProtectedLayout>
        }
      />

      {/* Product Management Routes */}
      {ProductManagementRoutes()}

        {/* Marketplace Management Routes */}
      {MarketplaceManagementRoutes()} 

      {DarazProductRoute()}

      {DarazOrderRoute()}
      {WooProductsRoutes()}
      {ManualOrderRoute()}

      
      {/* Unknown pages */}
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