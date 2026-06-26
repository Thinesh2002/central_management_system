import api from '../api';

export const inventoryApi = {
  dashboard(params = {}) { return api.get('/inventory/dashboard', { params }); },
  list(params = {}) { return api.get('/inventory', { params }); },
  ledger(params = {}) { return api.get('/inventory/stock-ledger', { params }); },
  adjust(data = {}) { return api.post('/inventory/stock-adjustment', data); },
  lowStock(params = {}) { return api.get('/inventory/low-stock', { params }); },
  outOfStock(params = {}) { return api.get('/inventory/out-of-stock', { params }); },
};

export default inventoryApi;
