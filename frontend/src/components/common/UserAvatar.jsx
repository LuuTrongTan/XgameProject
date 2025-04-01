import React from "react";
import { Avatar } from "@mui/material";

const UserAvatar = ({ user, size = "medium" }) => {
  const sizes = {
    small: 24,
    medium: 32,
    large: 40,
  };

  return (
    <Avatar
      alt={user?.fullName || "User"}
      src={user?.avatar}
      sx={{ width: sizes[size], height: sizes[size] }}
    />
  );
};

export default UserAvatar; 