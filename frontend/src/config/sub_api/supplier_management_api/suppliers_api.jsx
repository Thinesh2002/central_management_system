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

const suppliersApi = {
  async list(params = {}) {
    const response = await api.get("/suppliers", { params: cleanParams(params) });
    return response.data;
  },

  async options() {
    const response = await api.get("/suppliers/options");
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post("/suppliers", payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await api.put(`/suppliers/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/suppliers/${id}`);
    return response.data;
  },
};

export default suppliersApi;
