import React, { useState } from "react";

const RoleManagement = () => {
  const [roles, setRoles] = useState([
    { id: 1, name: "Admin" },
    { id: 2, name: "Project Manager" },
    { id: 3, name: "Member" },
  ]);

  return (
    <div className="role-management">
      <h2>Quản lý phân quyền</h2>
      <ul>
        {roles.map((role) => (
          <li key={role.id}>{role.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default RoleManagement;
