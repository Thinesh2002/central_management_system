import api from "../../api";

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

const priceRulesApi = {
  async list(params = {}) {
    const response = await api.get("/product-management/price-rules", { params: cleanParams(params) });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/product-management/price-rules/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post("/product-management/price-rules", payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await api.put(`/product-management/price-rules/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/product-management/price-rules/${id}`);
    return response.data;
  },
};

export default priceRulesApi;
