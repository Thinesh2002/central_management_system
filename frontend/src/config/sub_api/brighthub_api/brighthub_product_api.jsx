import api from "../../../config/api";

// NOTE: `api` already has baseURL ending in "/api", so paths here must NOT
// start with "/api" again (same gotcha documented in woo_product_api.jsx).
export const brighthubProductApi = {
  getBrightHubAccounts: () => api.get("/marketplace/brighthub/accounts"),

  syncBrightHubProducts: (accountId) =>
    api.post(`/marketplace/brighthub/accounts/${accountId}/sync-products`),

  getSyncedBrightHubProducts: (accountId, params = {}) =>
    api.get(`/marketplace/brighthub/accounts/${accountId}/synced-products`, { params }),

  getSyncedBrightHubProductDetail: (accountId, bhid) =>
    api.get(`/marketplace/brighthub/accounts/${accountId}/synced-products/${bhid}`),

  getLiveBrightHubProduct: (accountId, bhid) =>
    api.get(`/marketplace/brighthub/accounts/${accountId}/products/${bhid}/live`),

  createBrightHubProduct: (accountId, payload) =>
    api.post(`/marketplace/brighthub/accounts/${accountId}/products`, payload),

  updateBrightHubProduct: (accountId, bhid, payload) =>
    api.put(`/marketplace/brighthub/accounts/${accountId}/products/${bhid}`, payload),

  deleteBrightHubProduct: (accountId, bhid) =>
    api.delete(`/marketplace/brighthub/accounts/${accountId}/products/${bhid}`),
};

export default brighthubProductApi;
