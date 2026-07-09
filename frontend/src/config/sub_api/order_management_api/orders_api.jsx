import api from "../../../config/api";

const ORDERS_BASE_URL = "/order-management/orders";
const DARAZ_ACTIONS_URL = "/order-management/daraz-actions";
const SYNC_SETTINGS_URL = "/order-management/sync-settings";

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

const ordersApi = {
  async listOrders(params = {}) {
    const response = await api.get(ORDERS_BASE_URL, { params: cleanParams(params) });
    return response.data;
  },

  async getOrder(source, id) {
    const response = await api.get(`${ORDERS_BASE_URL}/${source}/${id}`);
    return response.data;
  },

  async filterOptions() {
    const response = await api.get(`${ORDERS_BASE_URL}/filter-options`);
    return response.data;
  },

  async updateStatus(source, id, payload) {
    const response = await api.patch(`${ORDERS_BASE_URL}/${source}/${id}/status`, payload);
    return response.data;
  },

  async createWaybill(source, id, payload) {
    const response = await api.post(`${ORDERS_BASE_URL}/${source}/${id}/waybill`, payload);
    return response.data;
  },

  async getTracking(source, id) {
    const response = await api.get(`${ORDERS_BASE_URL}/${source}/${id}/tracking`);
    return response.data;
  },

  async getFinance(source, id) {
    const response = await api.get(`${ORDERS_BASE_URL}/${source}/${id}/finance`);
    return response.data;
  },

  async createManualOrder(payload) {
    const response = await api.post(ORDERS_BASE_URL, payload);
    return response.data;
  },

  async darazBulkAction(payload) {
    const response = await api.post(DARAZ_ACTIONS_URL, payload);
    return response.data;
  },

  async getSyncSettings() {
    const response = await api.get(SYNC_SETTINGS_URL);
    return response.data;
  },

  async updateSyncSettings(payload) {
    const response = await api.put(SYNC_SETTINGS_URL, payload);
    return response.data;
  },

  async runSyncNow() {
    const response = await api.post(`${SYNC_SETTINGS_URL}/run-now`);
    return response.data;
  },
};

export default ordersApi;
