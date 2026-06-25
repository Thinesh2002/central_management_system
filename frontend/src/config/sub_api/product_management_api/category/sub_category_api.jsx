import api from "../../../api";

export const subCategoryApi = {
  getAll(params = {}) {
    return api.get("/product/sub-categories", { params });
  },

  getById(id) {
    return api.get(`/product/sub-categories/${id}`);
  },

  create(data) {
    return api.post("/product/sub-categories", data);
  },

  update(id, data) {
    return api.put(`/product/sub-categories/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/sub-categories/${id}`);
  },
};