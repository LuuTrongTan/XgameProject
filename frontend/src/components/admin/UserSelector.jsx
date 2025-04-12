import React, { useState, useEffect } from 'react';
import {
  Box,
  Autocomplete,
  TextField,
  Avatar,
  Typography,
  Chip,
  Button,
  Tooltip
} from '@mui/material';
import { useAdminView } from '../../contexts/AdminViewContext';
import { RefreshRounded, Person, Clear } from '@mui/icons-material';

/**
 * Component chọn người dùng cho admin để lọc dữ liệu hiển thị
 */
const UserSelector = ({ width = 300, showLabel = true }) => {
  const { users, selectedUser, selectUser, loading } = useAdminView();
  const [open, setOpen] = useState(false);

  // Kiểm tra và log thông tin trùng lặp
  useEffect(() => {
    if (users && users.length > 0) {
      // Kiểm tra trùng lặp name và id
      const userNames = {};
      const userIds = {};
      
      users.forEach((user, index) => {
        const name = user.name || user.email || `User-${index}`;
        const id = user._id || `id-${index}`;
        
        if (userNames[name]) {
          console.warn(`Warning: Duplicate user name found: "${name}" at index ${index}`);
        } else {
          userNames[name] = true;
        }
        
        if (userIds[id]) {
          console.warn(`Warning: Duplicate user ID found: "${id}" at index ${index}`);
        } else {
          userIds[id] = true;
        }
      });
      
      console.log(`UserSelector: Loaded ${users.length} users`);
    }
  }, [users]);

  const handleSelectUser = (event, user) => {
    selectUser(user);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'flex-start', sm: 'center' }, 
      gap: 1, 
      width: width,
      mb: { xs: 2, sm: 0 }
    }}>
      {showLabel && (
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary', 
            mr: { xs: 0, sm: 1 }, 
            mb: { xs: 1, sm: 0 },
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          Xem dữ liệu của:
        </Typography>
      )}

      <Box sx={{ 
        width: '100%',
        maxWidth: '100%'
      }}>
        <Autocomplete
          id="user-selector"
          sx={{ width: '100%' }}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          options={users.map((user, index) => ({
            ...user,
            uniqueKey: user._id || `user-${user.email || index}`
          }))}
          loading={loading}
          value={selectedUser}
          getOptionLabel={(option) => option ? (option.name || option.email || 'User') : ''}
          onChange={handleSelectUser}
          isOptionEqualToValue={(option, value) => 
            option && value && (
              (option._id && value._id && option._id === value._id) || 
              (option.uniqueKey && value.uniqueKey && option.uniqueKey === value.uniqueKey)
            )
          }
          renderOption={(props, option) => (
            <Box 
              component="li" 
              sx={{ '& > img': { mr: 2, flexShrink: 0 } }} 
              {...props}
              key={option.uniqueKey}
            >
              <Avatar 
                src={option.avatar} 
                alt={option.name || option.email || 'User'}
                sx={{ width: 24, height: 24, mr: 1 }}
              >
                {option.name ? option.name[0] : option.email ? option.email[0] : 'U'}
              </Avatar>
              <Typography variant="body2" noWrap>{option.name || option.email || 'User'}</Typography>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Chọn người dùng"
              size="small"
              fullWidth
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <Person fontSize="small" color="action" sx={{ ml: 0.5, mr: 0.5 }} />
                )
              }}
            />
          )}
          renderTags={(value, getTagProps) => (
            <Chip
              avatar={
                <Avatar src={value?.avatar}>
                  {value?.name ? value.name[0] : value?.email ? value.email[0] : 'U'}
                </Avatar>
              }
              label={value?.name || value?.email || 'User'}
              size="small"
              {...getTagProps({ index: 0 })}
            />
          )}
        />
      </Box>
    </Box>
  );
};

export default UserSelector; 