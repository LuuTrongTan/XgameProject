import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Alert,
} from "@mui/material";
import FormAlert from "../../components/common/FormAlert";
import AuthTextField from "../../components/auth/AuthTextField";
import { useAuth } from "../../contexts/AuthContext";
import LoginIcon from "@mui/icons-material/Login";
import CheckIcon from "@mui/icons-material/Check";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [returnUrl, setReturnUrl] = useState("/dashboard");

  useEffect(() => {
    // Lấy returnUrl từ location state nếu có
    if (location.state?.returnUrl) {
      setReturnUrl(location.state.returnUrl);
      console.log("Sẽ chuyển hướng về:", location.state.returnUrl);
    }

    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await login(formData);
      console.log("Login response:", response);

      if (response && response.success) {
        // Chuyển hướng về trang đã lưu hoặc dashboard
        console.log("Đăng nhập thành công, chuyển hướng về:", returnUrl);
        navigate(returnUrl, {
          state: {
            message: "Đăng nhập thành công!",
          },
        });
      } else {
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 600,
          mx: "auto",
          borderRadius: 2,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <LoginIcon
            sx={{
              fontSize: 48,
              color: "primary.main",
              mb: 2,
            }}
          />
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: "bold",
              color: "primary.main",
            }}
          >
            Đăng nhập
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Đăng nhập để truy cập tài khoản của bạn
          </Typography>
        </Box>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {location.state?.returnUrl && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Vui lòng đăng nhập để tiếp tục xem trang đã chọn
          </Alert>
        )}

        <FormAlert error={error} />

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            mt: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <AuthTextField
            id="email"
            label="Email"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            type="email"
            required
            fullWidth
          />

          <AuthTextField
            name="password"
            label="Mật khẩu"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            endIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CheckIcon />
              )
            }
            sx={{
              mt: 2,
              px: 3,
              py: 1.5,
              fontSize: "1rem",
              textTransform: "none",
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </Button>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 2,
            }}
          >
            <Link
              to="/register"
              style={{
                color: "#1976d2",
                textDecoration: "none",
              }}
            >
              Chưa có tài khoản? Đăng ký ngay
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
