import axios from "axios";

const API = axios.create({
  baseURL: "/api", // Sử dụng đường dẫn proxy tương đối thay vì URL trực tiếp
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Bật hỗ trợ cookie
});

// Thêm interceptor để xử lý token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Thêm interceptor để xử lý lỗi và log
API.interceptors.response.use(
  (response) => {
    console.log(
      `[API Response] ${response.config.method.toUpperCase()} ${
        response.config.url
      }:`,
      response.data
    );
    return response;
  },
  (error) => {
    console.error(
      `[API Error] ${error.config?.method?.toUpperCase()} ${
        error.config?.url
      }:`,
      error
    );
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;
