import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Typography,
} from '@mui/material';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { getRoleName } from '../../config/constants';

/**
 * Component hiển thị thông tin của một thành viên (dùng trong danh sách thành viên)
 * 
 * @param {Object} user - Thông tin người dùng
 * @param {Object} member - Thông tin thành viên (bao gồm role)
 * @param {boolean} canRemove - Có quyền xóa thành viên hay không
 * @param {Function} onRemove - Hàm xử lý khi xóa thành viên
 * @param {string} creatorId - ID của người tạo (để hiển thị badge đặc biệt)
 * @returns 
 */
const MemberItem = ({ 
  user, 
  member, 
  canRemove = false, 
  onRemove, 
  creatorId = null 
}) => {
  // Kiểm tra dữ liệu user
  if (!user) return null;

  const userInfo = user.user || user;
  const userId = userInfo._id || userInfo.id;
  const memberRole = member?.role || 'member';
  const isCreator = creatorId && (creatorId === userId);

  // Xử lý sự kiện khi click nút xóa
  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(userId);
    }
  };

  return (
    <ListItem
      sx={{ 
        py: 1,
        borderBottom: '1px solid #eee',
      }}
      secondaryAction={
        canRemove && (
          <IconButton
            edge="end"
            color="error"
            onClick={handleRemove}
            size="small"
          >
            <PersonRemoveIcon fontSize="small" />
          </IconButton>
        )
      }
    >
      <ListItemAvatar>
        <Avatar alt={userInfo.name} src={userInfo.avatar}>
          {userInfo.name?.charAt(0)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography component="span" sx={{ fontWeight: "medium" }}>
              {userInfo.name}
            </Typography>
            {isCreator && (
              <Chip
                label="Người tạo"
                size="small"
                color="secondary"
                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        }
        secondary={
          <Typography component="div" variant="body2" sx={{ mt: 0.5 }}>
            <Typography component="span" sx={{ color: "text.secondary", fontSize: '0.875rem' }}>
              {userInfo.email}
            </Typography>
            {memberRole && (
              <Chip
                label={getRoleName(memberRole)}
                size="small"
                color={memberRole === "project_manager" ? "primary" : "default"}
                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Typography>
        }
      />
    </ListItem>
  );
};

export default MemberItem; 