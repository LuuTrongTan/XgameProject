/**
 * Lưu token vào localStorage
 * @param {string} token - JWT token
 */
export const setToken = (token) => {
  localStorage.setItem("token", token);
};

/**
 * Lấy token từ localStorage
 * @returns {string|null} JWT token hoặc null nếu không có
 */
export const getToken = () => {
  return localStorage.getItem("token");
};

/**
 * Xóa token khỏi localStorage
 */
export const removeToken = () => {
  localStorage.removeItem("token");
};

/**
 * Kiểm tra xem đã đăng nhập chưa
 * @returns {boolean} True nếu đã đăng nhập
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Refresh token
 * @returns {Promise<string|null>} Promise chứa token mới hoặc null nếu không thành công
 */
export const refreshToken = async () => {
  try {
    const response = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.token) {
        setToken(data.token);
        return data.token;
      }
    }
    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

/**
 * Đăng xuất
 * Xóa token và dữ liệu người dùng khỏi localStorage
 */
export const logout = () => {
  removeToken();
  localStorage.removeItem('user');
};
