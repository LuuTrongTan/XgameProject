import React from "react";
import { Button } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

/**
 * Nút quay lại có thể tái sử dụng
 * @param {Object} props - Props của component
 * @param {string} [props.label="Quay lại"] - Nhãn hiển thị trên nút
 * @param {function} [props.onClick] - Hàm xử lý khi click, mặc định sẽ navigate(-1)
 * @param {Object} [props.sx] - Style tùy chỉnh cho nút
 * @param {string} [props.variant="text"] - Variant của nút (text, contained, outlined)
 * @param {string} [props.color="primary"] - Màu của nút
 * @param {string} [props.size="medium"] - Kích thước của nút
 * @returns {JSX.Element} Nút quay lại
 */
const BackButton = ({
  label = "Quay lại",
  onClick,
  sx = { mb: 2 },
  variant = "text",
  color = "primary",
  size = "medium",
  ...props
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      startIcon={<ArrowBackIcon />}
      variant={variant}
      color={color}
      size={size}
      onClick={handleClick}
      sx={{ ...sx }}
      {...props}
    >
      {label}
    </Button>
  );
};

export default BackButton;
