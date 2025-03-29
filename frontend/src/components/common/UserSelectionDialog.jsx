import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Checkbox,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { getAllUsers } from "../../api/userApi";

const ROLES = {
  member: "Thành viên",
  project_manager: "Quản lý dự án",
};

const UserSelectionDialog = ({
  open,
  onClose,
  onSubmit,
  selectedUsers = [],
}) => {
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(
    selectedUsers.map((user) => ({
      userId: user.id,
      role: user.role || "member",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError("Không thể tải danh sách người dùng");
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedMembers((prev) => {
      const isSelected = prev.some((member) => member.userId === userId);
      if (isSelected) {
        return prev.filter((member) => member.userId !== userId);
      } else {
        return [...prev, { userId, role: "member" }];
      }
    });
  };

  const handleRoleChange = (userId, newRole) => {
    setSelectedMembers((prev) =>
      prev.map((member) =>
        member.userId === userId ? { ...member, role: newRole } : member
      )
    );
  };

  const handleSubmit = () => {
    const selectedUsersWithRoles = selectedMembers.map((member) => {
      const user = users.find((u) => u._id === member.userId);
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: member.role,
      };
    });
    onSubmit(selectedUsersWithRoles);
    onClose(); // Close dialog after submission
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: "80vh",
          maxHeight: "600px",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle>Chọn thành viên</DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Tìm kiếm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc email"
            size="small"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List
            sx={{
              flex: 1,
              overflow: "auto",
              bgcolor: "background.paper",
              "& .MuiListItem-root": {
                borderBottom: "1px solid",
                borderColor: "divider",
              },
            }}
          >
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const selectedMember = selectedMembers.find(
                  (m) => m.userId === user._id
                );
                const isSelected = Boolean(selectedMember);

                return (
                  <ListItem
                    key={user._id}
                    sx={{
                      pr: 15,
                      "&:hover .role-select": {
                        opacity: 1,
                      },
                    }}
                  >
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      onChange={() => handleUserToggle(user._id)}
                      tabIndex={-1}
                      disableRipple
                    />
                    <ListItemAvatar>
                      <Avatar src={user.avatar}>{user.name?.[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.name || "Chưa có tên"}
                      secondary={user.email}
                      primaryTypographyProps={{
                        variant: "body1",
                        fontWeight: 500,
                      }}
                      secondaryTypographyProps={{
                        variant: "body2",
                      }}
                    />
                    <ListItemSecondaryAction
                      className="role-select"
                      sx={{
                        opacity: isSelected ? 1 : 0,
                        transition: "opacity 0.2s",
                        width: "140px",
                      }}
                    >
                      {isSelected && (
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedMember.role}
                            onChange={(e) =>
                              handleRoleChange(user._id, e.target.value)
                            }
                            variant="outlined"
                          >
                            {Object.entries(ROLES).map(([value, label]) => (
                              <MenuItem key={value} value={value}>
                                {label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })
            ) : (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography color="text.secondary">
                  Không tìm thấy thành viên nào
                </Typography>
              </Box>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={selectedMembers.length === 0}
        >
          Chọn ({selectedMembers.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserSelectionDialog;
