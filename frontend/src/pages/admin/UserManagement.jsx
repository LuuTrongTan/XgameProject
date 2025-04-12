import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TextField,
  Avatar,
  TablePagination,
  Alert,
  CircularProgress,
  InputAdornment
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { getAllUsers, changeUserRole, deleteUser } from "../../api/userApi";
import { ROLES, getRoleName } from "../../config/constants";
import { useSnackbar } from "notistack";
import { useTheme } from "@mui/material/styles";

const UserManagement = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const theme = useTheme();

  // Chỉ admin mới có thể truy cập trang này
  useEffect(() => {
    if (user?.role !== ROLES.ADMIN) {
      enqueueSnackbar("Bạn không có quyền truy cập trang này", { 
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "center" }
      });
    }
  }, [user, enqueueSnackbar]);

  // Lấy danh sách người dùng
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.data);
        setFilteredUsers(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError("Lỗi khi tải danh sách người dùng");
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Lọc người dùng theo từ khóa tìm kiếm
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    const results = users.filter(user => 
      (user.name && user.name.toLowerCase().includes(lowerCaseSearch)) ||
      (user.email && user.email.toLowerCase().includes(lowerCaseSearch))
    );
    
    setFilteredUsers(results);
    setPage(0);
  }, [searchTerm, users]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenRoleDialog = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setOpenRoleDialog(true);
  };

  const handleRoleChange = (event) => {
    setNewRole(event.target.value);
  };

  const handleRoleSubmit = async () => {
    try {
      const response = await changeUserRole(selectedUser._id, newRole);
      if (response.success) {
        enqueueSnackbar("Thay đổi vai trò thành công", { variant: "success" });
        fetchUsers(); // Refresh user list
      } else {
        enqueueSnackbar(response.message || "Có lỗi xảy ra", { variant: "error" });
      }
    } catch (error) {
      enqueueSnackbar("Lỗi khi thay đổi vai trò", { variant: "error" });
      console.error("Error changing role:", error);
    } finally {
      setOpenRoleDialog(false);
      setSelectedUser(null);
    }
  };

  const handleOpenDeleteConfirm = (user) => {
    setConfirmDelete(user);
  };

  const handleDeleteUser = async () => {
    try {
      const response = await deleteUser(confirmDelete._id);
      if (response.success) {
        enqueueSnackbar("Xóa người dùng thành công", { variant: "success" });
        fetchUsers(); // Refresh user list
      } else {
        enqueueSnackbar(response.message || "Có lỗi xảy ra", { variant: "error" });
      }
    } catch (error) {
      enqueueSnackbar("Lỗi khi xóa người dùng", { variant: "error" });
      console.error("Error deleting user:", error);
    } finally {
      setConfirmDelete(null);
    }
  };

  // Các vai trò có thể chọn trong dialog (loại bỏ Project Manager)
  const availableRoles = Object.values(ROLES).filter(role => role !== ROLES.PROJECT_MANAGER);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Quản lý người dùng
        </Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={fetchUsers}
          disabled={loading}
          variant="outlined"
          color="primary"
          size="medium"
          sx={{ 
            borderRadius: 2, 
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.1)' } 
          }}
        >
          Làm mới
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Thanh tìm kiếm */}
      <TextField
        fullWidth
        placeholder="Tìm kiếm theo tên hoặc email"
        variant="outlined"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ 
          mb: 3,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '&:hover': {
              '& > fieldset': {
                borderColor: theme => theme.palette.primary.main,
              },
            },
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      <Paper elevation={3} sx={{ width: "100%", overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "calc(100vh - 300px)" }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Thông tin người dùng</TableCell>
                    <TableCell>Vai trò</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell align="right">Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                      <TableRow hover key={user._id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Avatar 
                              src={user.avatar} 
                              sx={{ mr: 2 }}
                            >
                              {user.name ? user.name[0] : "U"}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">
                                {user.name || "Chưa đặt tên"}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                ID: {user._id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getRoleName(user.role)} 
                            color={
                              user.role === ROLES.ADMIN 
                                ? "primary" 
                                : user.role === ROLES.PROJECT_MANAGER 
                                  ? "info" 
                                  : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.status || "active"} 
                            color={
                              user.status === "active" 
                                ? "success" 
                                : user.status === "pending" 
                                  ? "warning" 
                                  : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            color="primary" 
                            onClick={() => handleOpenRoleDialog(user)}
                            title="Thay đổi vai trò"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => handleOpenDeleteConfirm(user)}
                            title="Xóa người dùng"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body1" py={3}>
                          {users.length > 0 
                            ? "Không tìm thấy người dùng nào khớp với từ khóa tìm kiếm" 
                            : "Không có người dùng nào"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Số hàng mỗi trang:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} của ${count}`
              }
            />
          </>
        )}
      </Paper>

      {/* Dialog thay đổi vai trò */}
      <Dialog open={openRoleDialog} onClose={() => setOpenRoleDialog(false)}>
        <DialogTitle>Thay đổi vai trò người dùng</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, minWidth: 300 }}>
            {selectedUser && (
              <Box mb={3}>
                <Typography variant="subtitle1" fontWeight={500}>
                  {selectedUser.name || selectedUser.email}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedUser.email}
                </Typography>
              </Box>
            )}
            <FormControl fullWidth>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={newRole}
                label="Vai trò"
                onChange={handleRoleChange}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {getRoleName(role)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRoleDialog(false)}>Hủy</Button>
          <Button onClick={handleRoleSubmit} variant="contained">
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Xác nhận xóa người dùng</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa người dùng{" "}
            <strong>{confirmDelete?.name || confirmDelete?.email}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Hành động này không thể hoàn tác!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Hủy</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement; 