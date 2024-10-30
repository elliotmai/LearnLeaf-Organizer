import React, { useState, useEffect } from 'react';
import {
    Accordion, AccordionSummary, AccordionDetails,
    Typography, List, ListItem, ListItemText,
    Card, CardContent, Grid, Divider, Button,
    Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArchiveIcon from '@mui/icons-material/Archive';
import RemoveDoneIcon from '@mui/icons-material/RemoveDone';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteIcon from '@mui/icons-material/Delete';
import TopBar from '/src/pages/TopBar.jsx';
import { getAllFromStore } from '/src/db.js';
import { sortSubjects, sortProjects, sortTasks, editTask, reactivateSubject, reactivateProject, deleteTask, deleteSubject, deleteProject, formatDateDisplay } from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';

const ArchivePage = () => {
    const { user } = useUser();
    const [completedTasks, setCompletedTasks] = useState([]);
    const [archivedSubjects, setArchivedSubjects] = useState([]);
    const [archivedProjects, setArchivedProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadArchivedData = async () => {
        setIsLoading(true);
        try {
            const allTasks = await getAllFromStore('tasks');
            const allSubjects = await getAllFromStore('subjects');
            const allProjects = await getAllFromStore('projects');

            const archivedProjectsWithDetails = allProjects
                .filter(project => project.projectStatus === 'Archived')
                .map(project => {
                    const projectSubjects = project.projectSubjects.map(subjId =>
                        allSubjects.find(subject => subject.subjectId === subjId)
                    );
                    return { ...project, projectSubjects };
                });

            const completedTasksWithDetails = allTasks
                .filter(task => task.taskStatus === 'Completed')
                .map(task => {
                    const taskSubject = allSubjects.find(subject => subject.subjectId === task.taskSubject);
                    const taskProject = allProjects.find(project => project.projectId === task.taskProject);
                    return { ...task, taskSubject, taskProject };
                });

            setArchivedSubjects(sortSubjects(allSubjects.filter(subject => subject.subjectStatus === 'Archived')));
            setArchivedProjects(sortProjects(archivedProjectsWithDetails));
            setCompletedTasks(sortTasks(completedTasksWithDetails));
        } catch (error) {
            console.error('Error loading archived data:', error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadArchivedData();
    }, []);

    const handleChangeStatus = async (task) => {
        const updatedTask = { ...task, taskStatus: 'In Progress' };
        console.log(updatedTask);
        await editTask(updatedTask);
        setCompletedTasks(prevTasks => prevTasks.filter(t => t.taskId !== task.taskId));
    };

    const handleReactivateSubject = async (subjectId) => {
        await reactivateSubject(subjectId);
        setArchivedSubjects(prevSubjects => prevSubjects.filter(s => s.subjectId !== subjectId));
    };

    const handleReactivateProject = async (projectId) => {
        await reactivateProject(projectId);
        setArchivedProjects(prevProjects => prevProjects.filter(p => p.projectId !== projectId));
    };

    const handleDeleteTask = async (taskId) => {
        await deleteTask(taskId);
        setCompletedTasks(prevTasks => prevTasks.filter(task => task.taskId !== taskId));
    };

    const handleDeleteSubject = async (subjectId) => {
        await deleteSubject(subjectId);
        setArchivedSubjects(prevSubjects => prevSubjects.filter(subject => subject.subjectId !== subjectId));
    };

    const handleDeleteProject = async (projectId) => {
        await deleteProject(projectId);
        setArchivedProjects(prevProjects => prevProjects.filter(project => project.projectId !== projectId));
    };

    return (
        <div>
            <TopBar />
            {isLoading ? (
                <Typography variant="h6" color="textSecondary" align="center">
                    Loading archived data...
                </Typography>
            ) : (
                <>
                    {/* Completed Tasks Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">
                                <CheckCircleOutlineIcon sx={{ marginRight: '8px', color: '#64b5f6' }} />
                                Completed Tasks
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                {completedTasks.length > 0 ? (
                                    completedTasks.map(task => (
                                        <ListItem key={task.taskId} divider>
                                            <ListItemText
                                                primary={<Typography variant="subtitle1">{task.taskName}</Typography>}
                                                secondary={
                                                    <>
                                                        <Typography
                                                            variant="body2"
                                                            color="textSecondary"
                                                            sx={{
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'break-word'
                                                            }}
                                                        >
                                                            {task.taskDescription || 'No description provided.'}
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary">
                                                            Subject: {task.taskSubject?.subjectName || 'None'}
                                                            <br />
                                                            Project: {task.taskProject?.projectName || 'None'}
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                                            Due Date: {task.taskDueDate ? formatDateDisplay(task.taskDueDate, user.dateFormat) : 'No Due Date'}
                                                        </Typography>
                                                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
                                                            <Button
                                                                variant="outlined"
                                                                color="secondary"
                                                                onClick={() => handleChangeStatus(task)}
                                                                startIcon={<RemoveDoneIcon />}
                                                                sx={{ marginRight: '0.5rem' }}
                                                            >
                                                                Reactivate
                                                            </Button>
                                                            <Tooltip title="Delete Task">
                                                                <Button
                                                                    color="error"
                                                                    onClick={() => handleDeleteTask(task.taskId)}
                                                                    sx={{
                                                                        color: '#d1566e',
                                                                        fontSize: 'xl',
                                                                        cursor: 'pointer',
                                                                        minWidth: '40px', // Consistent width
                                                                        width: '40px',    // Ensures circle shape
                                                                        height: '40px',   // Ensures circle shape
                                                                        padding: '6px',   // Inner spacing
                                                                        borderRadius: '50%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center', // Centers the icon
                                                                        '&:hover': {
                                                                            transform: 'scale(1.05)',
                                                                            backgroundColor: '#d1566e',
                                                                            color: '#fff',
                                                                        },
                                                                    }}
                                                                >
                                                                    <DeleteIcon />
                                                                </Button>
                                                            </Tooltip>
                                                        </div>

                                                    </>
                                                }
                                            />
                                        </ListItem>
                                    ))
                                ) : (
                                    <Typography variant="body2" color="textSecondary">No completed tasks found.</Typography>
                                )}
                            </List>
                        </AccordionDetails>
                    </Accordion>

                    <Divider sx={{ my: 2 }} />

                    {/* Archived Subjects Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">
                                <ArchiveIcon sx={{ marginRight: '8px', color: '#ffa726' }} />
                                Archived Subjects
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                {archivedSubjects.length > 0 ? (
                                    archivedSubjects.map(subject => (
                                        <Grid item xs={12} sm={6} md={4} key={subject.subjectId}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="h6">{subject.subjectName}</Typography>
                                                    <Typography variant="body2" color="textSecondary">
                                                        Semester: {subject.subjectSemester || 'N/A'}
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary" paddingBottom={'5px'}>
                                                        {subject.subjectDescription || 'No description provided.'}
                                                    </Typography>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-right' }}>
                                                            <Button
                                                                variant="outlined"
                                                                color="secondary"
                                                                onClick={() => handleReactivateSubject(subject.subjectId)}
                                                                // sx={{ marginLeft: '1rem' }}
                                                                startIcon={<UnarchiveIcon />}
                                                            >
                                                                Reactivate
                                                            </Button>
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                            <Tooltip title="Delete Subject">
                                                                <Button
                                                                    color="error"
                                                                    onClick={() => handleDeleteSubject(subject.subjectId)}
                                                                    sx={{
                                                                        color: '#d1566e',
                                                                        fontSize: 'xl',
                                                                        cursor: 'pointer',
                                                                        minWidth: '40px',   // Ensures circle shape
                                                                        width: '40px',      // Consistent width for circle
                                                                        height: '40px',     // Ensures circle shape
                                                                        padding: '6px',     // Inner spacing
                                                                        borderRadius: '50%', // Circle shape
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center', // Centers the icon
                                                                        '&:hover': {
                                                                            transform: 'scale(1.05)',
                                                                            backgroundColor: '#d1566e',
                                                                            color: '#fff',
                                                                        },
                                                                    }}
                                                                >
                                                                    <DeleteIcon />
                                                                </Button>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))
                                ) : (
                                    <Grid item xs={12} display="flex" justifyContent="center" alignItems="center">
                                        <Typography variant="body2" color="textSecondary" textAlign="center" gutterBottom>
                                            No archived subjects found.
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Divider sx={{ my: 2 }} />

                    {/* Archived Projects Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">
                                <ArchiveIcon sx={{ marginRight: '8px', color: '#ff7043' }} />
                                Archived Projects
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                {archivedProjects.length > 0 ? (
                                    archivedProjects.map(project => (
                                        <Grid item xs={12} sm={6} md={4} key={project.projectId}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="h6">{project.projectName}</Typography>
                                                    <Typography variant="body2" color="textSecondary">
                                                        Subjects: {project.projectSubjects?.map(s => s.subjectName).join(', ') || 'None'}
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary">
                                                        {project.projectDescription || 'No description provided.'}
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary" paddingBottom={'5px'}>
                                                        Due Date: {project.projectDueDate ? formatDateDisplay(project.projectDueDate, user.dateFormat) : 'No Due Date'}
                                                    </Typography>

                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-right' }}>
                                                            <Button
                                                                variant="outlined"
                                                                color="secondary"
                                                                onClick={() => handleReactivateProject(project.projectId)}
                                                                sx={{ marginTop: '0.5rem', marginRight: '0.5rem' }}
                                                                startIcon={<UnarchiveIcon />}
                                                            >
                                                                Reactivate
                                                            </Button>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                            <Tooltip title="Delete Project">
                                                                <Button
                                                                    color="error"
                                                                    onClick={() => handleDeleteProject(project.projectId)}
                                                                    sx={{
                                                                        color: '#d1566e',
                                                                        fontSize: 'xl',
                                                                        cursor: 'pointer',
                                                                        minWidth: '40px',   // Ensures circle shape
                                                                        width: '40px',      // Consistent width for circle
                                                                        height: '40px',     // Ensures circle shape
                                                                        padding: '6px',     // Inner spacing
                                                                        borderRadius: '50%', // Circle shape
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center', // Centers the icon
                                                                        '&:hover': {
                                                                            transform: 'scale(1.05)',
                                                                            backgroundColor: '#d1566e',
                                                                            color: '#fff',
                                                                        },
                                                                    }}
                                                                >
                                                                    <DeleteIcon />
                                                                </Button>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))
                                ) : (
                                    <Grid item xs={12} display="flex" justifyContent="center" alignItems="center">
                                        <Typography variant="body2" color="textSecondary" textAlign="center" gutterBottom>
                                            No archived projects found.
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                </>
            )
            }
        </div >
    );
};

export default ArchivePage;