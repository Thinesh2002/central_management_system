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
  getWooCategories: (accountId, params = {}) =>
    api.get(`/marketplace/woo/accounts/${accountId}/categories`, { params }),

  getWooAttributes: (accountId, params = {}) =>
    api.get(`/marketplace/woo/accounts/${accountId}/attributes`, { params }),

  createWooProduct: (accountId, payload = {}) =>
    api.post(`/marketplace/woo/accounts/${accountId}/products`, payload),

  updateWooProduct: (accountId, wooProductId, payload = {}) =>
    api.put(`/marketplace/woo/accounts/${accountId}/products/${wooProductId}`, payload),

  patchWooProduct: (accountId, wooProductId, payload = {}) =>
    api.patch(`/marketplace/woo/accounts/${accountId}/products/${wooProductId}`, payload),

  transferLocalProduct: (productId, payload = {}) =>
    api.post(`/marketplace/woo/transfer-local/${productId}`, payload),
};

export default wooProductApi;