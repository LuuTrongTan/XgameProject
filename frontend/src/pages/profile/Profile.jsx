import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Edit as EditIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { profileApi } from "../../api";
import CustomAvatar from "../../components/common/Avatar";
import FileUpload from "../../components/common/FileUpload";
import { useAuth } from "../../contexts/AuthContext";

const Profile = () => {
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    role: "",
    joinDate: "",
    lastLogin: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [formData, setFormData] = useState({});
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const { user: authUser, updateUserAvatar } = useAuth();

  // Fetch profile data
  useEffect(() => {
    console.log("Fetching profile data..."); // Debug log
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const data = await profileApi.getProfile();
      console.log("Setting profile data:", data); // Debug log
      setProfileData(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      showSnackbar("Không thể tải thông tin hồ sơ", "error");
    }
  };

  // Handle edit dialog
  const handleEditClick = () => {
    setEditData({ ...profileData });
    setIsEditing(true);
  };

  const handleClose = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleChange = (field) => (event) => {
    setEditData({
      ...editData,
      [field]: event.target.value,
    });
  };

  const handleSave = async () => {
    try {
      // Only update the name field, not email
      const updateData = {
        fullName: editData.fullName
      };
      
      await profileApi.updateProfile(updateData);
      
      // Update local profile data but preserve the email
      setProfileData(prev => ({
        ...prev,
        fullName: editData.fullName
      }));
      
      setIsEditing(false);
      showSnackbar("Cập nhật hồ sơ thành công!");
    } catch (error) {
      console.error("Error updating profile:", error);
      showSnackbar("Không thể cập nhật hồ sơ", "error");
    }
  };

  // Handle avatar upload
  const handleFileSelect = (base64String) => {
    console.log("Avatar selected, type:", typeof base64String);
    setFormData((prev) => ({
      ...prev,
      avatar: base64String,
    }));
  };

  // Handle save avatar
  const handleSaveAvatar = async () => {
    if (!formData.avatar) {
      showSnackbar("Vui lòng chọn ảnh đại diện", "error");
      return;
    }
    
    setIsAvatarLoading(true);
    try {
      console.log("Saving avatar, data type:", typeof formData.avatar);
      console.log("Avatar data length:", formData.avatar.length);
      console.log("Avatar data starts with:", formData.avatar.substring(0, 30) + "...");
      
      // Đảm bảo avatar là string
      if (typeof formData.avatar !== 'string') {
        throw new Error("Avatar data is not a string");
      }
      
      // Đảm bảo avatar có định dạng đúng
      if (!formData.avatar.startsWith('data:image/')) {
        throw new Error("Invalid image format");
      }
      
      // Sử dụng updateUserAvatar từ AuthContext để cập nhật avatar trong toàn bộ hệ thống
      const updatedUser = await updateUserAvatar(formData.avatar);
      
      // Cập nhật profileData với dữ liệu mới từ context
      setProfileData(prev => ({
        ...prev,
        ...updatedUser,
        avatarBase64: updatedUser.avatarBase64 // Đảm bảo hiển thị avatar mới ngay lập tức
      }));
      
      // Reset form data
      setFormData({});
      
      showSnackbar("Cập nhật avatar thành công!");
    } catch (error) {
      console.error("Error updating avatar:", error);
      showSnackbar("Không thể cập nhật avatar", "error");
    } finally {
      setIsAvatarLoading(false);
    }
  };

  // Snackbar
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return new Intl.DateTimeFormat("vi-VN", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return `lúc ${date.getHours()}:${String(date.getMinutes()).padStart(
        2,
        "0"
      )} ${formatDate(dateString)}`;
    } catch (error) {
      console.error("Error formatting datetime:", error);
      return "N/A";
    }
  };

  const handleChangePassword = async () => {
    try {
      await profileApi.updatePassword(passwordData.currentPassword, passwordData.newPassword);
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showSnackbar("Cập nhật mật khẩu thành công!");
    } catch (error) {
      console.error("Error updating password:", error);
      showSnackbar("Không thể cập nhật mật khẩu", "error");
    } finally {
      setIsPasswordChanging(false);
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f7fa", minHeight: "100vh" }}>
      <Typography
        variant="h5"
        sx={{
          mb: 3,
          fontWeight: 600,
          color: "#1a237e",
          position: "relative",
          "&:after": {
            content: '""',
            position: "absolute",
            bottom: -8,
            left: 0,
            width: 60,
            height: 3,
            backgroundColor: "#1a73e8",
            borderRadius: 1.5,
          },
        }}
      >
        Hồ sơ cá nhân
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column - Avatar and Navigation */}
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              mb: 2,
              borderRadius: 2,
              boxShadow: "0 2px 12px 0 rgba(0,0,0,0.1)",
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
            }}
          >
            <CardContent>
              <Box sx={{ textAlign: "center", position: "relative" }}>
                <Box sx={{ position: "relative", display: "inline-block" }}>
                  <CustomAvatar
                    user={profileData}
                    sx={{
                      width: 120,
                      height: 120,
                      fontSize: "3rem",
                      background:
                        "linear-gradient(135deg, #1a73e8 0%, #3f51b5 100%)",
                      margin: "0 auto 16px",
                      border: "4px solid white",
                      boxShadow: "0 2px 12px 0 rgba(0,0,0,0.15)",
                    }}
                  >
                    {profileData.fullName?.charAt(0)}
                  </CustomAvatar>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    acceptedTypes="image/*"
                    maxSize={5 * 1024 * 1024} // 5MB
                  />
                </Box>
                
                {/* Hiển thị nút lưu avatar khi có avatar được chọn */}
                {formData.avatar && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveAvatar}
                    disabled={isAvatarLoading}
                    startIcon={<SaveIcon />}
                    sx={{ 
                      mt: 2,
                      borderRadius: 2,
                      boxShadow: "0 2px 8px 0 rgba(26,115,232,0.3)",
                      background: "linear-gradient(135deg, #1a73e8 0%, #3f51b5 100%)"
                    }}
                  >
                    {isAvatarLoading ? "Đang lưu..." : "Lưu avatar"}
                  </Button>
                )}
                
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, mt: 2 }}>
                  {profileData.fullName}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mb: 2, color: "text.secondary" }}
                >
                  {profileData.email}
                </Typography>
                <Box
                  sx={{
                    display: "inline-block",
                    px: 2,
                    py: 0.75,
                    bgcolor: "rgba(25, 118, 210, 0.08)",
                    borderRadius: 2,
                    color: "#1a73e8",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    boxShadow: "inset 0 0 0 1px rgba(25, 118, 210, 0.16)",
                  }}
                >
                  {profileData.role}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Thay thế menu cũ bằng nút đổi mật khẩu */}
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 2px 12px 0 rgba(0,0,0,0.1)",
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                onClick={() => setIsChangingPassword(true)}
                sx={{
                  justifyContent: "center",
                  py: 1,
                  borderRadius: 2,
                  borderColor: "rgba(25, 118, 210, 0.5)",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "rgba(25, 118, 210, 0.04)",
                  },
                }}
              >
                Đổi mật khẩu
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Profile Info */}
        <Grid item xs={12} md={9}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 2px 12px 0 rgba(0,0,0,0.1)",
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 4,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#1a237e" }}
                >
                  Thông tin cá nhân
                </Typography>
                <Button
                  startIcon={<EditIcon />}
                  variant="contained"
                  size="medium"
                  onClick={handleEditClick}
                  sx={{
                    borderRadius: 2,
                    boxShadow: "0 2px 8px 0 rgba(26,115,232,0.3)",
                    background:
                      "linear-gradient(135deg, #1a73e8 0%, #3f51b5 100%)",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #1557b0 0%, #2c387e 100%)",
                    },
                  }}
                >
                  Chỉnh sửa
                </Button>
              </Box>

              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          mb: 1,
                          fontWeight: 500,
                        }}
                      >
                        Họ và tên
                      </Typography>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                        {profileData.fullName}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          mb: 1,
                          fontWeight: 500,
                        }}
                      >
                        Vai trò
                      </Typography>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                        {profileData.role}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          mb: 1,
                          fontWeight: 500,
                        }}
                      >
                        Email
                      </Typography>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                        {profileData.email}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          mb: 1,
                          fontWeight: 500,
                        }}
                      >
                        Ngày tham gia
                      </Typography>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                        {formatDate(profileData.joinDate)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "rgba(25, 118, 210, 0.04)",
                      border: "1px solid rgba(25, 118, 210, 0.08)",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        mb: 1,
                        fontWeight: 500,
                      }}
                    >
                      Đăng nhập gần nhất
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "1rem",
                        fontWeight: 500,
                        color: "#1a73e8",
                      }}
                    >
                      {formatDateTime(profileData.lastLogin)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            Chỉnh sửa thông tin
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 0, pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Họ và tên"
                value={editData.fullName || ""}
                onChange={handleChange("fullName")}
                variant="outlined"
                margin="normal"
                sx={{ 
                  mt: 1,
                  mb: 2,
                  '& .MuiInputBase-root': {
                    height: '56px'
                  }
                }}
                InputProps={{
                  sx: { 
                    fontSize: '1rem', 
                    py: 1.5,
                    px: 2
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2 }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              borderRadius: 2,
              background: "linear-gradient(135deg, #1a73e8 0%, #3f51b5 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #1557b0 0%, #2c387e 100%)",
              },
            }}
          >
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog đổi mật khẩu */}
      <Dialog 
        open={isChangingPassword || false} 
        onClose={() => setIsChangingPassword(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            Đổi mật khẩu
            <IconButton onClick={() => setIsChangingPassword(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 0, pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mật khẩu hiện tại"
                type="password"
                value={passwordData.currentPassword || ""}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mật khẩu mới"
                type="password"
                value={passwordData.newPassword || ""}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                helperText="Mật khẩu phải có ít nhất 6 ký tự"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Xác nhận mật khẩu mới"
                type="password"
                value={passwordData.confirmPassword || ""}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                error={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword}
                helperText={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword ? "Mật khẩu không khớp" : ""}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setIsChangingPassword(false)}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2 }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={isPasswordChanging || 
              !passwordData.currentPassword || 
              !passwordData.newPassword || 
              passwordData.newPassword !== passwordData.confirmPassword ||
              passwordData.newPassword.length < 6}
            sx={{
              borderRadius: 2,
              background: "linear-gradient(135deg, #1a73e8 0%, #3f51b5 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #1557b0 0%, #2c387e 100%)",
              },
            }}
          >
            {isPasswordChanging ? "Đang xử lý..." : "Đổi mật khẩu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;
