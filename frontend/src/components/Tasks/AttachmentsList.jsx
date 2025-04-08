import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

const AttachmentsList = ({ attachments = [], onDelete, canEdit = false }) => {
  if (!attachments.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography color="text.secondary">
          Chưa có tệp đính kèm nào
        </Typography>
      </Box>
    );
  }

  const handleDownload = (attachment) => {
    window.open(attachment.url, '_blank');
  };

  return (
    <List>
      {attachments.map((attachment) => (
        <ListItem
          key={attachment._id}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            mb: 1,
          }}
        >
          <ListItemIcon>
            <FileIcon />
          </ListItemIcon>
          <ListItemText
            primary={attachment.filename}
            secondary={
              <>
                Tải lên: {format(new Date(attachment.createdAt), 'dd/MM/yyyy HH:mm')}
                {attachment.size && ` • ${(attachment.size / 1024).toFixed(2)} KB`}
              </>
            }
          />
          <ListItemSecondaryAction>
            <IconButton
              edge="end"
              onClick={() => handleDownload(attachment)}
              title="Tải xuống"
            >
              <DownloadIcon />
            </IconButton>
            {canEdit && (
              <IconButton
                edge="end"
                onClick={() => onDelete(attachment)}
                title="Xóa"
                sx={{ ml: 1 }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default AttachmentsList; 