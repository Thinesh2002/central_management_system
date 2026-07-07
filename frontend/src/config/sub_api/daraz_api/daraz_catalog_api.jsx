import api from "../../../config/api";

const LONG_TIMEOUT = 300000;

export const darazCatalogApi = {
  categoryTree: (accountId) =>
    api.get(`/daraz-catalog/category-tree/${accountId}`, { timeout: LONG_TIMEOUT }),

  categoryAttributes: (accountId, params = {}) =>
    api.get(`/daraz-catalog/category-attributes/${accountId}`, { params, timeout: LONG_TIMEOUT }),

  brands: (accountId, params = {}) =>
    api.get(`/daraz-catalog/brands/${accountId}`, { params, timeout: LONG_TIMEOUT }),

  qcStatus: (accountId, params = {}) =>
    api.get(`/daraz-catalog/qc-status/${accountId}`, { params, timeout: LONG_TIMEOUT }),

  createProduct: (accountId, payload = {}) =>
    api.post(`/daraz-catalog/product/${accountId}`, payload, { timeout: LONG_TIMEOUT }),

  migrateImage: (accountId, imageUrl) =>
    api.post(`/daraz-catalog/image/migrate/${accountId}`, { image_url: imageUrl }, { timeout: LONG_TIMEOUT }),

  migrateImages: (accountId, imageUrls = []) =>
    api.post(`/daraz-catalog/image/migrate-batch/${accountId}`, { image_urls: imageUrls }, { timeout: LONG_TIMEOUT }),

  imageMigrationResult: (accountId, batchId) =>
    api.get(`/daraz-catalog/image/migrate-result/${accountId}`, { params: { batch_id: batchId }, timeout: LONG_TIMEOUT }),

  setImages: (accountId, skuId, imageUrls = []) =>
    api.post(`/daraz-catalog/image/set/${accountId}`, { sku_id: skuId, image_urls: imageUrls }, { timeout: LONG_TIMEOUT }),

  uploadImage: (accountId, file) => {
    const form = new FormData();
    form.append("image", file);
    return api.post(`/daraz-catalog/image/upload/${accountId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: LONG_TIMEOUT,
    });
  },
};
