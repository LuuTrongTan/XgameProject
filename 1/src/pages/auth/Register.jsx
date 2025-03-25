import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
} from "@mui/material";
import AuthLayout from "../../components/common/AuthLayout";
import FormAlert from "../../components/common/FormAlert";
import AuthTextField from "../../components/auth/AuthTextField";
import API from "../../api/api";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckIcon from "@mui/icons-material/Check";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Vui lòng nhập họ tên");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Vui lòng nhập email");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Email không hợp lệ");
      return false;
    }
    if (!formData.password) {
      setError("Vui lòng nhập mật khẩu");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(""); // Reset error state

      // Log dữ liệu đang gửi
      console.log("Đang gửi dữ liệu đăng ký:", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      const response = await API.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (response?.data?.success) {
        navigate("/login", {
          state: {
            message:
              "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
          },
        });
      } else {
        setError(
          response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại."
        );
      }
    } catch (err) {
      console.error("Lỗi đăng ký:", err);
      if (err.response?.status === 400) {
        setError(
          err.response?.data?.message ||
            "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại."
        );
      } else if (err.response?.status === 500) {
        setError("Lỗi server. Vui lòng thử lại sau.");
      } else {
        setError("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
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
          <PersonAddIcon
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
            Đăng ký tài khoản
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Tạo tài khoản mới để trải nghiệm dịch vụ của chúng tôi
          </Typography>
        </Box>

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
            id="name"
            label="Họ tên"
            name="name"
            autoComplete="name"
            autoFocus
            value={formData.name}
            onChange={handleChange}
            required
            fullWidth
          />

          <AuthTextField
            id="email"
            label="Email"
            name="email"
            autoComplete="email"
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
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            required
            fullWidth
          />

          <AuthTextField
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
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
            {loading ? "Đang xử lý..." : "Đăng ký"}
          </Button>

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Link
              to="/login"
              style={{
                color: "primary.main",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Đã có tài khoản? Đăng nhập ngay
            </Link>
          </Box>
        </Box>
      </Paper>
    </AuthLayout>
  );
};

export default Register;
