import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { archiveProject, deleteProject, formatDateDisplay, formatTimeDisplay } from '/src/LearnLeaf_Functions.jsx';
import ProjectTasks from '/src/pages/ProjectTasks.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { Card, CardContent, Typography, Grid, Button, CardActions, Link, Box, Dialog, DialogTitle, DialogContent, Tooltip } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { EditProjectForm } from './EditProjectForm.jsx';
import { useUser } from '/src/UserState.jsx';

const ProjectWidget = ({ project, subjects, refreshProjects }) => {
    const [editedProject, setEditedProject] = useState({
        ...project,
    });
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDescriptionOpen, setDescriptionOpen] = useState(false);
    const { user } = useUser();
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
        const confirmation = window.confirm("Archive this project?\nThis will not delete any associated tasks.");
        if (confirmation) {
            try {
                await archiveProject(project.projectId);
                refreshProjects();
            } catch (error) {
                console.error("Error archiving project:", error);
            }
        }
    };

    const handleEditClick = (project) => {
        setEditedProject({ ...project });
        setEditModalOpen(true);
    };

    const handleDeleteClick = async (projectId) => {
        const confirmation = window.confirm("Delete this project?\nAssociated tasks won’t be grouped under this project anymore.");
        if (confirmation) {
            try {
                await deleteProject(projectId);
                refreshProjects();
            } catch (error) {
                console.error("Error deleting project:", error);
            }
        }
    };

    return (
        <>
            <EditProjectForm
                project={editedProject}
                subjects={subjects}
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={() => {
                    refreshProjects();
                    setEditModalOpen(false);
                }}
            />
            <Card
                sx={{
                    borderRadius: '16px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                    padding: '16px',
                    backgroundColor: '#f9f9f9',
                    transition: 'transform 0.2s ease-in-out',
                }}
            >
                <CardContent>
                    <Tooltip title="View Associated Tasks">
                        <Link
                            href={`/projects/${project.projectId}`}
                            variant="h6"
                            sx={{
                                textDecoration: 'none',
                                fontWeight: 'bold',
                                color: '#355147',
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': { color: '#5B8E9F' },
                            }}
                        >
                            {project.projectName}
                        </Link>
                    </Tooltip>


                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        {project.projectSubjects && project.projectSubjects.length > 0 && project.projectSubjects[0].subjectId !== 'None'
                            ? `Subjects: ${project.projectSubjects.map(subject => subject.subjectName).join(', ')}`
                            : ''}
                    </Typography>

                    {project.projectDescription && (
                        <Tooltip title="Click to view full description">
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                onClick={() => setDescriptionOpen(true)}
                                sx={{
                                    fontStyle: 'italic',
                                    color: '#5B8E9F',
                                    whiteSpace: 'pre-wrap',
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    cursor: 'pointer',
                                    padding: '8px 0',
                                    textAlign: 'center',
                                    borderRadius: '8px',
                                    backgroundColor: '#f1f3f4',
                                }}
                            >
                                {project.projectDescription}
                            </Typography>
                        </Tooltip>
                    )}
                    <Dialog open={isDescriptionOpen} onClose={() => setDescriptionOpen(false)}>
                        <DialogTitle
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingRight: '16px',
                            }}
                        >
                            Full Description
                            <IconButton onClick={() => setDescriptionOpen(false)} sx={{ color: 'grey.500' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent
                            dividers
                            sx={{
                                maxHeight: '400px', // Set your desired max height
                                overflowY: 'auto', // Enable vertical scrolling
                            }}
                        >
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                sx={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    fontStyle: 'italic',
                                }}
                            >
                                {project.projectDescription}
                            </Typography>
                        </DialogContent>

                    </Dialog>

                    {project.nextTaskName ? (
                        <Typography variant="body2" sx={{ color: '#9F6C5B', fontWeight: 'bold' }}>
                            Next Task: {project.nextTaskName} <br />
                            {project.nextTaskDueDate ? `Due: ${formatDateDisplay(project.nextTaskDueDate, user.dateFormat)} ${project.nextTaskDueTime ? `at ${formatTimeDisplay(project.nextTaskDueTime, user.timeFormat)}` : ''}` : 'No Due Date Set'}
                        </Typography>
                    ) : (
                        <Typography variant="body2" sx={{ color: '#9F6C5B', fontWeight: 'bold' }}>No Upcoming Tasks</Typography>
                    )}

                    {data.some((entry) => entry.value > 0) && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, mb: 2 }}>
                            <PieChart width={300} height={200}>
                                <Pie data={data} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value">
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                        </Box>
                    )}

                    <Typography
                        variant="body2"
                        sx={{
                            color: '#9F6C5B',
                            fontWeight: 'bold',
                            paddingTop: '1rem',
                            textAlign: 'center',
                        }}
                    >
                        {project.projectDueDate
                            ? `Project Due: ${formatDateDisplay(project.projectDueDate, user.dateFormat)}${project.projectDueTime ? ` at ${formatTimeDisplay(project.projectDueTime, user.timeFormat)}` : ''}`
                            : 'No Due Date Set'}
                    </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', paddingX: 2 }}>
                    <Tooltip title="Edit Project">
                        <IconButton
                            onClick={() => handleEditClick(project)}
                            sx={{
                                color: '#9F6C5B',
                                '&:hover': {
                                    backgroundColor: '#9F6C5B',
                                    color: '#fff',
                                },
                            }}
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Box>
                        <Button
                            size="small"
                            onClick={handleArchiveProject}
                            sx={{
                                color: '#355147',
                                '&:hover': {
                                    backgroundColor: '#355147',
                                    color: '#fff',
                                },
                            }}
                        >
                            Archive
                        </Button>
                        <Tooltip title="Delete Project">
                            <IconButton
                                onClick={() => handleDeleteClick(project.projectId)}
                                sx={{
                                    color: '#F3161E',
                                    '&:hover': {
                                        backgroundColor: '#F3161E',
                                        color: '#fff',
                                    },
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </CardActions>
            </Card>
        </>
    );
};

export default ProjectWidget;