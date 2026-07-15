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

const grnApi = {
  async list(params = {}) {
    const response = await api.get("/grn", { params: cleanParams(params) });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/grn/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post("/grn", payload);
    return response.data;
  },
};

export default grnApi;
