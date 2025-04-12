import API from "./api";

export const profileApi = {
  getProfile: async () => {
    try {
      console.log("Fetching profile...");
      const response = await API.get("/auth/me");
      console.log("Raw profile response:", response);

      const profileData = response.data.data;
      console.log("Exact profile data from API:", profileData);

      // Map dữ liệu từ API sang định dạng component cần
      const mappedData = {
        fullName:
          profileData?.name || profileData?.fullName || profileData?.username, // Thử các trường có thể chứa tên
        email: profileData?.email,
        role: profileData?.role,
        joinDate: profileData?.joinDate || profileData?.createdAt, // Thêm createdAt như một lựa chọn
        lastLogin: profileData?.lastLogin,
        avatarUrl: profileData?.avatarUrl,
        avatarBase64: profileData?.avatarBase64,
      };

      console.log("Mapped profile data:", mappedData);
      console.log("Has avatar base64:", !!mappedData.avatarBase64);
      if (mappedData.avatarBase64) {
        console.log("Avatar base64 length:", mappedData.avatarBase64.length);
        console.log("Avatar base64 starts with:", mappedData.avatarBase64.substring(0, 30) + "...");
      }
      
      return mappedData;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      // Convert fullName back to name for API
      const apiData = {
        name: profileData.fullName,
      };

      console.log("Updating profile with data:", apiData);
      const response = await API.put("/auth/me", apiData);

      // Map response data back to component format
      const responseData = response.data.data;
      return {
        fullName:
          responseData.name || responseData.fullName || responseData.username,
        email: responseData.email,
        role: responseData.role,
        joinDate: responseData.joinDate || responseData.createdAt,
        lastLogin: responseData.lastLogin,
        avatarUrl: responseData.avatarUrl,
      };
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },

  updateAvatar: async (avatarBase64) => {
    try {
      console.log("Updating avatar...");
      console.log("Avatar data length:", avatarBase64.length);
      console.log("Avatar data starts with:", avatarBase64.substring(0, 30) + "...");

      // The backend expects JSON content but the documentation specifies multipart/form-data
      // We're keeping it as JSON with base64 string since that's what the controller expects
      const requestData = { avatar: avatarBase64 };
      
      // Explicitly set Content-Type to application/json to ensure correct handling
      const response = await API.put("/auth/me/avatar", requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Log the response
      console.log("Avatar update API response status:", response.status);
      console.log("Avatar update API response success:", response.data.success);
      
      // Map response data back to component format
      const responseData = response.data.data;
      return {
        fullName:
          responseData.name || responseData.fullName || responseData.username,
        email: responseData.email,
        role: responseData.role,
        joinDate: responseData.joinDate || responseData.createdAt,
        lastLogin: responseData.lastLogin,
        avatarUrl: responseData.avatarUrl,
        avatarBase64: responseData.avatarBase64,
      };
    } catch (error) {
      console.error("Error updating avatar:", error);
      if (error.response) {
        console.error("Error response:", error.response.status, error.response.data);
      }
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      console.log("Changing password...");
      const response = await API.put("/auth/change-password", passwordData);
      return response.data;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  },

  // Updated function for Profile component
  updatePassword: async (currentPassword, newPassword) => {
    try {
      console.log("Updating password...");
      const response = await API.put("/auth/change-password", {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  },
};
