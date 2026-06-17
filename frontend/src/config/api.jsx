import axios from "axios";
import { clearAuth } from "./auth";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://backend.teckvora.com/api";
const normalizedBaseUrl = rawBaseUrl.replace(/\/$/, "");

export const API_BASE_URL = normalizedBaseUrl.replace(/\/api$/, "");

const API = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 45000)
});

API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  cfg.headers.Accept = "application/json";
  return cfg;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      clearAuth();
      if (!window.location.pathname.includes("/login")) {
        window.dispatchEvent(new CustomEvent("app_error", { detail: "Your session has expired. Please sign in again." }));
      }
    }
    return Promise.reject(error);
  }
);

export default API;
