import api from "../../api";

export const globalSearchApi = {
  search: (params = {}) => api.get("/global-search", { params }),
};

export default globalSearchApi;
