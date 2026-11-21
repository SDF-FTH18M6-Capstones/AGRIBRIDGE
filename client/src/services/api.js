import axios from "axios";
import {
  getAccessToken,
  clearAccessToken,
} from "../features/auth/utils/authToken";
import { handleApiError } from "./apiErrors";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});


api.interceptors.request.use(
  (config) => {

    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      config.headers = config.headers || {};
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    const token = getAccessToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(handleApiError(error))
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      clearAccessToken();

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