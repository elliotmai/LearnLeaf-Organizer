import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { archiveProject, deleteProject, formatDateDisplay, formatTimeDisplay } from '/src/LearnLeaf_Functions.jsx';
import ProjectTasks from '/src/pages/ProjectTasks.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { Card, CardContent, Typography, Grid, Button, CardActions, Link, Box, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { EditProjectForm } from './EditProjectForm.jsx';

const CustomIconButton = styled(IconButton)({
    color: '#9F6C5B'
});

const ProjectWidget = ({ project, refreshProjects }) => {
    const [editedProject, setEditedProject] = useState({
        ...project,
    });
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDescriptionOpen, setDescriptionOpen] = useState(false);
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
        const confirmation = window.confirm("Are you sure you want to archive this project?\nThis will mark all outstanding tasks as Completed.");
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

    return (
        <>
            <EditProjectForm
                project={editedProject}
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={() => {
                    refreshProjects();
                    setEditModalOpen(false);
                }}
            />
            <Card
                sx={{
                    border: '3px solid', // Add border style to make it visible
                    borderRadius: '8px',
                    borderColor: 'black', // Use dynamic color value
                }}
            >
                <CardContent>
                    <Link
                        href={`/projects/${project.projectId}`} // Correct internal link for projects
                        underline="hover"
                        variant="h6"
                        color="inherit"
                        sx={{
                            color: '#355147',
                            display: 'block',
                            fontWeight: 'bold',
                            fontSize: '22px',
                        }}

                    >
                        {project.projectName}
                    </Link>

                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        {project.projectSubjects && project.projectSubjects.length > 0
                            ? `Subjects: ${project.projectSubjects.map(subject => subject.subjectName).join(', ')}`
                            : ''}
                    </Typography>

                    <Typography
                        variant="body2"
                        color="textSecondary"
                        onClick={() => setDescriptionOpen(true)}
                        sx={{
                            whiteSpace: 'pre-wrap',
                            fontStyle: 'italic',
                            textAlign: 'center',
                            padding: '8px',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {project.projectDescription}
                    </Typography>

                    {/* Dialog to show full description */}
                    <Dialog
                        open={isDescriptionOpen}
                        onClose={() => setDescriptionOpen(false)}
                        aria-labelledby="description-dialog-title"
                    >
                        <DialogTitle
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingRight: '16px'
                            }}
                        >
                            Full Description
                            <IconButton
                                aria-label="close"
                                onClick={() => setDescriptionOpen(false)}
                                sx={{
                                    color: (theme) => theme.palette.grey[500],
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                sx={{
                                    whiteSpace: 'pre-wrap',
                                    fontStyle: 'italic',
                                }}
                            >
                                {project.projectDescription}
                            </Typography>
                        </DialogContent>
                    </Dialog>

                    {project.nextTaskName ? (
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#9F6C5B',
                                fontWeight: 'bold',
                                paddingBottom: '1rem'
                            }}
                        > {/* Custom color for next task */}
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
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#9F6C5B',
                                fontWeight: 'bold'
                            }}
                        > {/* Custom color for no tasks */}
                            No Upcoming Tasks
                        </Typography>
                    )}

                    {/* PieChart with Conditional Centering */}
                    {data.some((entry) => entry.value > 0) && (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: isLargeScreen ? 'flex-start' : 'center', // Center chart on small screens
                                alignItems: 'center',
                                mt: 2,
                                mb: 2,
                            }}
                        >
                            <PieChart
                                width={isLargeScreen ? 400 : 300}
                                height={isLargeScreen ? 150 : 200}
                            >
                                <Pie
                                    data={data}
                                    cx="50%" // Center the chart on small screens
                                    cy="50%"
                                    outerRadius={70}
                                    innerRadius={40}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />

                                {/* Conditionally Render Legend only for Large Screens */}
                                {isLargeScreen ? (
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                    />
                                ) : (
                                    <Legend
                                        layout="horizontal"
                                        verticalAlign="bottom"
                                        align="center"
                                    />
                                )}
                            </PieChart>
                        </Box>
                    )}

                    <Typography
                        variant="body2"
                        sx={{
                            color: '#9F6C5B',
                            fontWeight: 'bold',
                            paddingTop: '1rem'
                        }}
                    >
                        {project.projectDueDate
                            ? `Project Due: ${formatDateDisplay(project.projectDueDate)}${project.projectDueTime ? ` at ${formatTimeDisplay(project.projectDueTime)}` : ''}`
                            : 'No Due Date Set'}
                    </Typography>
                </CardContent>
                <CardActions
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    {/* Edit Button on the far left */}
                    <CustomIconButton
                        aria-label="edit"

                        onClick={() => handleEditClick(project)}
                    >
                        <EditIcon
                            fontSize="medium"
                        />
                    </CustomIconButton>

                    {/* Grouping Archive and Delete buttons on the right */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            size="small"
                            onClick={handleArchiveProject}
                            variant="contained"
                            sx={{
                                backgroundColor: '#B6CDC8',
                                color: '#355147',
                                '&:hover': { backgroundColor: '#a8bdb8' },
                                mr: 1 // Reduce the margin to make them closer
                            }}
                        >
                            Archive
                        </Button>

                        <CustomIconButton
                            aria-label="delete"
                            onClick={() => handleDeleteClick(project.projectId)}
                        >
                            <DeleteIcon
                                fontSize="medium"
                            />
                        </CustomIconButton>
                    </div>
                </CardActions>
            </Card>
        </>
    );
};

export default ProjectWidget;
