import api from "../../../config/api";

// NOTE: `api` already has baseURL ending in "/api" (see src/config/api.jsx),
// so paths here must NOT start with "/api" again — that caused every Woo
// call to hit "/api/api/marketplace/woo/..." and 404.
export const wooProductApi = {
  getWooAccounts: () =>
    api.get("/marketplace/woo/accounts"),

  syncWooProducts: (accountId) =>
    api.post(`/marketplace/woo/accounts/${accountId}/sync-products`),

  getSyncedWooProducts: (accountId, params = {}) =>
    api.get(`/marketplace/woo/accounts/${accountId}/synced-products`, {
      params,
    }),

  getSyncedWooProductDetail: (accountId, wooProductId) =>
    api.get(
      `/marketplace/woo/accounts/${accountId}/synced-products/${wooProductId}`
    ),
};

export default wooProductApi;