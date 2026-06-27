import api from '../../api';

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function withDateRange(params = {}) {
  const end = params.end_time || params.date_to || dateOnly(new Date());
  const start = params.start_time || params.date_from || dateOnly(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  return { ...params, start_time: start, end_time: end, date_from: start, date_to: end };
}

export const darazFinanceApi = {
  checkPermission(params = {}) { return api.get('/marketplace/daraz/finance/check-permission', { params }); },
  payoutStatus(params = {}) { return api.get('/marketplace/daraz/finance/payout/status', { params: withDateRange(params) }); },
  transactions(params = {}) { return api.get('/marketplace/daraz/finance/transactions', { params: withDateRange(params) }); },
  summary(params = {}) { return api.get('/marketplace/daraz/finance/summary', { params: withDateRange(params) }); },
  order(orderNo, params = {}) { return api.get(`/marketplace/daraz/finance/orders/${encodeURIComponent(orderNo)}`, { params: withDateRange(params) }); },
  sync(data = {}) { return api.post('/marketplace/daraz/finance/sync', withDateRange(data)); },
};

export default darazFinanceApi;
