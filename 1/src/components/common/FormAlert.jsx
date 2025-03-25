import React from "react";
import { Alert } from "@mui/material";

const FormAlert = ({ error, success }) => {
  if (!error && !success) return null;

  return (
    <>
      {success && (
        <Alert severity="success" sx={{ width: "100%", mt: 2 }}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
          {error}
        </Alert>
      )}
    </>
  );
};

export default FormAlert;
