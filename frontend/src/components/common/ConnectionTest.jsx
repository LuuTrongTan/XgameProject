import React, { useState, useEffect } from "react";
import { Box, Typography, Alert } from "@mui/material";
import API from "../../api/api";

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    message: "",
    error: null,
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await API.get("/health-check");
        setConnectionStatus({
          isConnected: true,
          message: response.data.message,
          error: null,
        });
      } catch (error) {
        setConnectionStatus({
          isConnected: false,
          message: "",
          error: "Không thể kết nối đến backend",
        });
      }
    };

    checkConnection();
  }, []);

  return (
    <Box sx={{ mt: 2 }}>
      {connectionStatus.isConnected ? (
        <Alert severity="success">
          <Typography>Kết nối thành công đến backend!</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {connectionStatus.message}
          </Typography>
        </Alert>
      ) : (
        <Alert severity="error">
          <Typography>
            {connectionStatus.error || "Đang kiểm tra kết nối..."}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ConnectionTest;
