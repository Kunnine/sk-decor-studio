import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const AUTH_SYNC_EVENT = "auth:sync";
export const AUTH_FORBIDDEN_EVENT = "auth:forbidden";

const api = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // When sending FormData, delete Content-Type so the browser automatically attaches the correct boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_permissions");
      localStorage.removeItem("auth_settings");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AUTH_SYNC_EVENT));
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    } else if (status === 403 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_FORBIDDEN_EVENT));
    }
    return Promise.reject(error);
  },
);

export default api;
