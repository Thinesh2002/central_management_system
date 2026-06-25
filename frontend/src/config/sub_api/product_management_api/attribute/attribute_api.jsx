import api from "../../../api";

export const attributeApi = {
  getAll(params = {}) {
    return api.get("/product/attributes", { params });
  },

  getById(id) {
    return api.get(`/product/attributes/${id}`);
  },

  create(data) {
    return api.post("/product/attributes", data);
  },

  update(id, data) {
    return api.put(`/product/attributes/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/attributes/${id}`);
  },
};