import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./pages/compnents/Layout";
import Login from "./pages/login";
import Dashboard from "./pages/dasboard";
import User from "./pages/user/user_dashboard";
import AddProduct from "./pages/product/AddProducr";
import EditProduct from "./pages/product/edit_product";
import Inventory from "./pages/inventory/inventory_dashboard";
import BlogPage from "./pages/Blog";
import AddBlockPAge from "./pages/Blog/Add_Block_Page";
import EditProductPage from "./pages/Blog/Edit_Blog";
import PricingRoute from "./Routes/price/daraz_price_calculations/index"
import ProtectedRoute from "./config/ProtectedRoute";
import Colours_Route from "./Routes/colours_route/index"
import FinanceRoutes from "./Routes/Finance/finance_route";
import Product_Route from "./Routes/Product_Route/product_route";
import Order from "./Routes/Order_Routes/order_route";
import CateogoryRoute from "./Routes/Category_Route";
import DarazRoute from "./Routes/daraz_route/index";
import DarazCallback from "./pages/Daraz/auth/DarazCallback";
import SuppliersRoute from "./Routes/Suppliers_Route/index";
export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/daraz/callback" element={<DarazCallback />} />

      {/* PROTECTED */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user-dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <User />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-product"
        element={
          <ProtectedRoute>
            <Layout>
              <AddProduct />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit-product/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditProduct />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Layout>
              <Inventory />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/blog"
        element={
          <ProtectedRoute>
            <Layout>
              <BlogPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-blog"
        element={
          <ProtectedRoute>
            <Layout>
              <AddBlockPAge />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit-blog/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditProductPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* OTHER ROUTES */}
      {FinanceRoutes}
      {Product_Route}
      {Order}
      {CateogoryRoute}
      {DarazRoute}
      {PricingRoute}
      {Colours_Route}
      {SuppliersRoute}
      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
