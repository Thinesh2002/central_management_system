// src/routes/FinanceRoutes.jsx
import { Route } from "react-router-dom";
import Layout from "../../../pages/compnents/Layout";
import ProtectedRoute from "../../../config/ProtectedRoute";
import DarazPrice from "../../../pages/price/daraz_price_calculations";

const FinanceRoutes = (
  <>
    <Route
      path="/daraz-price-calculation"
      element={
        <ProtectedRoute>
          <Layout>
            <DarazPrice />
          </Layout>
        </ProtectedRoute>
      }
    />

  </>
);

export default FinanceRoutes;
