import axios from "axios";
import { refreshToken, logout } from "../utils/auth";

// Thiết lập instance của Axios
const API = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:5002") + "/api", // Đảm bảo đường dẫn API chính xác
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // Mặc định 30s timeout
});

// Interceptor cho requests
API.interceptors.request.use(
  (config) => {
    // Thêm token cho mỗi request
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details for debugging
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, config.params || {});
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor cho responses
API.interceptors.response.use(
  (response) => {
    // Handle successful responses
    console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    // Handle error responses
    console.error(`[API Error] ${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.url || 'UNKNOWN'} - ${error.message}`);
    
    if (error.response) {
      console.error('API Error Response:', error.response.status, error.response.data);
    }
    
    // Xử lý 401 Unauthorized
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized access, redirecting to login');
      localStorage.removeItem('token');
      window.location = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Helper để lấy thông báo lỗi người dùng
function getErrorMessage(error) {
  if (!error.response) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối của bạn.";
  }
  
  switch (error.response.status) {
    case 400:
      return error.response.data?.message || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403:
      return "Bạn không có quyền thực hiện hành động này.";
    case 404:
      return "Không tìm thấy dữ liệu yêu cầu.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
    default:
      return error.response.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
  }
}

export default API;
