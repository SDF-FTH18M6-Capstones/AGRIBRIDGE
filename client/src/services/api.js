import axios from "axios";
import { usableToken, refreshSession, tabId, clearSession } from "./tabSession";
import {
  clearAccessToken,
} from "../features/auth/utils/authToken";
import { handleApiError } from "./apiErrors";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});


api.interceptors.request.use(
  async (config) => {

    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      config.headers = config.headers || {};
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    const token = ["/login", "/register"].includes(config.url) ? null : await usableToken();
    config.headers["X-Tab-ID"] = tabId();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(handleApiError(error))
);


api.interceptors.response.use(
  (response) => {
    if (!['get','head','options'].includes(response.config.method || 'get')) window.dispatchEvent(new Event('agribridge:resource-invalidated'));
    return response;
  },
  async (error) => {
    const status = error.response?.status;

    if (status === 401 && !error.config?._renewed && !['/login','/register','/sessions/reauthenticate'].includes(error.config?.url) && sessionStorage.getItem('agribridge_refresh_token')) {
      try { await refreshSession(); return api({ ...error.config, _renewed: true }); }
      catch { /* Expired/revoked refresh credentials must not restore the session. */ }
    }
    if (status === 403 && error.response?.data?.error?.code === 'REAUTH_REQUIRED' && !error.config?._reauthenticated) {
      await new Promise((resolve, reject) => window.dispatchEvent(new CustomEvent('agribridge:reauthenticate', { detail: { resolve, reject } })));
      return api({ ...error.config, _reauthenticated: true });
    }
    if (status === 401 && !['/login','/register'].includes(error.config?.url)) {
      clearAccessToken(); clearSession();

      window.dispatchEvent(
        new CustomEvent("agribridge:unauthorized")
      );
    }

    if (status === 403) {
      console.warn(
        "Access denied. You do not have permission to perform this action."
      );
    }

    return Promise.reject(handleApiError(error));
  }
);

export default api;