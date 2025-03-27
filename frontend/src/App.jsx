import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SnackbarProvider } from "notistack";
import AppRoutes from "./routes";

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <AppRoutes />
        </SnackbarProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
