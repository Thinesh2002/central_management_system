import React from 'react';
import { Route } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../config/ProtectedRoute';
import DarazFinanceDashboardPage from '../../../pages/daraz/finance/DarazFinanceDashboardPage';
import DarazFinanceTransactionsPage from '../../../pages/daraz/finance/DarazFinanceTransactionsPage';
import DarazFinancePayoutsPage from '../../../pages/daraz/finance/DarazFinancePayoutsPage';
import DarazOrderFinancePage from '../../../pages/daraz/finance/DarazOrderFinancePage';

function Protected({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;
}

export default function DarazFinanceRoutes() {
  return <>
    <Route path="/daraz/finance" element={<Protected><DarazFinanceDashboardPage /></Protected>} />
    <Route path="/daraz/finance/transactions" element={<Protected><DarazFinanceTransactionsPage /></Protected>} />
    <Route path="/daraz/finance/payouts" element={<Protected><DarazFinancePayoutsPage /></Protected>} />
    <Route path="/daraz/finance/orders/:orderNo" element={<Protected><DarazOrderFinancePage /></Protected>} />
  </>;
}
