// src/routes/FinanceRoutes.jsx
import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import FinancePage from "../../pages/Finance";
import AddFinance from "../../pages/Finance/Add_Income";
import NetSales from "../../pages/Finance/Net_Sales";

const FinanceRoutes = (
  <>
    <Route
      path="/finance-dashboard"
      element={
        <ProtectedRoute>
          <Layout>
            <FinancePage />
          </Layout>
        </ProtectedRoute>
      }
    />

    <Route
      path="/add-income"
      element={
        <ProtectedRoute>
          <Layout>
            <AddFinance />
          </Layout>
        </ProtectedRoute>
      }
    />

        <Route
      path="/net-income"
      element={
        <ProtectedRoute>
          <Layout>
            <NetSales />
          </Layout>
        </ProtectedRoute>
      }
    />
  </>
);

export default FinanceRoutes;
