import React from "react";
import { Typography } from "@mui/material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const DateTimeDisplay = ({ date, format: dateFormat = "dd/MM/yyyy HH:mm", variant = "caption" }) => {
  return (
    <Typography variant={variant} color="text.secondary">
      {format(new Date(date), dateFormat, { locale: vi })}
    </Typography>
  );
};

export default DateTimeDisplay; 