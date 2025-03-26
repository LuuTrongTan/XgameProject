import React, { useState, useEffect } from "react";
import { Tag } from "antd";
import { updateProject, getProjectById } from "../api/projectApi";
import { message } from "antd";
import { useParams } from "react-router-dom";

const ProjectDetails = () => {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch project details when component mounts or projectId changes
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const response = await getProjectById(projectId);
        console.log("Fetched project details:", response);
        setProject(response.data);
      } catch (error) {
        console.error("Error fetching project details:", error);
        message.error("Lỗi khi tải thông tin dự án");
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  const handleEditProject = async (values) => {
    try {
      console.log("Editing project with values:", values);
      await updateProject(projectId, {
        name: values.name,
        description: values.description,
        status: values.status,
      });

      // Fetch lại dữ liệu project
      const fetchProjectDetails = async () => {
        try {
          const response = await getProjectById(projectId);
          console.log("Re-fetched project details:", response);
          setProject(response.data);
        } catch (error) {
          console.error("Error fetching project details:", error);
          message.error("Lỗi khi tải thông tin dự án");
        }
      };

      await fetchProjectDetails();
      setIsEditModalOpen(false);
      message.success("Cập nhật dự án thành công");
    } catch (error) {
      console.error("Error updating project:", error);
      message.error(error.message || "Lỗi khi cập nhật dự án");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project?.name}</h1>
          <div className="mt-2">
            <Tag
              color={
                project?.status === "Hoàn thành"
                  ? "success"
                  : project?.status === "Đóng"
                  ? "default"
                  : "processing"
              }
            >
              {project?.status}
            </Tag>
          </div>
          <p className="text-gray-600 mt-2">{project?.description}</p>
        </div>
        {/* Rest of the component */}
      </div>
      {/* Rest of the component */}
    </div>
  );
};

export default ProjectDetails;
