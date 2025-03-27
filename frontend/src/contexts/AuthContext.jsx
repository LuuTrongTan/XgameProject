import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Khôi phục user từ localStorage khi khởi tạo
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Lưu user vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // Cấu hình interceptor cho axios
  useEffect(() => {
    // Thêm token vào tất cả request
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Xử lý token hết hạn
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 (Unauthorized) và chưa thử refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Thử refresh token hoặc đăng nhập lại
            await checkAuth(true);

            // Thử lại request với token mới
            const token = localStorage.getItem("token");
            if (token) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error("Không thể làm mới phiên đăng nhập:", refreshError);
            // Xóa token nếu không thể làm mới
            logout();
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Kiểm tra xác thực khi khởi động
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (forceRefresh = false) => {
    try {
      setAuthError(null);
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (!token || !savedUser) {
        console.log("Không tìm thấy thông tin đăng nhập, cần đăng nhập lại");
        setUser(null);
        setLoading(false);
        setAuthInitialized(true);
        return false;
      }

      // Sử dụng thông tin user từ localStorage trước
      if (!forceRefresh && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      }

      // Kiểm tra token với backend
      console.log("Đang kiểm tra phiên đăng nhập...");
      const response = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.data) {
        console.log("Đăng nhập thành công với user:", response.data.data);
        // Cập nhật user nếu có thông tin mới từ server
        localStorage.setItem("user", JSON.stringify(response.data.data));
        setUser(response.data.data);
        setLoading(false);
        setAuthInitialized(true);
        return true;
      } else {
        console.log("API trả về dữ liệu không hợp lệ");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setLoading(false);
        setAuthInitialized(true);
        return false;
      }
    } catch (error) {
      console.error("Lỗi kiểm tra phiên đăng nhập:", error);

      // Xử lý lỗi cụ thể
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setAuthError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
      } else {
        setAuthError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      }

      setUser(null);
      setLoading(false);
      setAuthInitialized(true);
      return false;
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setAuthError(null);

      if (!credentials?.email?.trim() || !credentials?.password) {
        throw new Error("Vui lòng điền đầy đủ thông tin");
      }

      console.log("Đang đăng nhập với email:", credentials.email);
      const response = await axios.post("/api/auth/login", credentials);

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Đăng nhập thất bại");
      }

      console.log("Đăng nhập thành công:", response.data);
      const { token, user } = response.data.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      return response.data;
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Đăng nhập thất bại";
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setAuthError(null);

      const response = await axios.post("/api/auth/register", userData);
      console.log("Đăng ký thành công:", response.data);

      const { token, user } = response.data;
      localStorage.setItem("token", token);
      setUser(user);
      return user;
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      const errorMessage = error.response?.data?.message || "Đăng ký thất bại";
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log("Đăng xuất người dùng");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAuthError(null);
  };

  const updateUserProfile = async (userData) => {
    try {
      setLoading(true);

      const response = await axios.put("/api/users/profile", userData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Cập nhật thông tin thành công:", response.data);
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi cập nhật thông tin:", error);
      throw new Error(
        error.response?.data?.message || "Cập nhật thông tin thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    authError,
    authInitialized,
    login,
    register,
    logout,
    updateUserProfile,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
