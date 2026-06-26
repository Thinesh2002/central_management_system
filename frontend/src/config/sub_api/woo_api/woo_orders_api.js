import api from '../../api';

export const wooOrdersApi = {
  list(params = {}) { return api.get('/woo/orders', { params }); },
  sync(data = {}) { return api.post('/woo/orders/sync', data); },
  detail(id) { return api.get(`/woo/orders/${encodeURIComponent(id)}`); },
  updateStatus(id, data = {}) { return api.put(`/woo/orders/${encodeURIComponent(id)}/status`, data); },
  financeSummary(params = {}) { return api.get('/woo/finance/summary', { params }); },
};

export default wooOrdersApi;
