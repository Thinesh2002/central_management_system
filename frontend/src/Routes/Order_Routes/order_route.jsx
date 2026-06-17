import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import OrderList from "../../pages/Orders/index";
import OrderCreate from "./../../pages/Orders/Create_Order/index";
import OrderView from "./../../pages/Orders/View_Single_Order/index";


const FinanceRoutes = (
  <>
    <Route
      path="/orders-list"
      element={
        <ProtectedRoute>
          <Layout>
            <OrderList />
          </Layout>
        </ProtectedRoute>
      }
    />

    <Route
      path="/create-order"
      element={
        <ProtectedRoute>
          <Layout>
            <OrderCreate />
          </Layout>
        </ProtectedRoute>
      }
    />

        <Route
      path="/view-order/:order_id"
      element={
        <ProtectedRoute>
          <Layout>
            <OrderView />
          </Layout>
        </ProtectedRoute>
      }
    />



  </>
);

export default FinanceRoutes;
