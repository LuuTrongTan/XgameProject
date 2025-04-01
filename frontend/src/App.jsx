import React from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { SnackbarProvider } from "notistack";
import AppRoutes from "./routes";

const App = () => {
  return (
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
  );
};

export default App;
