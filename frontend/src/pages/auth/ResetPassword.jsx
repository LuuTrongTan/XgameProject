import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box } from "@mui/material";
import AuthLayout from "../../components/common/AuthLayout";
import FormAlert from "../../components/common/FormAlert";
import AuthTextField from "../../components/auth/AuthTextField";
import AuthButton from "../../components/auth/AuthButton";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5002/api/auth/reset-password/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Đặt lại mật khẩu thất bại");
      }

      // Chuyển hướng đến trang đăng nhập với thông báo thành công
      navigate("/login", {
        state: {
          message:
            "Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.",
        },
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout title="Đặt lại mật khẩu">
      <FormAlert error={error} />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ mt: 1, width: "100%" }}
      >
        <AuthTextField
          name="password"
          label="Mật khẩu mới"
          type="password"
          id="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
        />
        <AuthTextField
          name="confirmPassword"
          label="Xác nhận mật khẩu mới"
          type="password"
          id="confirmPassword"
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={handleChange}
        />
        <AuthButton>Đặt lại mật khẩu</AuthButton>
      </Box>
    </AuthLayout>
  );
};

export default ResetPassword;
