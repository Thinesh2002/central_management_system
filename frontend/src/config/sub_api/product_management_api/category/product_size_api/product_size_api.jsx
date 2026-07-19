import api from "../../../../api";

const PRODUCT_SIZE_BASE_URL = "/product-management/sizes";

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

const productSizeApi = {
  async getAll(params = {}) {
    const response = await api.get(PRODUCT_SIZE_BASE_URL, {
      params: cleanParams(params),
    });

    return response.data;
  },

  async getById(id) {
    const response = await api.get(`${PRODUCT_SIZE_BASE_URL}/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post(PRODUCT_SIZE_BASE_URL, payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await api.put(`${PRODUCT_SIZE_BASE_URL}/${id}`, payload);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`${PRODUCT_SIZE_BASE_URL}/${id}`);
    return response.data;
  },

  async restore(id) {
    const response = await api.patch(`${PRODUCT_SIZE_BASE_URL}/${id}/restore`);
    return response.data;
  },

  async forceDelete(id) {
    const response = await api.delete(`${PRODUCT_SIZE_BASE_URL}/${id}/force`);
    return response.data;
  },
};

export default productSizeApi;
