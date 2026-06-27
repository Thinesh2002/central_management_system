import api from "../../../config/api";

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