import api from '../api';

export const financeApi = {
  summary(params = {}) { return api.get('/finance/net-sales/summary', { params }); },
  daily(params = {}) { return api.get('/finance/net-sales/daily', { params }); },
  channelWise(params = {}) { return api.get('/finance/net-sales/channel-wise', { params }); },
  orderWise(params = {}) { return api.get('/finance/net-sales/order-wise', { params }); },
  topProducts(params = {}) { return api.get('/finance/net-sales/top-products', { params }); },
  expenses(params = {}) { return api.get('/finance/net-sales/expenses', { params }); },
  createExpense(data = {}) { return api.post('/finance/expenses', data); },
  updateExpense(id, data = {}) { return api.put(`/finance/expenses/${encodeURIComponent(id)}`, data); },
  deleteExpense(id) { return api.delete(`/finance/expenses/${encodeURIComponent(id)}`); },
  recalculate(data = {}) { return api.post('/finance/recalculate', data); },
};

export default financeApi;
