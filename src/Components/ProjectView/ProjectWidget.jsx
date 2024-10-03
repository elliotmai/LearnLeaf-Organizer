import React, { useState } from 'react';
import {useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { archiveProject, deleteProject, formatDateDisplay, formatTimeDisplay } from '/src/LearnLeaf_Functions.jsx';
import ProjectTasks from '/src/pages/ProjectTasks.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Link } from '@mui/material';
import { EditProjectForm } from './EditProjectForm.jsx';

const CustomIconButton = styled(IconButton)({
    '&:hover': {
        backgroundColor: '#9F6C5B',
    },
});

const ArchiveButton = styled(Button)(({ theme }) => ({
    backgroundColor: theme.palette.warning.main,
    color: '#fff',
    '&:hover': {
        backgroundColor: theme.palette.warning.dark,
    },
}));

const ProjectWidget = ({ project, refreshProjects }) => {
    const [editedProject, setEditedProject] = useState({
        projectId: project.id,
        ...project,
    });
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const navigate = useNavigate();
    const theme = useTheme();
    const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg')); // Large screen detection

    const colors = ['#355147', '#5B8E9F', '#F3161E'];

    // Data for PieChart
    const data = [
        { name: 'Completed', value: project.statusCounts.Completed },
        { name: 'In Progress', value: project.statusCounts.InProgress },
        { name: 'Not Started', value: project.statusCounts.NotStarted },
    ];

    const handleArchiveProject = async () => {
        try {
            await archiveProject(project.projectId);
            refreshProjects();
        } catch (error) {
            console.error("Error archiving project:", error);
        }
    };

    const handleEditClick = (project) => {
        setEditedProject({ ...project });
        setEditModalOpen(true);
    };

    const handleDeleteClick = async (projectId) => {
        const confirmation = window.confirm("Are you sure you want to delete this project? (This will not delete any associated tasks.)");
        if (confirmation) {
            try {
                await deleteProject(projectId);
                refreshProjects();
            } catch (error) {
                console.error("Error deleting project:", error);
            }
        }
    };

    const handleProjectClick = () => {
        ProjectTasks(project);
        navigate(`/projects/${project.projectId}`);
    };

    return (
        <>
            <EditProjectForm
                project={editedProject}
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={(updatedProject) => {
                    refreshProjects();
                    setEditModalOpen(false);
                }}
            />
            <Card
                sx={{
                    mb: 2,
                    backgroundColor: '#f4f6f7', // Matching background color from SubjectWidget
                    border: '2px solid black', // Black border as requested
                    borderRadius: 2,
                }}
            >
                <CardContent>
                    <Link
                        href={`/projects/${project.projectId}`} // Correct internal link for projects
                        variant="h6"
                        underline="none" // Ensures no underline by default
                        sx={{
                            color: '#355147',
                            fontSize: '20px', // Apply font size
                            display: 'block', // Ensure it's a block element
                            fontWeight: 'bold', // Apply bold weight
                            marginBottom: '8px', // Spacing below the text
                            paddingBottom: '5px', // Extra padding if needed
                            '&:hover': {
                                textDecoration: 'underline' // Hover effect for underline
                            }
                        }}
                    >
                        {project.projectName}
                    </Link>

                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        {project.subject ? `Subject: ${project.subject}` : ' '}
                    </Typography>

                    {project.nextTaskName ? (
                        <Typography variant="body2" sx={{ color: '#9F6C5B', fontWeight: 'bold' }}> {/* Custom color for next task */}
                            Next Task: {project.nextTaskName} <br />
                            {project.nextTaskDueDate ? (
                                <>
                                    Due: {formatDateDisplay(project.nextTaskDueDate)} {project.nextTaskDueTime && ` at ${formatTimeDisplay(project.nextTaskDueTime)}`}
                                </>
                            ) : (
                                'No Due Date Set'
                            )}
                        </Typography>
                    ) : (
                        <Typography variant="body2" sx={{ color: '#9F6C5B', fontWeight: 'bold' }}> {/* Custom color for no tasks */}
                            No Upcoming Tasks
                        </Typography>
                    )}

                    {/* PieChart with Conditional Legend */}
                    {data.some(entry => entry.value > 0) && (
                        <PieChart width={isLargeScreen ? 400 : 200} height={150}>
                            <Pie
                                data={data}
                                cx="50%" // Center the chart on small screens
                                cy="50%"
                                outerRadius={70}
                                innerRadius={40}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />

                            {/* Conditionally Render Legend only for Large Screens */}
                            {isLargeScreen && <Legend layout="vertical" verticalAlign="middle" align="right" />}
                        </PieChart>
                    )}

                    <Typography variant="body2" sx={{ color: '#9F6C5B', fontWeight: 'bold' }} gutterBottom> {/* Custom color for project due */}
                        {project.projectDueDate
                            ? `Project Due: ${formatDateDisplay(project.projectDueDate)}${project.projectDueTime ? ` at ${formatTimeDisplay(project.projectDueTime)}` : ''}`
                            : 'No Due Date Set'}
                    </Typography>

                    <Grid container spacing={1} justifyContent="space-between" alignItems="center">
                        {project.status === "Active" && (
                            <ArchiveButton
                                variant="contained"
                                onClick={handleArchiveProject}
                                size="small"
                                sx={{ backgroundColor: '#B6CDC8', color: '#355147', '&:hover': { backgroundColor: '#a8bdb8' }, mr: 2, ml: 1 }}
                            >
                                Archive
                            </ArchiveButton>
                        )}
                        <Grid item>
                            <CustomIconButton aria-label="edit" onClick={() => handleEditClick(project)}>
                                <EditIcon />
                            </CustomIconButton>
                            <CustomIconButton aria-label="delete" onClick={() => handleDeleteClick(project.projectId)}>
                                <DeleteIcon />
                            </CustomIconButton>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </>
    );
};

export default ProjectWidget;
