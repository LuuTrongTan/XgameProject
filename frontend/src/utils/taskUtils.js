/**
 * Tiện ích và hằng số cho module Tasks
 */

// Màu sắc theo mức độ ưu tiên
export const priorityColors = {
  high: '#f44336',  // Red
  medium: '#ff9800', // Orange
  low: '#4caf50',   // Green
  none: '#9e9e9e'   // Grey
};

// Dịch trạng thái sang tiếng Việt
export const statusTranslations = {
  todo: 'Chưa bắt đầu',
  inProgress: 'Đang thực hiện',
  review: 'Đang kiểm tra',
  done: 'Hoàn thành'
};

// Tên các trạng thái công việc
export const VALID_STATUSES = ['todo', 'inProgress', 'review', 'done'];

// Lấy màu dựa trên trạng thái
export const getStatusColor = (status) => {
  switch (status) {
    case 'todo':
      return { bg: 'rgba(25, 118, 210, 0.1)', color: '#1976d2' };
    case 'inProgress':
      return { bg: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' };
    case 'review':
      return { bg: 'rgba(156, 39, 176, 0.1)', color: '#9c27b0' };
    case 'done':
      return { bg: 'rgba(46, 125, 50, 0.1)', color: '#2e7d32' };
    default:
      return { bg: 'rgba(158, 158, 158, 0.1)', color: '#9e9e9e' };
  }
};

// Format ngày tháng từ ISO string
export const formatDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

// Kiểm tra deadline đã qua chưa
export const isOverdue = (deadline, status) => {
  if (!deadline || status === 'done') return false;
  
  const now = new Date();
  const dueDate = new Date(deadline);
  
  return dueDate < now;
}; 