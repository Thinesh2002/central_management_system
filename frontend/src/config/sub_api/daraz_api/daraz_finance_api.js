import api from '../../api';

export const darazFinanceApi = {
  checkPermission(params = {}) { return api.get('/marketplace/daraz/finance/check-permission', { params }); },
  payoutStatus(params = {}) { return api.get('/marketplace/daraz/finance/payout/status', { params }); },
  transactions(params = {}) { return api.get('/marketplace/daraz/finance/transactions', { params }); },
  summary(params = {}) { return api.get('/marketplace/daraz/finance/summary', { params }); },
  order(orderNo, params = {}) { return api.get(`/marketplace/daraz/finance/orders/${encodeURIComponent(orderNo)}`, { params }); },
  sync(data = {}) { return api.post('/marketplace/daraz/finance/sync', data); },
};

export default darazFinanceApi;
