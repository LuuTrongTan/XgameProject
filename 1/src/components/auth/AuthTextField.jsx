import React from "react";
import { TextField } from "@mui/material";

const AuthTextField = ({ name, onChange, ...props }) => {
  return (
    <TextField
      margin="normal"
      required
      fullWidth
      name={name}
      onChange={onChange}
      {...props}
    />
  );
};

export default AuthTextField;
