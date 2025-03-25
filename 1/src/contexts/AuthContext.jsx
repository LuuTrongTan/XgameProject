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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const response = await axios.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      if (!credentials?.email?.trim() || !credentials?.password) {
        throw new Error("Vui lòng điền đầy đủ thông tin");
      }

      const response = await axios.post("/api/auth/login", credentials);
      console.log("Login response:", response);

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Đăng nhập thất bại");
      }

      const { token, user } = response.data.data;
      localStorage.setItem("token", token);
      setUser(user);
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Đăng nhập thất bại"
      );
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post("/api/auth/register", userData);
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      setUser(user);
      return user;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Đăng ký thất bại");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateUserProfile = async (userData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put("/api/users/profile", userData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Cập nhật thông tin thất bại"
      );
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
