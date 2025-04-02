import React from 'react';
import { Box, Typography, Divider, Stack, useTheme, useMediaQuery } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Component hiển thị tiêu đề và các nút hành động cho các trang
 * @param {Object} props - Props của component
 * @param {string} props.title - Tiêu đề chính của trang
 * @param {string} [props.subtitle] - Mô tả hoặc tiêu đề phụ
 * @param {ReactNode} [props.actions] - Các nút hành động ở bên phải
 * @param {ReactNode} [props.backButton] - Nút quay lại (nếu có)
 * @param {Object} [props.sx] - Style bổ sung
 */
const PageHeader = ({ title, subtitle, actions, backButton, sx = {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box 
      sx={{ 
        mb: 3, 
        ...sx 
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center',
          mb: 1
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {backButton && (
              <Box sx={{ mr: 1 }}>{backButton}</Box>
            )}
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                color: 'text.primary'
              }}
            >
              {title}
            </Typography>
          </Stack>
          
          {subtitle && (
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                mt: 0.5,
                fontSize: { xs: '0.875rem', sm: '1rem' } 
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {actions && (
          <Box 
            sx={{ 
              mt: isMobile ? 2 : 0, 
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
      
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
  backButton: PropTypes.node,
  sx: PropTypes.object
};

export default PageHeader; 