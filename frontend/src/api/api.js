import axios from "axios";
import { refreshToken, logout } from "../utils/auth";

// Thiết lập instance của Axios
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5002/api", // Update fallback to include full backend URL
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
    
    // Log request khi bắt đầu gửi
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
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
    if (error.response) {
      // Lỗi có phản hồi từ server (status code không phải 2xx)
      console.error(
        "[API Error]", 
        `${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.url || 'UNKNOWN'} (${error.response.status}):`, 
        error.response.data
      );
      
      // Xử lý các loại lỗi cụ thể dựa trên mã status
      switch (error.response.status) {
        case 400:
          console.error("Bad Request - Check data format:", error.response.data);
          break;
        case 401:
          console.error("Unauthorized - Token invalid or expired");
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
            console.error("Token refresh failed:", e);
            logout();
            window.location.href = "/login";
          }
          break;
        case 403:
          console.error("Forbidden - Not enough permissions");
          break;
        case 404:
          console.error("Not Found - Resource doesn't exist");
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          console.error("Server Error:", error.response.data);
          break;
      }
    } else if (error.request) {
      // Lỗi không nhận được phản hồi từ server
      console.error("[API Network Error]", `${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.url || 'UNKNOWN'}:`, "No response received");
      
      // Check specifically for timeout
      if (error.code === 'ECONNABORTED') {
        console.error("Request timed out");
      }
    } else {
      // Lỗi khi thiết lập request
      console.error("[API Config Error]", error.message);
    }

    // Trả về lỗi chi tiết hơn cho client xử lý
    return Promise.reject({
      ...error,
      isNetworkError: !error.response,
      isTimeout: error.code === 'ECONNABORTED',
      isServerError: error.response && error.response.status >= 500,
      customMessage: getErrorMessage(error)
    });
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
