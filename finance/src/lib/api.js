import axios from "axios";
import { getToken, logout } from "./auth";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  "https://backend.teckvora.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) logout();
    return Promise.reject(error);
  }
);

export function getApiError(error, fallback = "Something went wrong. Please try again.") {
  if (!error?.response) {
    return error?.code === "ECONNABORTED"
      ? "Request timed out. Please check your connection and try again."
      : "Unable to reach the server. Please check your network connection.";
  }
  return error.response?.data?.message || fallback;
}

export const authApi = {
  login: (identifier, password) => api.post("/auth/login", { identifier, password }),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const financeApi = {
  access: () => api.get("/finance/access"),
  dashboard: (params) => api.get("/finance/dashboard", { params }),
  categories: (params) => api.get("/finance/categories", { params }),
  createCategory: (payload) => api.post("/finance/categories", payload),
  updateCategory: (id, payload) => api.put(`/finance/categories/${id}`, payload),
  deleteCategory: (id) => api.delete(`/finance/categories/${id}`),
  entries: (params) => api.get("/finance/entries", { params }),
  createEntry: (payload) => api.post("/finance/entries", payload),
  updateEntry: (id, payload) => api.put(`/finance/entries/${id}`, payload),
  deleteEntry: (id) => api.delete(`/finance/entries/${id}`),
  darazAccounts: () => api.get("/finance/daraz/accounts"),
  darazSummary: (params) => api.get("/finance/daraz/summary", { params }),
  darazOrders: (params) => api.get("/finance/daraz/orders", { params }),
  darazOrderLines: (accountId, orderNo) =>
    api.get(`/finance/daraz/orders/${accountId}/${encodeURIComponent(orderNo)}`),
  darazFeeTypes: (params) => api.get("/finance/daraz/fee-types", { params }),
  darazStatements: (params) => api.get("/finance/daraz/statements", { params }),
  darazAccountTransactions: (params) => api.get("/finance/daraz/account-transactions", { params }),
  syncDaraz: (accountId, payload) => api.post(`/finance/daraz/sync/${accountId}`, payload, { timeout: 180000 }),
};

export default api;
