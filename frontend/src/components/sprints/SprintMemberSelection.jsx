import React from 'react';
import { Box } from '@mui/material';
import MemberSelection from '../common/MemberSelection';

const SprintMemberSelection = ({ 
  sprintMembers, 
  onSprintMembersChange, 
  projectMembers,
  onAddToProject // callback khi thêm thành viên mới vào project
}) => {
  const handleMembersChange = (newMembers) => {
    // Kiểm tra xem có thành viên mới không có trong project
    const newProjectMembers = newMembers.filter(
      member => !projectMembers.some(pm => pm.id === member.id)
    );

    // Nếu có thành viên mới, thêm vào project trước
    if (newProjectMembers.length > 0 && onAddToProject) {
      onAddToProject(newProjectMembers);
    }

    // Cập nhật danh sách thành viên sprint
    onSprintMembersChange(newMembers);
  };

  return (
    <Box>
      <MemberSelection
        members={sprintMembers}
        onMembersChange={handleMembersChange}
        showRoleSelection={false}
        projectMembers={projectMembers}
        mode="project"
        title="Thêm thành viên vào Sprint"
      />
    </Box>
  );
};

export default SprintMemberSelection; 