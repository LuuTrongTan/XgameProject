import React from "react";
import { Button } from "@mui/material";

const AuthButton = ({ children, ...props }) => {
  return (
    <Button
      type="submit"
      fullWidth
      variant="contained"
      sx={{ mt: 3, mb: 2 }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default AuthButton;
