import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:5002/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add a request interceptor
axiosClient.interceptors.request.use(
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

// Add a response interceptor
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message:
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.",
        isNetworkError: true,
      });
    }

    const originalRequest = error.config;

    // If the error status is 401 and there is no originalRequest._retry flag,
    // it means the token has expired and we need to refresh it
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const response = await axios.post(
          "http://localhost:5002/api/auth/refresh-token",
          {
            refreshToken,
          }
        );

        const { token } = response.data;
        localStorage.setItem("token", token);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axios(originalRequest);
      } catch (error) {
        // If refresh token fails, redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject({
          message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          isAuthError: true,
        });
      }
    }

    // Handle other errors
    return Promise.reject({
      message:
        error.response?.data?.message || error.message || "Đã xảy ra lỗi",
      status: error.response?.status,
      data: error.response?.data,
      isNetworkError: false,
    });
  }
);

export default axiosClient;
