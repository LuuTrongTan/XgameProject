import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getAllUsers } from '../api/userApi';

// Tạo context
const AdminViewContext = createContext();

export const useAdminView = () => {
  const context = useContext(AdminViewContext);
  if (!context) {
    throw new Error('useAdminView phải được sử dụng trong AdminViewProvider');
  }
  return context;
};

export const AdminViewProvider = ({ children }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const isAdmin = user?.role === 'admin';
  
  // Tải danh sách người dùng khi context được khởi tạo
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);
  
  // Tải danh sách người dùng từ API
  const fetchUsers = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.message || 'Không thể tải danh sách người dùng');
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách người dùng');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Chọn một user để xem
  const selectUser = (user) => {
    console.log('Admin selecting user:', user?.name || user?.email || 'Unknown', user?._id);
    setSelectedUser(user);
    // Lưu vào localStorage để giữ lựa chọn khi refresh trang
    if (user) {
      localStorage.setItem('adminSelectedUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('adminSelectedUser');
    }
  };
  
  // Reset view về toàn bộ hệ thống
  const resetView = () => {
    console.log('Admin resetting view to system-wide view');
    setSelectedUser(null);
    localStorage.removeItem('adminSelectedUser');
  };
  
  // Khôi phục lựa chọn từ localStorage khi khởi tạo
  useEffect(() => {
    if (isAdmin) {
      const savedUser = localStorage.getItem('adminSelectedUser');
      if (savedUser) {
        try {
          setSelectedUser(JSON.parse(savedUser));
        } catch (err) {
          console.error('Error parsing saved user:', err);
          localStorage.removeItem('adminSelectedUser');
        }
      }
    }
  }, [isAdmin]);
  
  // Giá trị được truyền vào context
  const value = {
    users,
    selectedUser,
    loading,
    error,
    selectUser,
    resetView,
    refreshUsers: fetchUsers,
    isAdminView: isAdmin,
  };
  
  return (
    <AdminViewContext.Provider value={value}>
      {children}
    </AdminViewContext.Provider>
  );
};

export default AdminViewProvider; 