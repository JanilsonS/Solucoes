import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const LOGO_URL = "https://customer-assets.emergentagent.com/job_confeitaria-py/artifacts/1g5frcrf_image.png";

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      localStorage.removeItem("mm_token");
      localStorage.removeItem("mm_user");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    // Normalize FastAPI error detail (can be an array of objects) into a readable string
    const detail = e.response?.data?.detail;
    if (detail && typeof detail !== "string") {
      const text = Array.isArray(detail)
        ? detail.map((d) => d?.msg || JSON.stringify(d)).join(", ")
        : JSON.stringify(detail);
      e.response.data.detail = text;
    }
    return Promise.reject(e);
  }
);

export default api;
