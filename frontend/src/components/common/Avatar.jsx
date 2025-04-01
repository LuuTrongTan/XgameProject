import React from "react";
import { Avatar as MuiAvatar } from "@mui/material";

const CustomAvatar = ({ user, project, sx, variant, ...props }) => {
  const getAvatarSrc = () => {
    if (!user && !project) return "/placeholder.png";

    const item = user || project;

    if (item.avatarBase64) return item.avatarBase64;
    if (item.avatar && item.avatar.startsWith("http")) return item.avatar;
    return "/placeholder.png";
  };

  const getAvatarText = () => {
    if (!user && !project) return "?";

    const item = user || project;
    return item.name ? item.name.charAt(0).toUpperCase() : "?";
  };

  const avatarSrc = getAvatarSrc();
  const hasCustomAvatar = avatarSrc !== "/placeholder.png";

  return (
    <MuiAvatar
      src={avatarSrc}
      alt={user?.name || project?.name || "Avatar"}
      variant={variant || "square"}
      sx={{
        bgcolor: hasCustomAvatar ? undefined : "primary.main",
        width: "100%",
        height: "100%",
        borderRadius:
          variant === "rounded" ? "8px" : variant === "square" ? "0" : "50%",
        overflow: "hidden",
        border: hasCustomAvatar ? 'none' : '2px solid #2196f3',
        color: hasCustomAvatar ? undefined : 'white',
        "& img": {
          objectFit: "cover",
          width: "100%",
          height: "100%",
          objectPosition: "center",
          minWidth: "100%",
          margin: 0,
          padding: 0,
        },
        ...sx,
      }}
      {...props}
    >
      {getAvatarText()}
    </MuiAvatar>
  );
};

export default CustomAvatar;
