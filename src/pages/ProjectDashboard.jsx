import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useEffect, useState } from 'react';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import { fetchProjects, logoutUser } from '/src/LearnLeaf_Functions.jsx';
import { AddProjectForm } from '/src/Components/ProjectView/AddProjectForm.jsx';
import ProjectWidget from '/src/Components/ProjectView/ProjectWidget.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { Grid, useTheme, useMediaQuery } from '@mui/material'; // Import Material-UI components for layout
import '/src/Components/PageFormat.css';

const ProjectsDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { user, updateUser } = useUser();
    const navigate = useNavigate();

    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));

    const getItemsPerRow = () => {
        if (isSmallScreen) return 1;
        if (isMediumScreen) return 2;
        return 3;
    };

    useEffect(() => {
        if (user?.id) {
            fetchProjects(user.id)
                .then(fetchedProjects => setProjects(fetchedProjects))
                .catch(error => console.error("Error fetching projects:", error));
        }
    }, [user?.id]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const refreshProjects = async () => {
        const updatedProjects = await fetchProjects(user.id);
        setProjects(updatedProjects);
    };

    const itemsPerRow = getItemsPerRow();

    return (
        <div className="view-container">
            <TopBar />
            <Grid container spacing={3} className="projects-grid">
                {projects.map((project, index) => (
                    <Grid item xs={12} sm={6} md={4} key={project.id || `project-${index}`}>
                        <ProjectWidget
                            project={project}
                            refreshProjects={refreshProjects}
                        />
                    </Grid>
                ))}
            </Grid>
            <button className="fab" onClick={handleOpen}>
                +
            </button>
            {isOpen && (
                <AddProjectForm
                    isOpen={isOpen}
                    onClose={handleClose}
                    refreshProjects={refreshProjects}
                />
            )}
        </div>
    );
};

export default ProjectsDashboard;
