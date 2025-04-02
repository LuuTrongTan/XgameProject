import { useAuth as useAuthContext } from '../contexts/AuthContext';

/**
 * Custom hook để sử dụng thông tin xác thực từ AuthContext
 * @returns {Object} Đối tượng chứa thông tin user, loading, error và các hàm liên quan
 */
const useAuth = () => {
  return useAuthContext();
};

export default useAuth; 