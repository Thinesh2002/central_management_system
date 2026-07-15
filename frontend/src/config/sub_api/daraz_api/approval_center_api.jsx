import api from "../../../config/api";

export const approvalCenterApi = {
  list: (params = {}) => api.get("/daraz/approval-center", { params }),
  approve: (id) => api.post(`/daraz/approval-center/${id}/approve`),
  reject: (id) => api.post(`/daraz/approval-center/${id}/reject`),
};

export default approvalCenterApi;
