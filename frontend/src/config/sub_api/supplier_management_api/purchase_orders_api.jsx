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

const purchaseOrdersApi = {
  async list(params = {}) {
    const response = await api.get("/purchase-orders", { params: cleanParams(params) });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },

  async nextNumber() {
    const response = await api.get("/purchase-orders/next-number");
    return response.data;
  },

  async create(payload) {
    const response = await api.post("/purchase-orders", payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await api.put(`/purchase-orders/${id}`, payload);
    return response.data;
  },

  async updateStatus(id, status) {
    const response = await api.put(`/purchase-orders/${id}/status`, { status });
    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/purchase-orders/${id}`);
    return response.data;
  },
};

export default purchaseOrdersApi;
