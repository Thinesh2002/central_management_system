import { Route } from "react-router-dom";
import Layout from "../pages/compnents/Layout";
import ProtectedRoute from "../config/ProtectedRoute";
import {
  ManageAllInventoryAmazon,
  LocalCategoryManager,
  SkuMappingManager,
  CategoryMappingManager,
  OrdersAmazonPage,
  FinanceReportsPage,
  PackRulesPage,
  ImagesDashboard,
  LogsPage,
} from "../pages/enterprise/EnterprisePages";

const wrap = (children) => <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;

const EnterpriseRoutes = <>
  <Route path="/manage-all-inventory" element={wrap(<ManageAllInventoryAmazon />)} />
  <Route path="/system/products" element={wrap(<ManageAllInventoryAmazon />)} />
  <Route path="/system/categories" element={wrap(<LocalCategoryManager />)} />
  <Route path="/system/images" element={wrap(<ImagesDashboard />)} />
  <Route path="/daraz/sku-mapping" element={wrap(<SkuMappingManager />)} />
  <Route path="/daraz/category-mapping" element={wrap(<CategoryMappingManager />)} />
  <Route path="/daraz/orders" element={wrap(<OrdersAmazonPage />)} />
  <Route path="/daraz/net-sales" element={wrap(<FinanceReportsPage />)} />
  <Route path="/daraz/business-reports" element={wrap(<FinanceReportsPage />)} />
  <Route path="/daraz/pack-rules" element={wrap(<PackRulesPage />)} />
  <Route path="/daraz/images" element={wrap(<ImagesDashboard />)} />
  <Route path="/daraz/sync-logs" element={wrap(<LogsPage />)} />
</>;

export default EnterpriseRoutes;
