import React, { useState, useEffect } from "react";
import { Container, Grid, Typography, Button, Box } from "@mui/material";
import API from "../../api/api";

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await API.get("/projects");
      setProjects(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4">Danh sách dự án</Typography>
      </Box>
      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project._id}>
            {/* Project card sẽ được thêm sau */}
            <Box sx={{ p: 2, border: "1px solid #ddd" }}>
              <Typography variant="h6">{project.name}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default ProjectList;
