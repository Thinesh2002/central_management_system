import api from "../api";

export const notificationsApi = {
  list: (params = {}) => api.get("/notifications", { params }),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
};

export default notificationsApi;
