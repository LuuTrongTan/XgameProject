import React from "react";
import TaskCard from "./TaskCard";

const Column = ({ title }) => {
  return (
    <div className="column">
      <h3>{title}</h3>
      <TaskCard title="Viết tài liệu API" />
      <TaskCard title="Tạo giao diện Kanban" />
    </div>
  );
};

export default Column;
