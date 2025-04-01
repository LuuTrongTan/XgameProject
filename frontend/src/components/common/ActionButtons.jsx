import React from "react";
import { IconButton, Button, Tooltip, Box, Stack } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

/**
 * Component nút hành động tái sử dụng cho các chức năng chỉnh sửa và xóa
 *
 * @param {Object} props
 * @param {boolean} props.canEdit - Người dùng có quyền chỉnh sửa không
 * @param {boolean} props.canDelete - Người dùng có quyền xóa không
 * @param {Function} props.onEdit - Hàm callback khi bấm nút chỉnh sửa
 * @param {Function} props.onDelete - Hàm callback khi bấm nút xóa
 * @param {string} props.editTooltip - Thông báo hiển thị khi hover nút edit
 * @param {string} props.deleteTooltip - Thông báo hiển thị khi hover nút delete
 * @param {boolean} props.useIcons - Sử dụng IconButton thay vì Button
 * @param {string} props.variant - Kiểu hiển thị của nút (chỉ áp dụng khi useIcons=false)
 * @param {string} props.size - Kích thước của nút
 * @param {Object} props.sx - Style tùy chỉnh
 * @param {boolean} props.debug - Kiểm tra trạng thái debug
 */
const ActionButtons = ({
  canEdit = true,
  canDelete = true,
  onEdit,
  onDelete,
  editTooltip = "Chỉnh sửa",
  deleteTooltip = "Xóa",
  editLabel = "Chỉnh sửa",
  deleteLabel = "Xóa",
  useIcons = false,
  variant = "outlined",
  size = "medium",
  direction = "row",
  sx,
  debug = false,
}) => {
  // Debug hiển thị trạng thái nút
  if (debug) {
    console.log("ActionButtons Debug:", {
      canEdit,
      canDelete,
      hasEditHandler: !!onEdit,
      hasDeleteHandler: !!onDelete,
      useIcons,
      variant,
      size,
    });
  }

  // Kiểm tra null/undefined với các handler
  const handleEdit = (event) => {
    console.log("ActionButtons handleEdit called");
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (onEdit && typeof onEdit === "function") {
      onEdit(event);
    }
    return false;
  };

  const handleDelete = (event) => {
    console.log("ActionButtons handleDelete called");
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (onDelete && typeof onDelete === "function") {
      onDelete(event);
    }
    return false;
  };

  // IconButton style - sử dụng icon nhỏ
  if (useIcons) {
    return (
      <Box sx={{ display: "flex", ...sx }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
        {canEdit && (
          <Tooltip title={editTooltip}>
            <IconButton
              color="primary"
              onClick={handleEdit}
              size={size}
              sx={{ 
                mr: 1,
                pointerEvents: 'auto'
              }}
            >
              <EditIcon fontSize={size === "small" ? "small" : "medium"} />
            </IconButton>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title={deleteTooltip}>
            <IconButton 
              color="error" 
              onClick={handleDelete} 
              size={size}
              sx={{ pointerEvents: 'auto' }}
            >
              <DeleteIcon fontSize={size === "small" ? "small" : "medium"} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  // Button style - nút lớn hơn với nhãn
  return (
    <Stack direction={direction} spacing={1} sx={sx}>
      {canEdit ? (
        <Button
          startIcon={<EditIcon />}
          variant={variant}
          onClick={handleEdit}
          size={size}
        >
          {editLabel}
        </Button>
      ) : (
        <Tooltip title={editTooltip}>
          <span>
            <Button
              startIcon={<EditIcon />}
              variant={variant}
              disabled
              size={size}
            >
              {editLabel}
            </Button>
          </span>
        </Tooltip>
      )}

      {canDelete ? (
        <Button
          variant={variant}
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
          size={size}
        >
          {deleteLabel}
        </Button>
      ) : (
        <Tooltip title={deleteTooltip}>
          <span>
            <Button
              variant={variant}
              color="error"
              startIcon={<DeleteIcon />}
              disabled
              size={size}
            >
              {deleteLabel}
            </Button>
          </span>
        </Tooltip>
      )}
    </Stack>
  );
};

export default ActionButtons;
