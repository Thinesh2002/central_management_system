import api from "../../../config/api";

export const wooProductApi = {
  getWooAccounts: () =>
    api.get("/api/marketplace/woo/accounts"),

  syncWooProducts: (accountId) =>
    api.post(`/api/marketplace/woo/accounts/${accountId}/sync-products`),

  getSyncedWooProducts: (accountId, params = {}) =>
    api.get(`/api/marketplace/woo/accounts/${accountId}/synced-products`, {
      params,
    }),

  getSyncedWooProductDetail: (accountId, wooProductId) =>
    api.get(
      `/api/marketplace/woo/accounts/${accountId}/synced-products/${wooProductId}`
    ),
};

export default wooProductApi;