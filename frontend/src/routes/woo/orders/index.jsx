import React from 'react';
import { Route } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../config/ProtectedRoute';
import WooOrdersPage from '../../../pages/woo/orders/WooOrdersPage';
import WooOrderDetailPage from '../../../pages/woo/orders/WooOrderDetailPage';
import WooFinancePage from '../../../pages/woo/orders/WooFinancePage';

function Protected({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;
}

export default function WooOrderRoutes() {
  return <>
    <Route path="/woo/orders" element={<Protected><WooOrdersPage /></Protected>} />
    <Route path="/woo/orders/:id" element={<Protected><WooOrderDetailPage /></Protected>} />
    <Route path="/woo/finance" element={<Protected><WooFinancePage /></Protected>} />
  </>;
}
