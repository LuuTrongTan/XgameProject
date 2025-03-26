import React from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

const NotFound = () => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          textAlign: "center",
          gap: 3,
        }}
      >
        <ErrorOutlineIcon
          sx={{
            fontSize: 100,
            color: "error.main",
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": {
                transform: "scale(1)",
                opacity: 1,
              },
              "50%": {
                transform: "scale(1.1)",
                opacity: 0.7,
              },
              "100%": {
                transform: "scale(1)",
                opacity: 1,
              },
            },
          }}
        />

        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: "bold",
            background: "linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)",
            backgroundClip: "text",
            textFillColor: "transparent",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </Typography>

        <Typography
          variant="h5"
          sx={{
            color: "text.secondary",
            mb: 2,
          }}
        >
          Trang bạn đang tìm kiếm không tồn tại
        </Typography>

        <Button
          component={Link}
          to="/"
          variant="contained"
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 2,
            fontSize: "1.1rem",
            textTransform: "none",
            boxShadow: 2,
            background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
            "&:hover": {
              background: "linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)",
            },
          }}
        >
          Trở về trang chủ
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound;
