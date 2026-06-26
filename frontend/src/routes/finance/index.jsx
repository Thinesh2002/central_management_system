import React from 'react';
import { Route } from 'react-router-dom';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../config/ProtectedRoute';
import NetSalesDashboardPage from '../../pages/finance/NetSalesDashboardPage';
import ExpensesPage from '../../pages/finance/ExpensesPage';

function Protected({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;
}

export default function FinanceRoutes() {
  return <>
    <Route path="/net-sales" element={<Protected><NetSalesDashboardPage /></Protected>} />
    <Route path="/finance/net-sales" element={<Protected><NetSalesDashboardPage /></Protected>} />
    <Route path="/finance/expenses" element={<Protected><ExpensesPage /></Protected>} />
  </>;
}
