
import axios from "axios";

const api = axios.create({
  baseURL: "https://gardastok.cloud/api",
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window === "undefined") {
      return config;
    }

    const url = (config.url ?? "").replace(/^\/+/, "");
    const isPublicAuthEndpoint =
      url === "login" ||
      url === "register";

    if (isPublicAuthEndpoint) {
      // Login dan registrasi tidak memerlukan token lama.
      delete config.headers.Authorization;
      return config;
    }

    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
