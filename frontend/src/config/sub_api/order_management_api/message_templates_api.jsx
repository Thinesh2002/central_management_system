import api from "../../../config/api";

const BASE_URL = "/order-management/message-templates";

const messageTemplatesApi = {
  async list() {
    const response = await api.get(BASE_URL);
    return response.data;
  },

  async create(payload) {
    const response = await api.post(BASE_URL, payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await api.patch(`${BASE_URL}/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response.data;
  },
};

export default messageTemplatesApi;
