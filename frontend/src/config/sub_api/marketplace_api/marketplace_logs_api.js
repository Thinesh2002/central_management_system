import api from "../../api";

export const marketplaceLogsApi = {
  list: (type, params = {}) => api.get(`/marketplace/logs/${type}`, { params }),
};

export default marketplaceLogsApi;
