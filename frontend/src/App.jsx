import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/users/UsersPage";
import CreateUserPage from "./pages/users/create_user_page";
import EditUserPage from "./pages/users/edit_user_page";
import AccessControlPage from "./pages/access/AccessControlPage";
import LogsPage from "./pages/logs/LogsPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import SalesDashboardPage from "./pages/reports/sales_dashboard";
import ProductManagementRoutes from "./routes/product_management/index";
import MarketplaceManagementRoutes from "./routes/marketplace_management/index";
import DarazProductRoute from "./routes/Daraz/product_management/index";
import WooProductsRoutes from "./routes/woo/product_management/index";
import InventoryPage from "./pages/inventory/InventoryPage";
import PriceDashboardPage from "./pages/price/PriceDashboardPage";
import OrderManagementRoutes from "./routes/order_management/index";

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
        path="/users/create"
        element={
          <ProtectedLayout>
            <CreateUserPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/users/edit/:id"
        element={
          <ProtectedLayout>
            <EditUserPage />
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

      <Route
        path="/notifications"
        element={
          <ProtectedLayout>
            <NotificationsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/reports/sales"
        element={
          <ProtectedLayout>
            <SalesDashboardPage />
          </ProtectedLayout>
        }
      />

      {/* Product Management Routes */}
      {ProductManagementRoutes()}

        {/* Marketplace Management Routes */}
      {MarketplaceManagementRoutes()} 

      {DarazProductRoute()}

      <Route
        path="/inventory"
        element={
          <ProtectedLayout>
            <InventoryPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/inventory/dashboard"
        element={
          <ProtectedLayout>
            <InventoryPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/inventory/add"
        element={
          <ProtectedLayout>
            <InventoryPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/inventory/modify"
        element={
          <ProtectedLayout>
            <InventoryPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/price"
        element={
          <ProtectedLayout>
            <PriceDashboardPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/price/dashboard"
        element={
          <ProtectedLayout>
            <PriceDashboardPage />
          </ProtectedLayout>
        }
      />

      {WooProductsRoutes()}

      {OrderManagementRoutes()}

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