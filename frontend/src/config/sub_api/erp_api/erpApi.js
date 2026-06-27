import api from '../../api';

function unwrap(response) {
  return response?.data?.data ?? response?.data?.rows ?? response?.data ?? response;
}

export const erpApi = {
  unwrap,
  businessDashboard(params = {}) { return api.get('/erp/business-dashboard', { params }); },
  priceDashboard(params = {}) { return api.get('/erp/price-dashboard', { params }); },
  recalculatePrices() { return api.post('/erp/price-dashboard/recalculate'); },
  imageDashboard(params = {}) { return api.get('/erp/image-dashboard', { params }); },
  runImageAudit() { return api.post('/erp/image-dashboard/audit'); },
  updateImageUrl(id, data = {}) { return api.patch(`/erp/image-dashboard/${encodeURIComponent(id)}/url`, data); },
  setMainImage(id) { return api.post(`/erp/image-dashboard/${encodeURIComponent(id)}/set-main`); },
  pushImage(data = {}) { return api.post('/erp/image-dashboard/push-image', data); },
  productMetrics(params = {}) { return api.get('/erp/products/metrics', { params }); },
  suppliersDashboard() { return api.get('/erp/suppliers/dashboard'); },
  suppliers(params = {}) { return api.get('/erp/suppliers', { params }); },
  createSupplier(data = {}) { return api.post('/erp/suppliers', data); },
  getSupplier(id) { return api.get(`/erp/suppliers/${encodeURIComponent(id)}`); },
  updateSupplier(id, data = {}) { return api.put(`/erp/suppliers/${encodeURIComponent(id)}`, data); },
  addSupplierProduct(data = {}) { return api.post('/erp/supplier-products', data); },
  skuEconomics(sku) { return api.get(`/erp/reports/sku-economics/${encodeURIComponent(sku)}`); },
  demandAnalysis(params = {}) { return api.get('/erp/reports/demand-analysis', { params }); },
  skuSearch(sku) { return api.get(`/erp/inventory/sku-search/${encodeURIComponent(sku)}`); },
  pushStock(data = {}) { return api.post('/erp/inventory/push-stock', data); },
  manualStockUpdate(data = {}) { return api.post('/erp/inventory/manual-stock-update', data); },
  autoStockSettings() { return api.get('/erp/inventory/auto-stock-settings'); },
  saveAutoStockSettings(data = {}) { return api.put('/erp/inventory/auto-stock-settings', data); },
  transfer(data = {}) { return api.post('/erp/marketplace/transfer', data); },
};

export default erpApi;
