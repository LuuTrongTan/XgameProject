import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';

/**
 * Component bọc TaskCard để cho phép kéo thả
 * 
 * @param {Object} props - Props của component
 * @param {Object} props.task - Task object
 * @param {string} props.status - Trạng thái của task
 * @param {Function} props.onClick - Hàm xử lý khi click vào task
 * @param {Function} props.onDelete - Hàm xử lý khi xóa task
 * @param {boolean} props.canDelete - Có quyền xóa task hay không
 * @returns {JSX.Element} - Component có thể kéo thả
 */
const DraggableTaskCard = ({ task, status, onClick, onDelete, canDelete }) => {
  // Kết nối với SortableContext thông qua useSortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task._id,
    data: {
      type: 'task',
      task,
      status,
    }
  });

  // Tạo style từ transform của useSortable
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
    position: 'relative',
  };

  // Handle click khi đang kéo
  const handleClick = (e) => {
    // Không thực hiện click khi đang kéo
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    if (onClick) {
      onClick(task);
    }
  };

  // Handle delete task
  const handleDelete = (taskId) => {
    if (isDragging) return;
    if (onDelete) {
      onDelete(taskId);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={style}
      data-task-id={task._id}
      data-type="task"
      data-status={status}
      className="draggable-task-card"
    >
      {/* Thanh kéo thả */}
      <div
        {...listeners}
        className="drag-handle"
        style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          color: '#888',
          zIndex: 10,
          borderRadius: '4px',
          backgroundColor: 'rgba(0,0,0,0.03)',
          transition: 'all 0.2s',
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 6H15M9 12H15M9 18H15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* TaskCard component */}
      <TaskCard
        task={task}
        onClick={handleClick}
        onDelete={handleDelete}
        canDelete={canDelete}
      />
    </div>
  );
};

export default DraggableTaskCard; 