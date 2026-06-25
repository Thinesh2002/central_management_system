import api from "../../../config/api";

const BASE_PATH = "/orders";

const manualOrdersApi = {
  getOrders(params = {}) {
    return api.get(BASE_PATH, { params });
  },

  getSummary(params = {}) {
    return api.get(`${BASE_PATH}/summary`, { params });
  },

  getOrderById(orderId) {
    return api.get(`${BASE_PATH}/${encodeURIComponent(orderId)}`);
  },

  createOrder(data) {
    return api.post(BASE_PATH, data);
  },

  updateOrder(orderId, data) {
    return api.put(`${BASE_PATH}/${encodeURIComponent(orderId)}`, data);
  },

  updateOrderStatus(orderId, data) {
    return api.patch(`${BASE_PATH}/${encodeURIComponent(orderId)}/status`, data);
  },

  deleteOrder(orderId) {
    return api.delete(`${BASE_PATH}/${encodeURIComponent(orderId)}`);
  },

  restoreOrder(orderId) {
    return api.patch(`${BASE_PATH}/${encodeURIComponent(orderId)}/restore`);
  },

  getOrderItems(orderId) {
    return api.get(`${BASE_PATH}/${encodeURIComponent(orderId)}/items`);
  },

  addOrderItem(orderId, data) {
    return api.post(`${BASE_PATH}/${encodeURIComponent(orderId)}/items`, data);
  },

  updateOrderItem(itemId, data) {
    return api.put(`${BASE_PATH}/items/${encodeURIComponent(itemId)}`, data);
  },

  deleteOrderItem(itemId) {
    return api.delete(`${BASE_PATH}/items/${encodeURIComponent(itemId)}`);
  },

  restoreOrderItem(itemId) {
    return api.patch(`${BASE_PATH}/items/${encodeURIComponent(itemId)}/restore`);
  },

  getOrderLogs(orderId) {
    return api.get(`${BASE_PATH}/${encodeURIComponent(orderId)}/logs`);
  },
};

export default manualOrdersApi;