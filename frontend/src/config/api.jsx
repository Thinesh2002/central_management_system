import axios from "axios";
import { getToken, logout } from "./auth";function cleanBaseUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return "https://backend.teckvora.com/api";

  const withoutTrailingSlash = raw.replace(/\/+$/, "");

  if (withoutTrailingSlash === "/api" || withoutTrailingSlash.endsWith("/api")) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/api`;
}

const apiBaseUrl = cleanBaseUrl(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
);

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
    }
    return Promise.reject(error);
  }
);

export function getApiError(error, fallback = "Something went wrong. Please try again.") {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

export function getApiBaseUrl() {
  return apiBaseUrl;
.message || fallback;
r.message || fallback;
}

export default api;
