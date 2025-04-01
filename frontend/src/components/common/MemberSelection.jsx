import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { ROLES, getRoleName } from '../../config/constants';
import UserSelectionDialog from './UserSelectionDialog';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const MemberSelection = ({
  members,
  onMembersChange,
  showRoleSelection = true,
  projectMembers = [],
  title = "Thêm thành viên",
  mode = "all", // all: thêm email hoặc chọn user, project: chỉ chọn từ project members
  excludeCurrentUser = true
}) => {
  const { user } = useAuth();
  const { ROLES: usePermissionsROLES, getRoleName: usePermissionsGetRoleName } = usePermissions();
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    role: ROLES.MEMBER,
    inviteMethod: 'direct'
  });

  const filteredProjectMembers = projectMembers.filter(member => 
    !excludeCurrentUser || member.email !== user?.email
  );

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleInviteMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setNewMember(prev => ({
        ...prev,
        inviteMethod: newMethod,
        email: '',
        role: ROLES.MEMBER
      }));
    }
  };

  const handleAddMember = () => {
    if (!newMember.email || !validateEmail(newMember.email)) {
      return;
    }

    if (members.find(m => m.email === newMember.email)) {
      return;
    }

    onMembersChange([
      ...members,
      {
        ...newMember,
        status: 'pending'
      }
    ]);

    setNewMember({
      email: '',
      role: ROLES.MEMBER,
      inviteMethod: newMember.inviteMethod
    });
  };

  const handleUserSelect = (selectedUsers) => {
    console.log("MemberSelection - Selected users from dialog:", JSON.stringify(selectedUsers, null, 2));
    
    // Kiểm tra xem selectedUsers có dữ liệu không
    if (!selectedUsers || selectedUsers.length === 0) {
      console.log("No users selected");
      return;
    }
    
    // Đảm bảo mỗi thành viên mới đều có đủ thông tin cần thiết
    const newMembers = selectedUsers.map(user => {
      if (!user.email) {
        console.error("User missing email:", user);
      }
      
      // Log chi tiết từng user để debug
      console.log("Processing selected user:", {
        id: user._id || user.id,
        name: user.name,
        hasName: !!user.name,
        typeOfName: typeof user.name,
        email: user.email,
        role: user.role
      });
      
      // Dùng tên từ email nếu không có tên
      const displayName = user.name || (user.email ? user.email.split('@')[0] : "Người dùng");
      
      return {
        id: user._id || user.id,
        _id: user._id || user.id,
        name: displayName,
        email: user.email || "", 
        role: showRoleSelection ? (user.role || "member") : "member",
        status: 'active'
      };
    });
    
    console.log("MemberSelection - New members after processing:", JSON.stringify(newMembers, null, 2));

    // Loại bỏ các thành viên trùng lặp
    const uniqueMembers = [...members];
    const existingIds = new Set(members.map(m => m.id || m._id));
    const existingEmails = new Set(members.map(m => m.email));
    
    newMembers.forEach(newMember => {
      const memberId = newMember.id || newMember._id;
      const memberEmail = newMember.email;
      
      // Kiểm tra cả ID và email để tránh trùng lặp
      if (!existingIds.has(memberId) && !existingEmails.has(memberEmail)) {
        uniqueMembers.push(newMember);
        existingIds.add(memberId);
        existingEmails.add(memberEmail);
      }
    });
    
    console.log("MemberSelection - Final member list:", JSON.stringify(uniqueMembers, null, 2));
    onMembersChange(uniqueMembers);
    setOpenUserDialog(false);
  };

  const handleRemoveMember = (memberIdentifier) => {
    console.log("Removing member with identifier:", memberIdentifier);
    // Lọc thành viên với điều kiện chính xác
    const filteredMembers = members.filter(member => {
      // Kiểm tra các trường có thể chứa ID
      const memberId = member.id || member._id;
      // Nếu id hoặc email khớp với identifier, loại bỏ thành viên này
      return memberId !== memberIdentifier && member.email !== memberIdentifier;
    });
    
    console.log("Members after removal:", filteredMembers);
    onMembersChange(filteredMembers);
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>

      {mode === 'all' && (
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={newMember.inviteMethod}
            exclusive
            onChange={handleInviteMethodChange}
            sx={{ mb: 2, width: "100%" }}
          >
            <ToggleButton value="direct" sx={{ width: "50%" }}>
              <PersonAddIcon sx={{ mr: 1 }} />
              Thêm trực tiếp
            </ToggleButton>
            <ToggleButton value="email" sx={{ width: "50%" }}>
              <EmailIcon sx={{ mr: 1 }} />
              Gửi lời mời
            </ToggleButton>
          </ToggleButtonGroup>

          {newMember.inviteMethod === 'direct' ? (
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenUserDialog(true)}
              sx={{ mb: 2 }}
              fullWidth
            >
              Chọn thành viên
            </Button>
          ) : (
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Email"
                fullWidth
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                error={Boolean(newMember.email && !validateEmail(newMember.email))}
                helperText={newMember.email && !validateEmail(newMember.email) ? "Email không hợp lệ" : ""}
              />
              {showRoleSelection && (
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Vai trò</InputLabel>
                  <Select
                    value={newMember.role}
                    label="Vai trò"
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  >
                    {Object.values(ROLES).map((role) => (
                      <MenuItem key={role} value={role}>
                        {getRoleName(role)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button
                variant="contained"
                onClick={handleAddMember}
                disabled={!newMember.email || !validateEmail(newMember.email)}
              >
                <AddIcon />
              </Button>
            </Stack>
          )}
        </Box>
      )}

      {mode === 'project' && (
        <Button
          variant="outlined"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenUserDialog(true)}
          sx={{ mb: 2 }}
          fullWidth
        >
          Chọn thành viên 
        </Button>
      )}

      <Stack spacing={1}>
        {members.map((member) => (
          <Chip
            key={member.id || member.email}
            avatar={
              <Avatar src={member.avatar}>
                {(member.name || member.email || "?")[0]}
              </Avatar>
            }
            label={`${member.name || member.email || "Người dùng"}${
              showRoleSelection 
                ? ` (${getRoleName(member.role) || "Thành viên"})` 
                : ''
            }${member.status === 'pending' ? ' - Đang chờ' : ''}`}
            onDelete={() => {
              console.log("Delete clicked for member:", member);
              const id = member.id || member._id;
              handleRemoveMember(id);
            }}
            color={member.status === 'pending' ? 'warning' : 'primary'}
            sx={{ maxWidth: '100%' }}
          />
        ))}
      </Stack>

      <UserSelectionDialog
        open={openUserDialog}
        onClose={() => setOpenUserDialog(false)}
        onSubmit={handleUserSelect}
        selectedUsers={members}
        availableUsers={mode === 'project' ? filteredProjectMembers : []}
        showRoleSelection={showRoleSelection}
      />
    </Box>
  );
};

export default MemberSelection; 