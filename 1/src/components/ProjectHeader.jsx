import React from "react";
import { Tag } from "antd";

const ProjectHeader = ({ project }) => {
  console.log("Project in header:", project);

  const getStatusColor = (status) => {
    switch (status) {
      case "Hoàn thành":
        return "success";
      case "Đóng":
        return "default";
      default:
        return "processing";
    }
  };

  return (
    <div className="flex items-center">
      <h1 className="text-2xl font-bold mr-4">{project?.name}</h1>
      <Tag color={getStatusColor(project?.status)}>
        {project?.status || "Đang hoạt động"}
      </Tag>
    </div>
  );
};

export default ProjectHeader;
