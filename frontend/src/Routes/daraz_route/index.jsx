import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import DarazCentralDashboard from "../../pages/Daraz/central/DarazCentralDashboard";
import DarazAccounts from "../../pages/Daraz/accounts/DarazAccounts";
import ViewProducts from "../../pages/product/daraz/view_product/index";
import ProductDetails from "../../pages/product/daraz/detail_product_view/index";
import DarazOrders from "../../pages/Daraz/orders/order";
import DarazInventory from "../../pages/Daraz/inventory/DarazInventory";
import DarazCategories from "../../pages/Daraz/categories/DarazCategories";
import DarazFinance from "../../pages/Daraz/finance/index";
import OrderDetail from "../../pages/Daraz/finance/detail_finance_page/index";

const wrap = (children) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

const Daraz_Routes = (
  <>
    <Route path="/daraz-dashboard" element={wrap(<DarazCentralDashboard />)} />
    <Route path="/daraz/accounts" element={wrap(<DarazAccounts />)} />
    <Route path="/daraz/products" element={wrap(<ViewProducts />)} />
    <Route path="/view-Products" element={wrap(<ViewProducts />)} />
    <Route path="/daraz/products/:id" element={wrap(<ProductDetails />)} />
    <Route path="/daraz/orders" element={wrap(<DarazOrders />)} />
    <Route path="/daraz/inventory" element={wrap(<DarazInventory />)} />
    <Route path="/daraz/categories" element={wrap(<DarazCategories />)} />
    <Route path="/daraz/finance" element={wrap(<DarazFinance />)} />
    <Route path="/orders/:orderId" element={wrap(<OrderDetail />)} />
  </>
);

export default Daraz_Routes;
