import api from "../../api";

const SKU_MAPPING_BASE_URL = "/product-management/sku-mappings";

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

const skuMappingApi = {
  async getAll(params = {}) {
    const response = await api.get(SKU_MAPPING_BASE_URL, { params: cleanParams(params) });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`${SKU_MAPPING_BASE_URL}/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post(SKU_MAPPING_BASE_URL, payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await api.put(`${SKU_MAPPING_BASE_URL}/${id}`, payload);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`${SKU_MAPPING_BASE_URL}/${id}`);
    return response.data;
  },

  async getSuggestions(params = {}) {
    const response = await api.get(`${SKU_MAPPING_BASE_URL}/suggestions`, { params: cleanParams(params) });
    return response.data;
  },
};

export default skuMappingApi;
