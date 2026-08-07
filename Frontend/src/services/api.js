// services/api.js
import axios from "axios";

// ✅ Automatically detect and use the correct host
const getBaseURL = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Check if we're running on localhost or 127.0.0.1
  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocal) {
    // Use the same hostname as the frontend
    return `http://${hostname}:5555/api`;
  }

  // Production fallback
  return "https://your-backend-url.onrender.com/api";
};

const API_URL = getBaseURL();

console.log("🔗 API Base URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log the request for debugging
    console.log(`🚀 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error(
      `❌ ${error.config?.url}`,
      error.response?.status || error.message,
    );
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
