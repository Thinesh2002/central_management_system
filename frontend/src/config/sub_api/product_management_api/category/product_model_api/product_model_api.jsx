import api from "../../../../api";

const PRODUCT_MODEL_BASE_URL = "/product-management/models";

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

const productModelApi = {
  async getAll(params = {}) {
    const response = await api.get(PRODUCT_MODEL_BASE_URL, {
      params: cleanParams(params),
    });

    return response.data;
  },

  async getById(id) {
    const response = await api.get(`${PRODUCT_MODEL_BASE_URL}/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post(PRODUCT_MODEL_BASE_URL, payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await api.put(`${PRODUCT_MODEL_BASE_URL}/${id}`, payload);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`${PRODUCT_MODEL_BASE_URL}/${id}`);
    return response.data;
  },

  async restore(id) {
    const response = await api.patch(`${PRODUCT_MODEL_BASE_URL}/${id}/restore`);
    return response.data;
  },

  async forceDelete(id) {
    const response = await api.delete(`${PRODUCT_MODEL_BASE_URL}/${id}/force`);
    return response.data;
  },

  async updateColours(id, colourIds = []) {
    const response = await api.put(`${PRODUCT_MODEL_BASE_URL}/${id}/colours`, {
      colour_ids: colourIds,
    });

    return response.data;
  },
};

export default productModelApi;

export async function getProductModels(params = {}) {
  return productModelApi.getAll(params);
}

export async function getProductModelById(id) {
  return productModelApi.getById(id);
}

export async function createProductModel(payload) {
  return productModelApi.create(payload);
}

export async function updateProductModel(id, payload) {
  return productModelApi.update(id, payload);
}

export async function deleteProductModel(id) {
  return productModelApi.delete(id);
}

export async function restoreProductModel(id) {
  return productModelApi.restore(id);
}

export async function forceDeleteProductModel(id) {
  return productModelApi.forceDelete(id);
}

export async function updateProductModelColours(id, colourIds = []) {
  return productModelApi.updateColours(id, colourIds);
}