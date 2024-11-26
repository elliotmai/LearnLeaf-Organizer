import React, { useState, useEffect } from 'react';
import {
    Accordion, AccordionSummary, AccordionDetails,
    Typography, List, ListItem, Card, CardContent,
    Grid, Divider, Button, Tooltip, CircularProgress,
    Box, TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArchiveIcon from '@mui/icons-material/Archive';
import RemoveDoneIcon from '@mui/icons-material/RemoveDone';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteIcon from '@mui/icons-material/Delete';
import TopBar from '/src/pages/TopBar.jsx';
import { getAllFromStore } from '/src/db.js';
import {
    sortSubjects, sortProjects, sortTasks, editTask, reactivateSubject, reactivateProject,
    deleteTask, deleteSubject, deleteProject, formatDateDisplay
} from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';

const ArchivePage = () => {
    const { user } = useUser();
    const [completedTasks, setCompletedTasks] = useState([]);
    const [archivedSubjects, setArchivedSubjects] = useState([]);
    const [archivedProjects, setArchivedProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Search states
    const [taskSearch, setTaskSearch] = useState('');
    const [subjectSearch, setSubjectSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Track manually controlled accordions
    const [expandedAccordions, setExpandedAccordions] = useState({
        tasks: false,
        subjects: false,
        projects: false
    });

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

    const matchesGlobalSearch = (item, fields) => {
        const search = globalSearch.toLowerCase();
        return fields.some(field => {
            if (field === 'taskSubject.subjectName' || field === 'taskProject.projectName') {
                // Handle nested fields for tasks
                return item?.[field.split('.')[0]]?.[field.split('.')[1]]?.toLowerCase().includes(search);
            }
            if (Array.isArray(item[field])) {
                // Handle array fields for projects
                return item[field].some(subItem =>
                    subItem?.subjectName?.toLowerCase().includes(search)
                );
            } else {
                return item[field]?.toString().toLowerCase().includes(search);
            }
        });
    };

    const filterResults = (items, localSearch, fields) => {
        return items.filter(item =>
            (!globalSearch || matchesGlobalSearch(item, fields)) &&
            (!localSearch || item?.[fields[0]]?.toLowerCase().includes(localSearch.toLowerCase()))
        );
    };

    const filteredTasks = filterResults(completedTasks, taskSearch, [
        'taskName',
        'taskDescription',
        'taskSubject.subjectName',
        'taskProject.projectName',
        'taskSubject.subjectSemester'
    ]);

    const filteredSubjects = filterResults(archivedSubjects, subjectSearch, [
        'subjectName',
        'subjectDescription',
        'subjectSemester'
    ]);

    const filteredProjects = filterResults(archivedProjects, projectSearch, [
        'projectName',
        'projectDescription',
        'projectSubjects'
    ]);

    const handleAccordionToggle = (section) => {
        setExpandedAccordions((prevState) => ({
            ...prevState,
            [section]: !prevState[section]
        }));
    };

    const handleChangeStatus = async (task) => {
        const updatedTask = { ...task, taskStatus: 'In Progress' };
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
        const confirmation = window.confirm("Are you sure you want to permanently delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);
                setCompletedTasks(prevTasks => prevTasks.filter(task => task.taskId !== taskId));
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        const confirmation = window.confirm("Delete this subject?\nAssociated tasks won’t be grouped under this subject anymore.");
        if (confirmation) {
            try {
                await deleteSubject(subjectId);
                setArchivedSubjects(prevSubjects => prevSubjects.filter(subject => subject.subjectId !== subjectId));
            } catch (error) {
                console.error("Error deleting subject:", error);
            }
        }
    };

    const handleDeleteProject = async (projectId) => {
        const confirmation = window.confirm("Delete this project?\nAssociated tasks won’t be grouped under this project anymore.");
        if (confirmation) {
            try {
                await deleteProject(projectId);
                setArchivedProjects(prevProjects => prevProjects.filter(project => project.projectId !== projectId));
            } catch (error) {
                console.error("Error deleting project:", error);
            }
        }
    };

    return (
        <Box style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <TopBar />
            <Typography variant="h4" sx={{ color: '#907474', textAlign: 'center', mt: 2 }}>
                {user?.name}'s Archive
            </Typography>

            {/* Global Search Bar */}
            <TextField
                fullWidth
                label="Search..."
                variant="outlined"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                sx={{ my: 2, maxWidth: '40%' }}
            />

            <Divider sx={{ my: 2, width: '90%' }} />

            {isLoading ? (
                <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: '150px' }}>
                    <CircularProgress />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Loading archived data...</Typography>
                </Grid>
            ) : (
                <Box sx={{ width: '90%', maxWidth: '1200px', overflowY: 'scroll', padding: '5px' }}>

                    {/* Completed Tasks Section */}
                    <Accordion
                        expanded={expandedAccordions.tasks}
                        onChange={() => handleAccordionToggle('tasks')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', color: '#64b5f6' }}>
                                <CheckCircleOutlineIcon sx={{ mr: 1 }} />
                                Completed Tasks
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <TextField
                                fullWidth
                                label="Search Name..."
                                variant="outlined"
                                value={taskSearch}
                                onChange={(e) => setTaskSearch(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <Grid container spacing={2}>
                                {filteredTasks.length > 0 ? filteredTasks.map(task => (
                                    <Grid item xs={12} sm={6} md={4} key={task.taskId}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="h6">{task.taskName}</Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    {task.taskDescription || 'No description provided.'}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Subject: {task.taskSubject?.subjectName || 'None'}
                                                    <br />
                                                    Project: {task.taskProject?.projectName || 'None'}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary" sx={{ pb: 1 }}>
                                                    Due Date: {task.taskDueDate ? formatDateDisplay(task.taskDueDate, user.dateFormat) : 'No Due Date'}
                                                </Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                                    <Button
                                                        variant="outlined"
                                                        color="secondary"
                                                        onClick={() => handleChangeStatus(task)}
                                                        startIcon={<RemoveDoneIcon />}
                                                    >
                                                        Reactivate
                                                    </Button>
                                                    <Tooltip title="Delete Task">
                                                        <Button
                                                            color="error"
                                                            onClick={() => handleDeleteTask(task.taskId)}
                                                            sx={{
                                                                color: '#d1566e',
                                                                minWidth: '40px',
                                                                width: '40px',
                                                                height: '40px',
                                                                p: '6px',
                                                                borderRadius: '50%',
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
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )) : (
                                    <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ width: '100%' }}>
                                        No completed tasks found.
                                    </Typography>
                                )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Divider sx={{ my: 2 }} />

                    {/* Archived Subjects Section */}
                    <Accordion
                        expanded={expandedAccordions.subjects}
                        onChange={() => handleAccordionToggle('subjects')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', color: '#ffa726' }}>
                                <ArchiveIcon sx={{ mr: 1 }} />
                                Archived Subjects
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <TextField
                                fullWidth
                                label="Search Name..."
                                variant="outlined"
                                value={subjectSearch}
                                onChange={(e) => setSubjectSearch(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <Grid container spacing={2}>
                                {filteredSubjects.length > 0 ? filteredSubjects.map(subject => (
                                    <Grid item xs={12} sm={6} md={4} key={subject.subjectId}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="h6">{subject.subjectName}</Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Semester: {subject.subjectSemester || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary" paddingBottom="5px">
                                                    {subject.subjectDescription || 'No description provided.'}
                                                </Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                                    <Button
                                                        variant="outlined"
                                                        color="secondary"
                                                        onClick={() => handleReactivateSubject(subject.subjectId)}
                                                        startIcon={<UnarchiveIcon />}
                                                    >
                                                        Reactivate
                                                    </Button>
                                                    <Tooltip title="Delete Subject">
                                                        <Button
                                                            color="error"
                                                            onClick={() => handleDeleteSubject(subject.subjectId)}
                                                            sx={{
                                                                color: '#d1566e',
                                                                minWidth: '40px',
                                                                width: '40px',
                                                                height: '40px',
                                                                p: '6px',
                                                                borderRadius: '50%',
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
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )) : (
                                    <Typography variant="body2" color="textSecondary" textAlign="center">
                                        No archived subjects found.
                                    </Typography>
                                )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Divider sx={{ my: 2 }} />

                    {/* Archived Projects Section */}
                    <Accordion
                        expanded={expandedAccordions.projects}
                        onChange={() => handleAccordionToggle('projects')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', color: '#ff7043' }}>
                                <ArchiveIcon sx={{ mr: 1 }} />
                                Archived Projects
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <TextField
                                fullWidth
                                label="Search Name..."
                                variant="outlined"
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <Grid container spacing={2}>
                                {filteredProjects.length > 0 ? filteredProjects.map(project => (
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
                                                <Typography variant="body2" color="textSecondary" paddingBottom="5px">
                                                    Due Date: {project.projectDueDate ? formatDateDisplay(project.projectDueDate, user.dateFormat) : 'No Due Date'}
                                                </Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                                    <Button
                                                        variant="outlined"
                                                        color="secondary"
                                                        onClick={() => handleReactivateProject(project.projectId)}
                                                        startIcon={<UnarchiveIcon />}
                                                    >
                                                        Reactivate
                                                    </Button>
                                                    <Tooltip title="Delete Project">
                                                        <Button
                                                            color="error"
                                                            onClick={() => handleDeleteProject(project.projectId)}
                                                            sx={{
                                                                color: '#d1566e',
                                                                minWidth: '40px',
                                                                width: '40px',
                                                                height: '40px',
                                                                p: '6px',
                                                                borderRadius: '50%',
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
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )) : (
                                    <Typography variant="body2" color="textSecondary" textAlign="center">
                                        No archived projects found.
                                    </Typography>
                                )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                </Box>
            )}
        </Box>
    );
};

export default ArchivePage;
