import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Avatar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Tooltip,
  Alert,
  IconButton,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { useAuth } from "../../contexts/AuthContext";
import API from "../../api/api";
import { usePermissions } from "../../hooks/usePermissions";

const DocumentDetail = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [document, setDocument] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
  });

  // Sử dụng hook permissions
  const { getRoleName, canEditDocument, canDeleteDocument } = usePermissions();

  useEffect(() => {
    fetchDocumentDetails();
  }, [documentId]);

  const fetchDocumentDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/documents/${documentId}`);
      if (response.data) {
        setDocument(response.data);
        setEditForm({
          name: response.data.name,
          description: response.data.description || "",
          category: response.data.category || "General",
        });

        // Nếu document thuộc một project, lấy thông tin project
        if (response.data.project) {
          const projectResponse = await API.get(
            `/projects/${response.data.project}`
          );
          if (projectResponse.data) {
            setProject(projectResponse.data);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching document details:", err);
      setError(
        err.response?.data?.message || "Không thể tải thông tin tài liệu"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditDocument = async () => {
    if (!canEditDocument(document, project)) {
      enqueueSnackbar("Bạn không có quyền chỉnh sửa tài liệu này", {
        variant: "error",
        autoHideDuration: 5000,
      });
      return;
    }

    try {
      setLoading(true);
      const response = await API.put(`/documents/${documentId}`, editForm);
      if (response.data) {
        setDocument(response.data);
        setEditDialogOpen(false);
        enqueueSnackbar("Cập nhật tài liệu thành công", {
          variant: "success",
          autoHideDuration: 5000,
        });
      }
    } catch (err) {
      console.error("Error updating document:", err);
      enqueueSnackbar(
        err.response?.data?.message || "Không thể cập nhật tài liệu",
        {
          variant: "error",
          autoHideDuration: 5000,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!canDeleteDocument(document, project)) {
      enqueueSnackbar("Bạn không có quyền xóa tài liệu này", {
        variant: "error",
        autoHideDuration: 5000,
      });
      setDeleteDialogOpen(false);
      return;
    }

    try {
      setLoading(true);
      await API.delete(`/documents/${documentId}`);
      enqueueSnackbar("Tài liệu đã được xóa thành công", {
        variant: "success",
        autoHideDuration: 5000,
      });

      // Nếu document thuộc một project, chuyển về trang documents của project đó
      if (document.project) {
        navigate(`/projects/${document.project}/documents`);
      } else {
        navigate("/documents");
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      enqueueSnackbar(err.response?.data?.message || "Không thể xóa tài liệu", {
        variant: "error",
        autoHideDuration: 5000,
      });
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (document && document.fileUrl) {
      window.open(document.fileUrl, "_blank");
    } else {
      enqueueSnackbar("Không thể tải xuống tài liệu", {
        variant: "error",
        autoHideDuration: 5000,
      });
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button
          variant="contained"
          onClick={fetchDocumentDetails}
          sx={{ mt: 2 }}
        >
          Thử lại
        </Button>
      </Box>
    );
  }

  if (!document) return null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumb / Back Button */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center" }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          {project ? (
            <>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/projects")}
              >
                Dự án
              </span>
              {" > "}
              <span
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                {project.name}
              </span>
              {" > "}
              <span
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/projects/${project._id}/documents`)}
              >
                Tài liệu
              </span>
            </>
          ) : (
            <>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/documents")}
              >
                Tài liệu
              </span>
            </>
          )}
          {" > "} {document.name}
        </Typography>
      </Box>

      {/* Document Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              {document.name}
            </Typography>
            {document.category && (
              <Chip
                label={document.category}
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {document.description || "Không có mô tả"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Tải xuống
          </Button>

          {canEditDocument(document, project) ? (
            <Button
              startIcon={<EditIcon />}
              variant="outlined"
              onClick={() => setEditDialogOpen(true)}
            >
              Chỉnh sửa
            </Button>
          ) : (
            <Tooltip title="Bạn không có quyền chỉnh sửa tài liệu này">
              <span>
                <Button startIcon={<EditIcon />} variant="outlined" disabled>
                  Chỉnh sửa
                </Button>
              </span>
            </Tooltip>
          )}

          {canDeleteDocument(document, project) ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Xóa
            </Button>
          ) : (
            <Tooltip title="Bạn không có quyền xóa tài liệu này">
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled
                >
                  Xóa
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Document Details */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Thông tin tài liệu
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography color="text.secondary">Người tạo</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        src={document.createdBy?.avatar}
                        alt={document.createdBy?.name}
                      >
                        {document.createdBy?.name?.charAt(0) || <PersonIcon />}
                      </Avatar>
                      <Box>
                        <Typography>
                          {document.createdBy?.name || "Không xác định"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {document.createdBy?.email || ""}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography color="text.secondary">Ngày tạo</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CalendarIcon color="action" />
                      <Typography>
                        {new Date(document.createdAt).toLocaleDateString(
                          "vi-VN",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography color="text.secondary">
                      Loại tài liệu
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <DescriptionIcon color="action" />
                      <Typography>
                        {document.fileType || "Không xác định"}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography color="text.secondary">Kích thước</Typography>
                    <Typography>
                      {document.fileSize
                        ? `${(document.fileSize / 1024).toFixed(2)} KB`
                        : "Không xác định"}
                    </Typography>
                  </Stack>
                </Grid>
                {project && (
                  <Grid item xs={12}>
                    <Stack spacing={1}>
                      <Typography color="text.secondary">
                        Thuộc dự án
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          sx={{ cursor: "pointer", color: "primary.main" }}
                          onClick={() => navigate(`/projects/${project._id}`)}
                        >
                          {project.name}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Document Preview if available */}
          {document.fileType && document.fileType.includes("image") && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Xem trước
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    overflow: "hidden",
                    borderRadius: 1,
                  }}
                >
                  <img
                    src={document.fileUrl}
                    alt={document.name}
                    style={{ maxWidth: "100%", maxHeight: "500px" }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {document.fileType &&
            (document.fileType.includes("pdf") ||
              document.fileType.includes("text")) && (
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Xem trước không khả dụng
                  </Typography>
                  <Typography>
                    Vui lòng tải xuống tài liệu để xem nội dung.
                  </Typography>
                </CardContent>
              </Card>
            )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Thao tác
              </Typography>
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                >
                  Tải xuống
                </Button>
                {canEditDocument(document, project) && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setEditDialogOpen(true)}
                  >
                    Chỉnh sửa
                  </Button>
                )}
                {canDeleteDocument(document, project) && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Xóa
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chỉnh sửa tài liệu</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Tên tài liệu"
              fullWidth
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
            <TextField
              label="Mô tả"
              fullWidth
              multiline
              rows={4}
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
            />
            <TextField
              select
              label="Danh mục"
              fullWidth
              value={editForm.category}
              onChange={(e) =>
                setEditForm({ ...editForm, category: e.target.value })
              }
            >
              <MenuItem value="General">Chung</MenuItem>
              <MenuItem value="Technical">Kỹ thuật</MenuItem>
              <MenuItem value="Business">Kinh doanh</MenuItem>
              <MenuItem value="Design">Thiết kế</MenuItem>
              <MenuItem value="Legal">Pháp lý</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleEditDocument}
            disabled={!canEditDocument(document, project)}
          >
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Xác nhận xóa tài liệu</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa tài liệu "{document.name}"? Hành động này
            không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDocument}
            disabled={!canDeleteDocument(document, project) || loading}
          >
            {loading ? <CircularProgress size={24} /> : "Xóa tài liệu"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentDetail;
