import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ListItemAvatar,
  Avatar,
  Autocomplete,
  LinearProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TaskIcon from "@mui/icons-material/Task";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TodayIcon from "@mui/icons-material/Today";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import GroupIcon from "@mui/icons-material/Group";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import {
  getSprintById,
  deleteSprint,
  removeTaskFromSprint,
  getProjectById,
  getSprintMembers,
  addMemberToSprint,
  removeMemberFromSprint,
  getAvailableUsersForSprint,
  getSprints,
  updateSprint,
} from "../../api/sprintApi";
import api from "../../api/api";
import SprintFormDialog from "../../components/sprints/SprintFormDialog";
import TaskSelectionDialog from "../../components/sprints/TaskSelectionDialog";
import { useSnackbar } from "notistack";
import BackButton from "../../components/common/BackButton";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import ActionButtons from "../../components/common/ActionButtons";
import { getRoleName } from "../../config/constants";
import MemberItem from "../../components/common/MemberItem";
import SprintMemberSelection from "../../components/sprints/SprintMemberSelection";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getStatusColor = (status) => {
  switch (status) {
    case "planning":
      return "info";
    case "active":
      return "success";
    case "completed":
      return "secondary";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "planning":
      return "Lên kế hoạch";
    case "active":
      return "Đang thực hiện";
    case "completed":
      return "Hoàn thành";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
};

const getTaskStatusIcon = (status) => {
  switch (status) {
    case "todo":
      return <PendingIcon color="info" />;
    case "in_progress":
      return <AccessTimeIcon color="warning" />;
    case "done":
      return <CheckCircleIcon color="success" />;
    default:
      return <TaskIcon />;
  }
};

const getTaskStatusText = (status) => {
  switch (status) {
    case "todo":
      return "Cần làm";
    case "in_progress":
      return "Đang làm";
    case "done":
      return "Hoàn thành";
    default:
      return status;
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "error";
    default:
      return "default";
  }
};

const getPriorityText = (priority) => {
  switch (priority) {
    case "low":
      return "Thấp";
    case "medium":
      return "Trung bình";
    case "high":
      return "Cao";
    default:
      return priority;
  }
};

// Tính toán tiến độ sprint dựa trên thời gian
const calculateTimeProgress = (startDate, endDate) => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
};

// Tính toán tiến độ task hoàn thành
const calculateTaskProgress = (tasks) => {
  if (!tasks || tasks.length === 0) return 0;
  
  // Kiểm tra xem tasks có phải là mảng ID hay object
  const isTasksArrayOfIds = typeof tasks[0] === 'string';
  
  console.log('Tasks type check:', { 
    isArrayOfIds: isTasksArrayOfIds, 
    firstTaskType: typeof tasks[0],
    firstTask: tasks[0]
  });
  
  if (isTasksArrayOfIds) {
    // Nếu là mảng ID, không thể tính toán tiến độ
    console.log('Không thể tính tiến độ: tasks là mảng ID');
    return 0;
  }
  
  // Đếm số lượng task đã hoàn thành
  const completedTasks = tasks.filter(task => {
    // Kiểm tra trạng thái đã hoàn thành (trong model được định nghĩa là "done")
    return task.status === 'done';
  }).length;
  
  console.log('Tổng số tasks:', tasks.length);
  console.log('Số tasks đã hoàn thành:', completedTasks);
  console.log('Trạng thái các task:', tasks.map(t => ({ id: t._id, title: t.title, status: t.status })));
  
  return Math.round((completedTasks / tasks.length) * 100);
};

const SprintDetail = () => {
  const { projectId, sprintId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddTaskDialog, setOpenAddTaskDialog] = useState(false);
  const [openRemoveTaskDialog, setOpenRemoveTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const { user } = useAuth();
  const {
    canEditSprint,
    canDeleteSprint,
    canManageSprintMembers,
    canViewSprint,
  } = usePermissions();

  // Thêm state quản lý thành viên
  const [sprintMembers, setSprintMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Thêm state lưu danh sách thành viên project
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingProjectMembers, setLoadingProjectMembers] = useState(false);

  useEffect(() => {
    const fetchSprintDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching sprint details for projectId:", projectId, "and sprintId:", sprintId);

        // Lấy thông tin project trước
        const projectResponse = await getProjectById(projectId);
        console.log("Project response:", projectResponse);
        
        if (!projectResponse.success) {
          throw new Error(
            projectResponse.message || "Không thể tải thông tin dự án"
          );
        }

        // Lưu project data để sử dụng sau này
        const projectData = projectResponse.data;
        console.log("Project data:", projectData);
        
        // Kiểm tra quyền truy cập dự án
        if (!projectData) {
          throw new Error("Không thể tải thông tin dự án");
        }

        // Lấy danh sách sprint để lấy thông tin chính xác về số lượng task
        console.log("Fetching sprints list");
        const sprintsResponse = await getSprints(projectId);
        console.log("Sprints response:", sprintsResponse);
        
        let currentSprintFromList = null;
        
        if (sprintsResponse.success && Array.isArray(sprintsResponse.data)) {
          currentSprintFromList = sprintsResponse.data.find(s => s._id === sprintId);
          console.log("Sprint từ danh sách:", currentSprintFromList);
        }

        // Lấy thông tin sprint
        console.log("Fetching sprint detail with getSprintById");
        const response = await getSprintById(projectId, sprintId);
        console.log("Sprint detail response:", response);

        if (!response.success || !response.data) {
          throw new Error(response.message || "Không thể tải thông tin sprint");
        }

        // Gắn thông tin project vào sprint để kiểm tra phân quyền
        let sprintData = {
          ...response.data,
          project: projectData, // Đảm bảo sprint có đủ thông tin project
        };

        // Đảm bảo danh sách tasks được định nghĩa
        if (!sprintData.tasks) {
          sprintData.tasks = [];
        }

        // Nếu có thông tin từ danh sách sprint, sử dụng số lượng task từ đó
        if (currentSprintFromList && currentSprintFromList.tasks) {
          // Nếu từ danh sách có nhiều task hơn, sử dụng danh sách đó
          if (currentSprintFromList.tasks.length > sprintData.tasks.length) {
            sprintData.tasks = currentSprintFromList.tasks;
          }
        }

        console.log("Chi tiết sprint sau khi cập nhật:", sprintData);
        
        // Kiểm tra quyền truy cập sử dụng usePermissions hook
        const hasViewPermission = canViewSprint(sprintData);
        const isSprintMember = sprintData.members?.some(
          (member) => member.user?._id === user?._id
        );

        if (!hasViewPermission && !isSprintMember) {
          enqueueSnackbar("Bạn không có quyền xem sprint này", {
            variant: "error",
          });
          navigate(`/projects/${projectId}/sprints`);
          return;
        }

        setSprint(sprintData);
      } catch (err) {
        console.error("Error fetching sprint details:", err);
        setError(err.message || "Có lỗi xảy ra khi tải thông tin sprint");
      } finally {
        setLoading(false);
      }
    };

    fetchSprintDetails();
  }, [projectId, sprintId, refresh]);

  useEffect(() => {
    if (sprint) {
      fetchSprintMembers();
      
      // Kiểm tra nếu tasks là mảng ID, fetch thông tin chi tiết
      if (sprint.tasks && sprint.tasks.length > 0 && typeof sprint.tasks[0] === 'string') {
        console.log('Tasks là mảng ID, cần fetch thông tin chi tiết');
        fetchTaskDetails();
      }
    }
  }, [sprint, refresh]);
  
  // Thêm hàm fetch thông tin chi tiết của tasks
  const fetchTaskDetails = async () => {
    try {
      console.log('Đang fetch thông tin chi tiết task...');
      
      if (!sprint.tasks || sprint.tasks.length === 0) {
        console.log('Không có task nào để fetch');
        return;
      }
      
      // Nếu tasks đã là object đầy đủ, không cần fetch lại
      if (typeof sprint.tasks[0] !== 'string') {
        console.log('Tasks đã là object đầy đủ, không cần fetch lại');
        return;
      }
      
      // Fetch thông tin tất cả tasks của sprint
      const taskIds = sprint.tasks;
      console.log(`Cần fetch ${taskIds.length} tasks từ database`);
      
      // Fetch từng task một sử dụng đường dẫn API đúng
      const tasksPromises = taskIds.map(taskId => 
        api.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`)
          .then(res => res.data.data)
          .catch(err => {
            console.error(`Error fetching task ${taskId}:`, err);
            return null;
          })
      );
      
      const tasksResults = await Promise.all(tasksPromises);
      const validTasks = tasksResults.filter(t => t !== null);
      
      console.log('Fetched task details:', validTasks);
      
      // Cập nhật sprint với thông tin task đầy đủ
      setSprint(prev => ({
        ...prev,
        tasks: validTasks
      }));
      
    } catch (error) {
      console.error('Lỗi khi fetch thông tin chi tiết task:', error);
    }
  };
  
  // Thêm useEffect để tự động cập nhật trạng thái sprint thành "hoàn thành" khi đến hạn
  useEffect(() => {
    const autoUpdateSprintStatus = async () => {
      if (sprint && sprint.status !== 'completed' && sprint.status !== 'cancelled') {
        const endDate = new Date(sprint.endDate);
        const now = new Date();
        
        // Nếu ngày hiện tại vượt qua ngày kết thúc của sprint
        if (now > endDate) {
          try {
            console.log("Sprint đã hết hạn, đang cập nhật trạng thái...");
            
            // Chuẩn bị dữ liệu cập nhật
            const updatedSprintData = {
              ...sprint,
              status: 'completed'
            };
            
            // Gọi API cập nhật sprint
            const response = await updateSprint(projectId, sprintId, updatedSprintData);
            
            if (response.success) {
              enqueueSnackbar("Sprint đã được tự động cập nhật thành Hoàn thành", { variant: "info" });
              setRefresh(prev => prev + 1); // Làm mới dữ liệu
            }
          } catch (error) {
            console.error("Lỗi khi tự động cập nhật trạng thái sprint:", error);
          }
        }
      }
    };

    autoUpdateSprintStatus();
  }, [sprint, projectId, sprintId]);

  // Fetch danh sách thành viên của sprint
  const fetchSprintMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await getSprintMembers(projectId, sprintId);
      if (response.success) {
        setSprintMembers(response.data);
      } else {
        console.error("Lỗi khi lấy danh sách thành viên:", response.message);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thành viên:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Kiểm tra và trả về danh sách thành viên hiện có
  const getCurrentMembers = () => {
    // Nếu đã load được từ API riêng
    if (sprintMembers && sprintMembers.length > 0) {
      return sprintMembers;
    }
    
    // Nếu có từ thông tin sprint
    if (sprint && sprint.members && sprint.members.length > 0) {
      return sprint.members;
    }
    
    return [];
  };
  
  // Lấy thông tin người dùng từ cấu trúc thành viên 
  // (có thể khác nhau giữa sprintMembers và sprint.members)
  const getMemberUser = (member) => {
    if (!member) return null;
    
    // Nếu đã có thuộc tính user
    if (member.user) {
      return member.user;
    }
    
    // Nếu member là user object
    if (member._id || member.id) {
      return member;
    }
    
    return null;
  };

  // Thêm hàm fetch project members
  const fetchProjectMembers = async () => {
    try {
      setLoadingProjectMembers(true);
      
      // Lấy thông tin project trước (endpoint này đã hoạt động theo logs)
      const { getProjectById } = await import("../../api/sprintApi");
      const projectResponse = await getProjectById(projectId);
      
      if (projectResponse.success && projectResponse.data) {
        // Sử dụng danh sách thành viên từ project data
        if (projectResponse.data.members) {
          setProjectMembers(projectResponse.data.members);
        } else {
          setProjectMembers([]);
        }
      } else {
        console.error("Lỗi khi lấy thông tin dự án:", projectResponse.message);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thành viên dự án:", error);
    } finally {
      setLoadingProjectMembers(false);
    }
  };

  // Thêm useEffect để fetch project members
  useEffect(() => {
    if (projectId) {
      fetchProjectMembers();
    }
  }, [projectId]);

  // Cập nhật hàm mở dialog thêm thành viên
  const handleOpenAddMemberDialog = () => {
    setOpenAddMemberDialog(true);
  };

  // Đóng dialog thêm thành viên
  const handleCloseAddMemberDialog = () => {
    setOpenAddMemberDialog(false);
    setSelectedUser(null);
  };

  // Thêm thành viên vào sprint
  const handleAddMember = async () => {
    if (!selectedUser) {
      enqueueSnackbar("Vui lòng chọn người dùng", { variant: "warning" });
      return;
    }

    try {
      const response = await addMemberToSprint(
        projectId,
        sprintId,
        { userId: selectedUser._id }
      );
      
      if (response.success) {
        enqueueSnackbar("Thêm thành viên thành công", { variant: "success" });
        
        // Thêm thành viên vào state nếu API trả về thông tin
        if (response.data && response.data.member) {
          // Tạo một bản sao của thành viên hiện tại
          const updatedMembers = [...getCurrentMembers()];
          
          // Thêm thành viên mới nếu chưa tồn tại
          const existingMemberIndex = updatedMembers.findIndex(
            m => getMemberUser(m)?._id === selectedUser._id
          );
          
          if (existingMemberIndex === -1) {
            // Cập nhật state trước khi API refresh
            setSprintMembers(prev => prev ? [...prev, response.data.member] : [response.data.member]);
            
            // Cập nhật sprint.members nếu đang được sử dụng
            if (sprint && sprint.members) {
              setSprint(prev => ({
                ...prev,
                members: [...(prev.members || []), response.data.member]
              }));
            }
          }
        } else {
          // Nếu API không trả về chi tiết thành viên, làm mới toàn bộ dữ liệu
          setRefresh((prev) => prev + 1);
        }
        
        // Gọi lại API để cập nhật dữ liệu từ server
        setTimeout(() => {
          fetchSprintMembers();
        }, 500);
        
        handleCloseAddMemberDialog();
      } else {
        enqueueSnackbar(response.message || "Không thể thêm thành viên", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error adding member:", error);
      enqueueSnackbar(error.response?.data?.message || "Không thể thêm thành viên", { 
        variant: "error" 
      });
    }
  };

  // Xóa thành viên khỏi sprint
  const handleRemoveMember = async (userId) => {
    try {
      const response = await removeMemberFromSprint(
        projectId,
        sprintId,
        userId
      );
      if (response.success) {
        enqueueSnackbar("Đã xóa thành viên khỏi sprint", {
          variant: "success",
        });
        setRefresh((prev) => prev + 1);
      } else {
        enqueueSnackbar(response.message || "Không thể xóa thành viên", {
          variant: "error",
        });
      }
    } catch (error) {
      enqueueSnackbar("Không thể xóa thành viên", { variant: "error" });
    }
  };

  const handleOpenEditDialog = () => {
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleOpenAddTaskDialog = () => {
    setOpenAddTaskDialog(true);
  };

  const handleCloseAddTaskDialog = () => {
    setOpenAddTaskDialog(false);
  };

  const handleOpenRemoveTaskDialog = (task) => {
    setSelectedTask(task);
    setOpenRemoveTaskDialog(true);
  };

  const handleCloseRemoveTaskDialog = () => {
    setOpenRemoveTaskDialog(false);
    setSelectedTask(null);
  };

  const handleDeleteSprint = async () => {
    try {
      // Kiểm tra quyền xóa
      if (!canDeleteSprint(sprint.project)) {
        enqueueSnackbar("Bạn không có quyền xóa sprint này", {
          variant: "error",
        });
        handleCloseDeleteDialog();
        return;
      }

      await deleteSprint(projectId, sprintId);
      enqueueSnackbar("Sprint đã được xóa thành công", { variant: "success" });
      navigate(`/projects/${projectId}/sprints`);
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể xóa sprint", {
        variant: "error",
      });
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleRemoveTask = async () => {
    if (!selectedTask) return;

    try {
      // Hiển thị thông báo rằng tính năng chưa được hỗ trợ
      enqueueSnackbar("Tính năng gỡ task khỏi sprint chưa được hỗ trợ. Vui lòng liên hệ đội phát triển.", {
        variant: "warning",
      });
      
      // Đoạn code gọi API - giữ lại nhưng comment lại để tham khảo sau này
      /* 
      await removeTaskFromSprint(projectId, sprintId, selectedTask._id);
      enqueueSnackbar("Task đã được gỡ khỏi sprint thành công", {
        variant: "success",
      });
      setRefresh((prev) => prev + 1);
      */
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể gỡ task khỏi sprint", {
        variant: "error",
      });
    } finally {
      handleCloseRemoveTaskDialog();
    }
  };

  const handleFormSuccess = () => {
    setRefresh((prev) => prev + 1);
  };

  const handleTaskClick = (taskId) => {
    navigate(`/projects/${projectId}/tasks/${taskId}`);
  };

  const goBack = () => {
    navigate(`/projects/${projectId}/sprints`);
  };

  // Xử lý thêm thành viên vào cả project
  const handleAddToProject = async (newMembers) => {
    try {
      // Thêm từng thành viên vào project
      for (const member of newMembers) {
        if (!member.email) {
          console.error("Thiếu thông tin email cho thành viên:", member);
          continue;
        }
        
        // Đảm bảo role là "member" (chữ thường) cho phù hợp với API
        const role = member.role || "member";
        
        await addMember(projectId, member.email, role);
      }
      
      // Cập nhật danh sách thành viên project
      await fetchProjectMembers();
      
      enqueueSnackbar("Đã thêm thành viên mới vào dự án", { variant: "success" });
    } catch (error) {
      console.error("Lỗi khi thêm thành viên vào project:", error);
      enqueueSnackbar(`Không thể thêm thành viên vào dự án: ${error.message || 'Lỗi không xác định'}`, { variant: "error" });
    }
  };
  
  // Xử lý khi thay đổi danh sách thành viên của sprint
  const handleSprintMembersChange = async (newMembers) => {
    try {
      // Lấy danh sách thành viên hiện tại
      const currentMembers = getCurrentMembers();
      
      // Tìm các thành viên mới được thêm vào
      const addedMembers = newMembers.filter(
        newMember => !currentMembers.some(
          currentMember => 
            (getMemberUser(currentMember)?._id || getMemberUser(currentMember)?.id) === 
            (newMember._id || newMember.id)
        )
      );
      
      // Thêm từng thành viên mới vào sprint
      for (const member of addedMembers) {
        const userId = member._id || member.id;
        if (userId) {
          await addMemberToSprint(projectId, sprintId, { userId });
        }
      }
      
      setRefresh(prev => prev + 1);
      enqueueSnackbar("Đã cập nhật thành viên sprint", { variant: "success" });
    } catch (error) {
      console.error("Lỗi khi cập nhật thành viên sprint:", error);
      enqueueSnackbar("Không thể cập nhật thành viên", { variant: "error" });
    }
  };

  // Render ActionButtons trong Return
  const renderActionButtons = () => {
    // Kiểm tra quyền chỉnh sửa và xóa sprint
    const canEdit = canEditSprint(sprint?.project);
    const canDelete = canDeleteSprint(sprint?.project);
    
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          key="view-tasks-button"
          variant="contained"
          color="primary"
          size="small"
          startIcon={<TaskIcon />}
          onClick={() => navigate(`/projects/${projectId}/tasks?sprint=${sprintId}`)}
        >
          XEM CÔNG VIỆC
        </Button>
        <ActionButtons
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={handleOpenEditDialog}
          onDelete={handleOpenDeleteDialog}
          editTooltip="Bạn không có quyền chỉnh sửa sprint này"
          deleteTooltip="Bạn không có quyền xóa sprint này"
          useIcons={false}
          variant="outlined"
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <BackButton
          label="Quay lại danh sách sprint"
          onClick={goBack}
          sx={{ mt: 2 }}
        />
      </Box>
    );
  }

  if (!sprint) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Không tìm thấy thông tin sprint</Alert>
        <BackButton
          label="Quay lại danh sách sprint"
          onClick={goBack}
          sx={{ mt: 2 }}
        />
      </Box>
    );
  }

  // Tính toán tiến độ theo thời gian và tiến độ task
  // CHỈ tính khi sprint không phải null
  const timeProgress = calculateTimeProgress(sprint.startDate, sprint.endDate);
  const taskProgress = calculateTaskProgress(sprint.tasks);
  
  // Debug thông tin task
  console.log('Sprint tasks:', sprint.tasks);
  console.log('Task count:', sprint.tasks?.length || 0);
  console.log('Task progress:', taskProgress);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }} key="back-button-container">
        <BackButton key="back-button" label="Quay lại" onClick={goBack} />
      </Box>

      <Box
        key="header-container"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 4,
        }}
      >
        <Box key="header-title">
          <Typography key="sprint-title" variant="h4" component="h1" gutterBottom>
            {sprint.name}
          </Typography>
          <Chip
            key="status-chip"
            label={getStatusLabel(sprint.status)}
            color={getStatusColor(sprint.status)}
            size="small"
            sx={{ mb: 1 }}
          />
        </Box>
        <Box key="action-buttons">
          {renderActionButtons()}
        </Box>
      </Box>

      <Paper key="sprint-detail-paper" elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid key="sprint-detail-grid" container spacing={3}>
          <Grid key="sprint-detail-left" item xs={12}>
            <Box key="description-box" sx={{ mb: 3 }}>
              <Typography key="description-title" variant="h6" gutterBottom>
                Mô tả
              </Typography>
              <Typography key="description-content" variant="body1" sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                {sprint.description || "Không có mô tả"}
              </Typography>
            </Box>

            {sprint.goal && (
              <Box key="goal-box" sx={{ mb: 3 }}>
                <Typography key="goal-title" variant="h6" gutterBottom>
                  Mục tiêu
                </Typography>
                <Typography key="goal-content" variant="body1" sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                  {sprint.goal}
                </Typography>
              </Box>
            )}

            <Card key="info-card" sx={{ mb: 2 }}>
              <CardContent key="info-card-content">
                <Typography key="info-title" variant="h6" gutterBottom>
                  Thông tin Sprint
                </Typography>
                <Divider key="info-divider-1" sx={{ mb: 2 }} />

                <Stack key="info-stack" spacing={2}>
                  <Box key="time-info">
                    <Box key="time-label-box" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <CalendarTodayIcon key="time-icon" fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography key="time-label" variant="body2" color="text.secondary">
                        Thời gian
                      </Typography>
                    </Box>
                    <Typography key="time-value" variant="body1">
                      {formatDate(sprint.startDate)} -{" "}
                      {formatDate(sprint.endDate)}
                    </Typography>
                  </Box>

                  <Divider key="progress-divider" />
                  
                  <Box key="progress-section" sx={{ pt: 1 }}>
                    <Box key="progress-title-box" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TimerIcon key="progress-icon" fontSize="small" color="primary" sx={{ mr: 1 }} />
                      <Typography key="progress-title" variant="subtitle2">
                        Tiến trình Sprint
                      </Typography>
                    </Box>
                    
                    <Box
                      sx={{
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        p: 2,
                        boxShadow: 1,
                        mb: 3,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        Tiến trình Sprint
                      </Typography>

                      {/* Hiển thị tiến độ thời gian */}
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="body2">Tiến độ thời gian</Typography>
                          <Typography variant="body2">{calculateTimeProgress(sprint.startDate, sprint.endDate)}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={calculateTimeProgress(sprint.startDate, sprint.endDate)}
                          sx={{ height: 10, borderRadius: 5, mb: 2 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                        </Typography>
                      </Box>

                      {/* Hiển thị tiến độ công việc */}
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="body2">Tiến độ công việc</Typography>
                          <Typography variant="body2">
                            {sprint.tasks && sprint.tasks.length > 0 
                              ? `${sprint.tasks.filter(task => task.status === 'done').length}/${sprint.tasks.length} task hoàn thành` 
                              : "0/0 task"}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={calculateTaskProgress(sprint.tasks)}
                          color={sprint.tasks && sprint.tasks.filter(task => task.status === 'done').length === sprint.tasks.length && sprint.tasks.length > 0 ? "success" : "primary"}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          {calculateTaskProgress(sprint.tasks)}% hoàn thành
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Divider key="stats-divider" />
                  
                  <Box key="members-count-box">
                    <Box key="members-count-label" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <GroupIcon key="members-count-icon" fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography key="members-count-text" variant="body2" color="text.secondary">
                        Số lượng thành viên
                      </Typography>
                    </Box>
                    <Typography key="members-count-value" variant="body1">
                      {getCurrentMembers().length} thành viên
                    </Typography>
                  </Box>
                  
                  <Box key="tasks-count-box">
                    <Box key="tasks-count-label" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <AssignmentIcon key="tasks-count-icon" fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography key="tasks-count-text" variant="body2" color="text.secondary">
                        Số lượng task
                      </Typography>
                    </Box>
                    <Typography key="tasks-count-value" variant="body1">
                      {sprint.tasks ? sprint.tasks.length : 0} nhiệm vụ
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Phần Thành viên Sprint */}
      <Paper key="members-paper" elevation={1} sx={{ p: 3, mb: 4 }}>
        <Box
          key="members-header"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box key="members-title-box" sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupIcon key="members-icon" sx={{ mr: 1, color: 'primary.main' }} />
            <Typography key="members-title" variant="h5" fontWeight="500">Thành viên Sprint</Typography>
          </Box>
          {canManageSprintMembers(sprint) && (
            <Button
              key="add-member-button"
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PersonAddIcon key="add-member-icon" />}
              onClick={handleOpenAddMemberDialog}
            >
              THÊM THÀNH VIÊN
            </Button>
          )}
        </Box>

        {loadingMembers ? (
          <Box key="loading-members" sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            <CircularProgress key="loading-indicator" size={24} />
          </Box>
        ) : getCurrentMembers().length > 0 ? (
          <List key="members-list" sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {getCurrentMembers().map((member, index) => {
              const userInfo = getMemberUser(member);
              return (
                <MemberItem
                  key={userInfo?._id || userInfo?.id || `member-${index}`}
                  user={userInfo}
                  member={member}
                  canRemove={canManageSprintMembers(sprint)}
                  onRemove={handleRemoveMember}
                  creatorId={sprint.createdBy}
                />
              );
            })}
          </List>
        ) : (
          <Box key="no-members" sx={{ textAlign: 'center', py: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography key="no-members-text" variant="body1" color="text.secondary">
              Chưa có thành viên nào trong sprint này. Hãy thêm thành viên!
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Phần Nhiệm vụ trong Sprint */}
      <Paper key="tasks-paper" elevation={1} sx={{ p: 3, mb: 4 }}>
        <Box
          key="tasks-header"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box key="tasks-title-box" sx={{ display: 'flex', alignItems: 'center' }}>
            <AssignmentIcon key="tasks-icon" sx={{ mr: 1, color: 'primary.main' }} />
            <Typography key="tasks-title" variant="h5" fontWeight="500">Nhiệm vụ Sprint</Typography>
          </Box>
          <Button
            key="manage-tasks-button"
            variant="contained"
            color="primary"
            size="small"
            onClick={() => navigate(`/projects/${projectId}/tasks?sprint=${sprintId}`)}
          >
            QUẢN LÝ NHIỆM VỤ
          </Button>
        </Box>

        {sprint.tasks && sprint.tasks.length > 0 ? (
          <List key="tasks-list" sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {sprint.tasks.map((task, index) => (
              <ListItem
                key={task._id || `task-${index}`}
                button
                onClick={() => handleTaskClick(task._id)}
                sx={{ 
                  borderLeft: '4px solid', 
                  borderColor: getPriorityColor(task.priority) + '.main',
                  mb: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover', boxShadow: 1 }
                }}
              >
                <ListItemIcon key={`task-icon-${task._id || index}`}>
                  {getTaskStatusIcon(task.status)}
                </ListItemIcon>
                <ListItemText
                  key={`task-text-${task._id || index}`}
                  primary={
                    <Typography key={`task-title-${task._id || index}`} variant="subtitle2">
                      {task.title}
                    </Typography>
                  }
                  secondary={
                    <Typography key={`task-subtitle-${task._id || index}`} variant="body2" color="text.secondary">
                      {getTaskStatusText(task.status)} - Mức ưu tiên: {getPriorityText(task.priority)}
                    </Typography>
                  }
                />
                {canManageSprintMembers(sprint) && (
                  <IconButton
                    key={`task-remove-${task._id || index}`}
                    edge="end"
                    aria-label="remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRemoveTaskDialog(task);
                    }}
                    sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                  >
                    <RemoveCircleOutlineIcon key={`task-remove-icon-${task._id || index}`} color="error" />
                  </IconButton>
                )}
              </ListItem>
            ))}
          </List>
        ) : (
          <Box key="no-tasks" sx={{ textAlign: 'center', py: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography key="no-tasks-text" variant="body1" color="text.secondary">
              Chưa có nhiệm vụ nào trong sprint này.
            </Typography>
          </Box>
        )}
      </Paper>

      {sprint && (
        <SprintFormDialog
          open={openEditDialog}
          onClose={handleCloseEditDialog}
          projectId={projectId}
          onSuccess={handleFormSuccess}
          sprint={sprint}
          isEditing
          disabled={!canEditSprint(sprint?.project)}
          showMemberSelection={false}
        />
      )}

      {/* Dialog thêm thành viên */}
      <Dialog 
        open={openAddMemberDialog} 
        onClose={handleCloseAddMemberDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle key="add-member-title" sx={{ pb: 1 }}>Thêm thành viên vào Sprint</DialogTitle>
        <DialogContent key="add-member-content" sx={{ pt: 2 }}>
          <Typography key="add-member-text" variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Chỉ có thể thêm những người đã ở trong dự án
          </Typography>
          
          {loadingProjectMembers ? (
            <Box key="loading-box" sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress key="loading-progress" size={24} />
            </Box>
          ) : (
            <SprintMemberSelection
              key="member-selection"
              sprintMembers={[]}
              onSprintMembersChange={handleSprintMembersChange}
              projectMembers={projectMembers}
              onAddToProject={handleAddToProject}
            />
          )}
        </DialogContent>
        <DialogActions key="add-member-actions" sx={{ px: 3, pb: 2 }}>
          <Button key="close-add-member" onClick={handleCloseAddMemberDialog} color="inherit">Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle key="delete-title">Xóa Sprint</DialogTitle>
        <DialogContent key="delete-content">
          <Typography key="delete-message">
            Bạn có chắc chắn muốn xóa sprint "{sprint?.name}"? Tất cả các nhiệm
            vụ sẽ được gỡ khỏi sprint này, nhưng không bị xóa. Hành động này
            không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions key="delete-actions">
          <Button key="cancel-delete" onClick={handleCloseDeleteDialog}>Hủy</Button>
          <Button
            key="confirm-delete"
            onClick={handleDeleteSprint}
            color="error"
            disabled={!canDeleteSprint(sprint?.project)}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xác nhận gỡ task khỏi sprint */}
      <Dialog open={openRemoveTaskDialog} onClose={handleCloseRemoveTaskDialog}>
        <DialogTitle key="dialog-title">Tính năng chưa được hỗ trợ</DialogTitle>
        <DialogContent key="dialog-content">
          <Typography key="warning-text" color="warning.main" gutterBottom>
            Tính năng gỡ task khỏi sprint hiện chưa được hỗ trợ trên backend.
          </Typography>
          <Typography key="info-text">
            Bạn có thể tiếp tục thử chức năng này, nhưng thay đổi sẽ không được lưu lại.
            Vui lòng liên hệ đội phát triển để triển khai tính năng này.
          </Typography>
        </DialogContent>
        <DialogActions key="dialog-actions">
          <Button key="cancel-remove-task" onClick={handleCloseRemoveTaskDialog}>Đóng</Button>
          <Button
            key="confirm-remove-task"
            onClick={handleRemoveTask}
            color="warning"
          >
            Thử nghiệm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SprintDetail;
