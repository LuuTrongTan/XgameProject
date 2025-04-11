import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import "./styles/dragDrop.css";
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { BrowserRouter as Router } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Tạo theme mặc định
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Import socket sẽ được thực hiện trong component khi cần
// import './socket.js';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
        <Router>
          <SnackbarProvider maxSnack={3}>
            <AuthProvider>
              <WebSocketProvider>
                <SocketProvider>
                  <App />
                </SocketProvider>
              </WebSocketProvider>
            </AuthProvider>
          </SnackbarProvider>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
