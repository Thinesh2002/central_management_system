import axios from "axios";
import { getToken, logout } from "./auth";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL &&
    import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta.env.VITE_API_URL &&
    `${import.meta.env.VITE_API_URL.trim().replace(/\/$/, "")}/api`) ||
  "https://backend.teckvora.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

    if (error.response?.status === 401 && !isLoginRequest) {
      logout();
    }

    // Attach a consistent, human readable message so every page can
    // safely read `err.friendlyMessage` regardless of how the backend
    // failed (network error, timeout, validation error, server error).
    if (!error.response) {
      error.friendlyMessage = error.code === "ECONNABORTED"
        ? "Request timed out. Please check your connection and try again."
        : "Unable to reach the server. Please check your network connection.";
    } else {
      error.friendlyMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        `Request failed with status ${error.response.status}.`;
    }

    return Promise.reject(error);
  }
);

export function getApiError(error, fallback = "Something went wrong. Please try again.") {
  return error?.friendlyMessage || error.response?.data?.message || error.message || fallback;
}

export default api;
