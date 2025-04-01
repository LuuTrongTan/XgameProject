import { useMemo } from 'react';

/**
 * Hook custom để tạo style nhất quán cho avatar trong toàn ứng dụng
 * @param {string} avatar - URL của avatar hoặc null/undefined nếu không có
 * @param {object} extraStyles - Các style bổ sung muốn thêm vào
 * @returns {object} - Object chứa style cho avatar
 */
export const useAvatarStyles = (avatar, extraStyles = {}) => {
  const styles = useMemo(() => ({
    bgcolor: !avatar ? '#1976d2' : 'transparent',
    color: !avatar ? 'white' : 'inherit',
    border: !avatar ? '2px solid #2196f3' : 'none',
    width: 40,
    height: 40,
    ...extraStyles,
  }), [avatar, extraStyles]);

  return styles;
};

export default useAvatarStyles; 