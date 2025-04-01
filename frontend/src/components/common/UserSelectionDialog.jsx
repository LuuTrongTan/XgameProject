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
  availableUsers = [],
  title = "Chọn thành viên",
  showRoleSelection = true
}) => {
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(
    selectedUsers.map((user) => ({
      userId: user._id || user.id,
      role: user.role || "member",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedUsers && selectedUsers.length > 0) {
      setSelectedMembers(
        selectedUsers
          .filter(user => user) // Lọc bỏ các giá trị null/undefined
          .map((user) => ({
            userId: user._id || user.id,
            role: user.role || "member",
          }))
      );
    } else {
      setSelectedMembers([]);
    }
  }, [selectedUsers]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      if (availableUsers && availableUsers.length > 0) {
        // Đã có sẵn danh sách người dùng từ props
        console.log("Available users from props:", JSON.stringify(availableUsers, null, 2));
        
        setUsers(availableUsers.map(member => {
          // Xử lý cấu trúc dữ liệu khác nhau
          const user = member.user || member;
          
          // Log chi tiết để debug
          console.log("Processing user:", {
            id: user._id || user.id,
            name: user.name,
            hasName: !!user.name,
            email: user.email,
            avatar: user.avatar ? '[has avatar]' : '[no avatar]'
          });
          
          return {
            _id: user._id || user.id,
            name: user.name, // Giữ nguyên name từ API
            email: user.email,
            avatar: user.avatar,
            role: member.role || user.role || "member"
          };
        }));
        setLoading(false);
      } else {
        // Không có danh sách sẵn, gọi API lấy tất cả người dùng
        const response = await getAllUsers();
        if (response.success) {
          console.log("Users from API:", JSON.stringify(response.data, null, 2));
          
          // Hiển thị tên trực tiếp từ API
          const processedUsers = response.data.map(user => {
            // Log chi tiết để debug
            console.log("Processing API user:", {
              id: user._id,
              name: user.name,
              hasName: !!user.name,
              email: user.email,
              avatar: user.avatar ? '[has avatar]' : '[no avatar]'
            });
            
            return {
              ...user,
              name: user.name // Giữ nguyên name từ API
            };
          });
          
          setUsers(processedUsers);
        } else {
          setError(response.message);
        }
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
    console.log("selectedMembers before processing:", JSON.stringify(selectedMembers, null, 2));
    console.log("available users:", JSON.stringify(users, null, 2));
    
    const selectedUsersWithRoles = selectedMembers.map((member) => {
      const user = users.find((u) => u._id === member.userId);
      if (!user) {
        console.warn(`User with ID ${member.userId} not found`);
        return {
          id: member.userId,
          _id: member.userId,
          name: "Người dùng",
          email: "",
          role: member.role || "member",
        };
      }
      
      // Log chi tiết để debug
      console.log("Processing for submit:", {
        id: user._id,
        name: user.name,
        hasName: !!user.name,
        typeOfName: typeof user.name,
        email: user.email
      });
      
      // Dùng tên từ email nếu không có tên
      const displayName = user.name || (user.email ? user.email.split('@')[0] : "Người dùng");
      
      // Giữ nguyên name từ API nếu có, không cần thêm fallback
      return {
        id: user._id,
        _id: user._id,
        name: displayName,
        email: user.email || "", // Email là bắt buộc cho API addMember
        avatar: user.avatar,
        role: member.role || "member",
      };
    });
    
    console.log("UserSelectionDialog - Submitting selected users:", JSON.stringify(selectedUsersWithRoles, null, 2));
    onSubmit(selectedUsersWithRoles);
    onClose(); // Close dialog after submission
  };

  // Lọc users đã được chọn ra khỏi danh sách hiển thị
  const getFilteredUsers = () => {
    // Lọc ra những người dùng phù hợp với từ khóa tìm kiếm
    const searchFiltered = users.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Chỉ hiển thị những người dùng chưa được chọn khi showSelected=false
    return searchFiltered;
  };

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
      <DialogTitle>{title}</DialogTitle>
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
            {getFilteredUsers().length > 0 ? (
              getFilteredUsers().map((user) => {
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
                      <Avatar src={user.avatar}>
                        {user.name?.[0] || user.email?.[0] || '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.name || (user.email ? user.email.split('@')[0] : "Chưa có tên")}
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
