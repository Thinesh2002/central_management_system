import api from "../../../config/api";

const BASE_PATH = "/marketplace";

export const marketplaceApi = {
  // Common marketplace accounts
  getAccounts: (params = {}) =>
    api.get(`${BASE_PATH}/accounts`, { params }),

  getAccountById: (accountId) =>
    api.get(`${BASE_PATH}/accounts/${accountId}`),

  createAccount: (payload) =>
    api.post(`${BASE_PATH}/accounts`, payload),

  updateAccount: (accountId, payload) =>
    api.put(`${BASE_PATH}/accounts/${accountId}`, payload),

  patchAccount: (accountId, payload) =>
    api.patch(`${BASE_PATH}/accounts/${accountId}`, payload),

  deleteAccount: (accountId) =>
    api.delete(`${BASE_PATH}/accounts/${accountId}`),

  // Daraz token / sync
  checkAccountToken: (accountId) =>
    api.get(`${BASE_PATH}/accounts/${accountId}/check-token`),

  checkAllDarazTokens: () =>
    api.post(`${BASE_PATH}/tokens/check-all-daraz`),

  manualSync: (accountId, syncType) =>
    api.post(`${BASE_PATH}/accounts/${accountId}/manual-sync`, {
      sync_type: syncType,
    }),

  getDarazReauthUrl: (accountId) =>
    api.get(`${BASE_PATH}/accounts/${accountId}/daraz/reauth-url`),

  // WooCommerce
  connectWooAccount: (payload) =>
    api.post(`${BASE_PATH}/woo/connect`, payload),

  getWooAccounts: () =>
    api.get(`${BASE_PATH}/woo/accounts`),

  testWooAccount: (accountId) =>
    api.post(`${BASE_PATH}/woo/accounts/${accountId}/test`),

  getWooProducts: (accountId, params = {}) =>
    api.get(`${BASE_PATH}/woo/accounts/${accountId}/products`, { params }),

  getWooCategories: (accountId, params = {}) =>
    api.get(`${BASE_PATH}/woo/accounts/${accountId}/categories`, { params }),

  // BrightHub
  connectBrightHubAccount: (payload) =>
    api.post(`${BASE_PATH}/brighthub/connect`, payload),

  getBrightHubAccounts: () =>
    api.get(`${BASE_PATH}/brighthub/accounts`),

  testBrightHubAccount: (accountId) =>
    api.post(`${BASE_PATH}/brighthub/accounts/${accountId}/test`),
};

export default marketplaceApi;