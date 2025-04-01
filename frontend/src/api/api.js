import axios from "axios";
import { refreshToken, logout } from "../utils/auth";

// Thiết lập instance của Axios
const API = axios.create({
  baseURL: "/api", // Tất cả api call sẽ có prefix là /api
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor cho requests
API.interceptors.request.use(
  (config) => {
    // Thêm token cho mỗi request
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

// Interceptor cho responses
API.interceptors.response.use(
  (response) => {
    console.log("[API Response]", `${response.config.method.toUpperCase()} ${response.config.url}:`, response.data);
    return response;
  },
  async (error) => {
    // Kiểm tra lỗi để hiển thị log có ý nghĩa
    console.error("[API Error]", `${error.config.method.toUpperCase()} ${error.config.url}:`, error);

    // Xử lý lỗi 401 Unauthorized - Token hết hạn
    if (error.response && error.response.status === 401) {
      try {
        // Thử refresh token
        const newToken = await refreshToken();
        if (newToken) {
          // Thử lại request với token mới
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return API(error.config);
        } else {
          // Nếu không refresh được, logout
          logout();
          window.location.href = "/login";
        }
      } catch (e) {
        // Lỗi khi refresh token, logout
        logout();
        window.location.href = "/login";
      }
    }

    // Trả về lỗi cho client xử lý
    return Promise.reject(error);
  }
);

export default API;
