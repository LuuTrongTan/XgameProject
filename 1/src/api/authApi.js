import API from "./api";

export const authApi = {
  login: async (credentials) => {
    try {
      const response = await API.post("/auth/login", credentials);
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await API.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const response = await API.post("/auth/logout");
      return response.data;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },

  // Refresh token if needed
  refreshToken: async () => {
    try {
      const response = await API.post("/auth/refresh");
      return response.data;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  },

  // Verify token
  verifyToken: async () => {
    try {
      const response = await API.get("/auth/verify");
      return response.data;
    } catch (error) {
      console.error("Token verification error:", error);
      throw error;
    }
  },
};
