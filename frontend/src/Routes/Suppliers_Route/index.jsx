// src/routes/FinanceRoutes.jsx
import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import Dashboard from "../../pages/suppliers/index"
import SProducts from "../../pages/suppliers/SupplierProducts/index"
import SShipment from "../../pages/suppliers/SupplierShipments/index"
import ShipmentOrderDetails from "../../pages/suppliers/SupplierShipments/ShipmentOrderDetails/index";
const Suppliers = (
  <>
    <Route
      path="/suppliers"
      element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      }
    />

    <Route
      path="/suppliers/products"
      element={
        <ProtectedRoute>
          <Layout>
            <SProducts />
          </Layout>
        </ProtectedRoute>
      }
    />
        <Route
      path="/suppliers-shipments"
      element={
        <ProtectedRoute>
          <Layout>
            <SShipment />
          </Layout>
        </ProtectedRoute>
      }
    />


        <Route
      path="/suppliers-shipments/:shipmentId/orders"
      element={
        <ProtectedRoute>
          <Layout>
            <ShipmentOrderDetails  />
          </Layout>
        </ProtectedRoute>
      }
    />
  </>
);

export default Suppliers;
