import api from "../../../api";

function validateCategoryId(id) {
  if (!id || !/^\d+$/.test(String(id))) {
    throw new Error("Category ID is missing or invalid");
  }
}

export const categoryApi = {
  getAll(params = {}) {
    return api.get("/product/categories", { params });
  },

  getById(id) {
    validateCategoryId(id);
    return api.get(`/product/categories/${id}`);
  },

  create(data) {
    return api.post("/product/categories", data);
  },

  update(id, data) {
    validateCategoryId(id);
    return api.put(`/product/categories/${id}`, data);
  },

  delete(id) {
    validateCategoryId(id);
    return api.delete(`/product/categories/${id}`);
  },

  restore(id) {
    validateCategoryId(id);
    return api.patch(`/product/categories/${id}/restore`);
  },
};