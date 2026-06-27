import React from "react";
import { Route } from "react-router-dom";

import Layout from "../../components/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

import MarketplaceAccountsPage from "../../pages/marketplace_management/marketplace_accounts_page";
import AddMarketplaceAccountPage from "../../pages/marketplace_management/add_marketplace_account_page";
import MarketplaceAccountDetailsPage from "../../pages/marketplace_management/marketplace_account_details_page";
import EditMarketplaceAccountPage from "../../pages/marketplace_management/edit_marketplace_account_page";
import SkuMappingsPage from "../../pages/marketplace_management/sku_mappings_page";
import MarketplaceLogsPage from "../../pages/marketplace_management/logs_page";

function ProtectedMarketplacePage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function MarketplaceManagementRoutes() {
  return (
    <>
      <Route
        path="/marketplace/accounts"
        element={
          <ProtectedMarketplacePage>
            <MarketplaceAccountsPage />
          </ProtectedMarketplacePage>
        }
      />

      <Route
        path="/marketplace/accounts/add"
        element={
          <ProtectedMarketplacePage>
            <AddMarketplaceAccountPage />
          </ProtectedMarketplacePage>
        }
      />

      <Route
        path="/marketplace/accounts/:accountId"
        element={
          <ProtectedMarketplacePage>
            <MarketplaceAccountDetailsPage />
          </ProtectedMarketplacePage>
        }
      />

            <Route
        path="/marketplace/accounts/:accountId/edit"
        element={
          <ProtectedMarketplacePage>
            <EditMarketplaceAccountPage />
          </ProtectedMarketplacePage>
        }
      />

      <Route
        path="/marketplace/sku-mappings"
        element={
          <ProtectedMarketplacePage>
            <SkuMappingsPage />
          </ProtectedMarketplacePage>
        }
      />

      <Route
        path="/marketplace/logs"
        element={
          <ProtectedMarketplacePage>
            <MarketplaceLogsPage />
          </ProtectedMarketplacePage>
        }
      />

      <Route
        path="/marketplace/logs/:type"
        element={
          <ProtectedMarketplacePage>
            <MarketplaceLogsPage />
          </ProtectedMarketplacePage>
        }
      />
    </>
  );
}
