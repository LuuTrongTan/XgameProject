import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Box, Typography, CircularProgress } from "@mui/material";
import AuthLayout from "../../components/common/AuthLayout";
import FormAlert from "../../components/common/FormAlert";
import AuthTextField from "../../components/auth/AuthTextField";
import AuthButton from "../../components/auth/AuthButton";
import API from "../../api/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    type: null,
    message: "",
  });

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset status
    setStatus({ type: null, message: "" });

    // Validate email
    if (!email) {
      setStatus({
        type: "error",
        message: "Vui lòng nhập email",
      });
      return;
    }

    if (!validateEmail(email)) {
      setStatus({
        type: "error",
        message: "Email không hợp lệ",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/forgot-password", { email });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Có lỗi xảy ra");
      }

      setStatus({
        type: "success",
        message:
          "Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.",
      });
      setEmail(""); // Reset form
    } catch (err) {
      console.error("Lỗi quên mật khẩu:", err);
      setStatus({
        type: "error",
        message:
          err.response?.data?.message ||
          err.message ||
          "Có lỗi xảy ra, vui lòng thử lại sau",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Quên mật khẩu">
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, textAlign: "center" }}
      >
        Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu
      </Typography>

      <FormAlert
        error={status.type === "error" ? status.message : ""}
        success={status.type === "success" ? status.message : ""}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ mt: 1, width: "100%" }}
      >
        <AuthTextField
          id="email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        <AuthButton
          type="submit"
          fullWidth
          disabled={loading}
          sx={{ mt: 3, mb: 2 }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Gửi email đặt lại mật khẩu"
          )}
        </AuthButton>

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Link
            to="/login"
            style={{
              color: "inherit",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Quay lại đăng nhập
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default ForgotPassword;
