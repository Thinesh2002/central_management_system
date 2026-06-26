import React from 'react';
import { Route } from 'react-router-dom';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../config/ProtectedRoute';
import InventoryDashboardPage from '../../pages/inventory/InventoryDashboardPage';
import StockLedgerPage from '../../pages/inventory/StockLedgerPage';
import StockAdjustmentPage from '../../pages/inventory/StockAdjustmentPage';
import InventoryListPage from '../../pages/inventory/InventoryListPage';

function Protected({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;
}

export default function InventoryRoutes() {
  return <>
    <Route path="/inventory" element={<Protected><InventoryDashboardPage /></Protected>} />
    <Route path="/inventory/stock-ledger" element={<Protected><StockLedgerPage /></Protected>} />
    <Route path="/inventory/stock-adjustment" element={<Protected><StockAdjustmentPage /></Protected>} />
    <Route path="/inventory/low-stock" element={<Protected><InventoryListPage type="low" /></Protected>} />
    <Route path="/inventory/out-of-stock" element={<Protected><InventoryListPage type="out" /></Protected>} />
  </>;
}
