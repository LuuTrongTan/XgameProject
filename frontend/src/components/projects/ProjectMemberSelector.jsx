import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import MemberSelection from '../common/MemberSelection';

/**
 * Định dạng tên người dùng nhất quán
 * @param {Object} user - Thông tin người dùng
 * @returns {string} - Tên người dùng đã được định dạng
 */
const formatUserName = (user) => {
  if (!user) return "Người dùng";
  
  if (user.name) return user.name;
  if (user.username) return user.username;
  if (user.email) return user.email.split('@')[0];
  
  return "Người dùng";
};

/**
 * Component thêm thành viên cho dự án, có thể tái sử dụng ở nhiều nơi
 * @param {Array} members - Danh sách thành viên hiện tại
 * @param {Function} onMembersChange - Callback khi thay đổi danh sách thành viên
 * @param {String} title - Tiêu đề của phần thêm thành viên
 * @param {Boolean} excludeCurrentUser - Có loại trừ người dùng hiện tại khỏi danh sách không
 * @returns 
 */
const ProjectMemberSelector = ({
  members = [],
  onMembersChange,
  title = "Thêm thành viên vào dự án",
  excludeCurrentUser = true,
  showErrorMessage = true
}) => {
  const [error, setError] = useState(null);

  // Xử lý khi thay đổi thành viên
  const handleMembersChange = (newMembers) => {
    try {
      console.log("ProjectMemberSelector - new members:", JSON.stringify(newMembers, null, 2));
      
      // Xử lý và chuẩn hóa dữ liệu thành viên
      const processedMembers = newMembers.map(member => {
        // Nếu member là null hoặc undefined
        if (!member) return null;

        // Nếu có thuộc tính user (cấu trúc từ API)
        if (member.user) {
          return {
            ...member,
            id: member.user._id || member.user.id,
            _id: member.user._id || member.user.id,
            name: formatUserName(member.user),
            email: member.user.email,
            avatar: member.user.avatar,
            role: member.role || 'member'
          };
        }
        
        // Nếu đã có cấu trúc chuẩn
        return {
          ...member,
          id: member._id || member.id,
          _id: member._id || member.id,
          name: formatUserName(member),
          email: member.email || "",
          role: member.role || "member",
          status: member.status || 'active'
        };
      }).filter(Boolean); // Loại bỏ các giá trị null/undefined
      
      // Gọi callback với dữ liệu đã được chuẩn hóa
      onMembersChange(processedMembers);
      
    } catch (error) {
      console.error("Error in ProjectMemberSelector:", error);
      setError("Có lỗi xảy ra khi xử lý danh sách thành viên");
    }
  };

  return (
    <Box>
      {error && showErrorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <MemberSelection
        members={members}
        onMembersChange={handleMembersChange}
        showRoleSelection={true}
        mode="all"
        title={title}
        excludeCurrentUser={excludeCurrentUser}
      />
    </Box>
  );
};

export default ProjectMemberSelector; 