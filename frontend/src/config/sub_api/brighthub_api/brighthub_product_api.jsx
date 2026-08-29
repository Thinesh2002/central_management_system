import api from "../../../config/api";

// NOTE: `api` already has baseURL ending in "/api", so paths here must NOT
// start with "/api" again (same gotcha as other sub-api modules).
export const brighthubProductApi = {
  getBrightHubAccounts: () => api.get("/marketplace/brighthub/accounts"),

  syncBrightHubProducts: (accountId) =>
    api.post(`/marketplace/brighthub/accounts/${accountId}/sync-products`),

  // Pushes the local catalog (products/categories entered directly in this
  // system, not pulled from BrightHub) OUT to BrightHub. Only ever creates
  // products that haven't been sent before - safe to call anytime.
  pushLocalCatalogToBrightHub: (accountId) =>
    api.post(`/marketplace/brighthub/accounts/${accountId}/push-local-catalog`, null, { timeout: 120000 }),

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

  uploadMedia: (accountId, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/marketplace/brighthub/accounts/${accountId}/media/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
  },

  getBrightHubStockForSkus: (skus = []) =>
    api.post("/marketplace/brighthub/stock-by-skus", { skus }),

  syncBrightHubStockSku: (sku, payload = {}) =>
    api.post(`/marketplace/brighthub/sync-sku/${encodeURIComponent(sku)}`, payload),
};

export default brighthubProductApi;
