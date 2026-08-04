import api from "../../../config/api";

// NOTE: `api` already has baseURL ending in "/api", so paths here must NOT
// start with "/api" again (same gotcha documented in brighthub_product_api.jsx).
export const brighthubOrderApi = {
  getBrightHubOrders: (accountId, params = {}) =>
    api.get(`/marketplace/brighthub/accounts/${accountId}/orders`, { params }),

  getBrightHubOrderDetail: (accountId, orderId) =>
    api.get(`/marketplace/brighthub/accounts/${accountId}/orders/${orderId}`),

  updateBrightHubOrderStatus: (accountId, orderId, status) =>
    api.put(`/marketplace/brighthub/accounts/${accountId}/orders/${orderId}/status`, { status }),
};

export default brighthubOrderApi;
