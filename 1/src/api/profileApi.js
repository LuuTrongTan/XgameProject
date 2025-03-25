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
      };

      console.log("Mapped profile data:", mappedData);
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
        ...profileData,
        name: profileData.fullName,
      };
      delete apiData.fullName;

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

  updateAvatar: async (formData) => {
    try {
      console.log("Updating avatar...");
      const response = await API.put("/auth/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
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
      console.error("Error updating avatar:", error);
      throw error;
    }
  },
};
