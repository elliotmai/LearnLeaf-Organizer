import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useNavigate } from 'react-router-dom';
import { sortSubjects, sortProjects,archiveProject, deleteProject, } from '/src/LearnLeaf_Functions.jsx';
import debounce from 'lodash.debounce';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore } from '/src/db.js';
import { AddProjectForm } from '/src/Components/ProjectView/AddProjectForm.jsx';
import ProjectWidget from '/src/Components/ProjectView/ProjectWidget.jsx';
import ProjectFilterBar from './ProjectFilterBar.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { Grid, CircularProgress, Paper, Typography,Menu,MenuItem, Box, Button, useTheme, useMediaQuery, Checkbox, FormControlLabel } from '@mui/material';
import EmojiNatureIcon from '@mui/icons-material/EmojiNature';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const ProjectsDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useUser();
    const navigate = useNavigate();
    const [selectedProjects, setSelectedProjects] = useState([]);

    const [filterCriteria, setFilterCriteria] = useState({
        searchProject: '',
        searchSubject: '',
        searchDescription: '',
        dueDate: '',
        dueDateComparison: ''
    });

    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));


    const [anchorEl, setAnchorEl] = useState(null); // State to manage the dropdown anchor

    // Open the dropdown menu
    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    // Close the dropdown menu
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const getItemsPerRow = () => {
        return isSmallScreen ? 1 : isMediumScreen ? 2 : 3;
    };

    const loadFromIndexedDB = async () => {
        try {
            const activeProjects = (await getAllFromStore('projects')).filter(project => project.projectStatus === 'Active');
            const allSubjects = (await getAllFromStore('subjects'));
            const storedTasks = await getAllFromStore('tasks');

            const projectsWithDetails = activeProjects.map((project) => {
                const projectTasks = storedTasks.filter(task => task.taskProject === project.projectId);
                const statusCounts = projectTasks.reduce((acc, task) => {
                    const taskStatus = task.taskStatus.replace(/\s+/g, '');
                    if (['NotStarted', 'InProgress', 'Completed'].includes(taskStatus)) {
                        acc[taskStatus] = (acc[taskStatus] || 0) + 1;
                    }
                    return acc;
                }, { NotStarted: 0, InProgress: 0, Completed: 0 });

                const nextTask = projectTasks
                    .filter(task => task.taskStatus !== 'Completed' && task.taskDueDate)
                    .sort((a, b) => a.taskDueDate.localeCompare(b.taskDueDate))[0];

                const projectSubjects = project.projectSubjects.map((subj) => (
                    allSubjects.find(subject => subject.subjectId === subj)
                ));

                return {
                    ...project,
                    statusCounts,
                    nextTaskName: nextTask?.taskName,
                    nextTaskDueDate: nextTask?.taskDueDate,
                    nextTaskDueTime: nextTask?.taskDueTime,
                    projectSubjects
                };
            });

            const sortedSubjects = sortSubjects(allSubjects);
            const sortedProjects = sortProjects(projectsWithDetails);

            setSubjects(sortedSubjects);
            setProjects(sortedProjects);
            setIsLoading(false);
            return true;
        } catch (error) {
            console.error('Error loading from IndexedDB:', error);
            return false;
        }
    };

    const updateState = async () => {
        setIsLoading(true);
        const isLoadedFromIndexedDB = await loadFromIndexedDB();
        if (!isLoadedFromIndexedDB) {
            console.log("No projects data found in IndexedDB.");
        }
    };

    useEffect(() => {
        if (user?.id) {
            updateState();
        }
    }, [user?.id]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const filterByDate = (projectDateStr, filterDateStr, comparisonType) => {
        const projectDate = new Date(projectDateStr).setHours(0, 0, 0, 0);
        const filterDate = new Date(filterDateStr).setHours(0, 0, 0, 0);
        switch (comparisonType) {
            case 'before': return projectDate < filterDate;
            case 'before-equal': return projectDate <= filterDate;
            case 'equal': return projectDate === filterDate;
            case 'after': return projectDate > filterDate;
            case 'after-equal': return projectDate >= filterDate;
            default: return true;
        }
    };

    const getFilteredProjects = () => {
        return projects.filter((project) => {
            const matchesSearchProject = !filterCriteria.searchProject || project.projectName.toLowerCase().includes(filterCriteria.searchProject.toLowerCase());
            const matchesSearchSubject = !filterCriteria.searchSubject || project.projectSubjects.some(subject => subject.subjectName.toLowerCase().includes(filterCriteria.searchSubject.toLowerCase()));
            const matchesSearchDescription = !filterCriteria.searchDescription || project.projectDescription.toLowerCase().includes(filterCriteria.searchDescription.toLowerCase());

            let matchesDueDate = true;
            if (filterCriteria.dueDateComparison === "none") {
                matchesDueDate = !project.projectDueDate;
            } else if (filterCriteria.dueDate) {
                matchesDueDate = filterByDate(project.projectDueDate, filterCriteria.dueDate, filterCriteria.dueDateComparison);
            }

            return matchesSearchProject && matchesSearchSubject && matchesSearchDescription && matchesDueDate;
        });
    };

    const clearFilters = () => {
        setFilterCriteria({ searchProject: '', searchSubject: '', searchDescription: '', dueDate: '', dueDateComparison: '' });
    };

    const toggleProjectSelection = (projectId) => {
        setSelectedProjects(prevSelected =>
            prevSelected.includes(projectId)
                ? prevSelected.filter(id => id !== projectId)
                : [...prevSelected, projectId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedProjects.length === filteredProjects.length) {
            setSelectedProjects([]);
        } else {
            setSelectedProjects(filteredProjects.map(project => project.projectId));
        }
    };

    const handleBulkArchive = async () => {
        const confirmation = window.confirm("Archive all selected projects?\nThis will not delete any associated tasks.");
        if (confirmation) {
            try {
                await Promise.all(selectedProjects.map(projectId => archiveProject(projectId)));
                console.log("Projects archived successfully.");
                updateState();
                setSelectedProjects([]);
            } catch (error) {
                console.error("Error archiving projects:", error);
            }
        }
    };

    const handleBulkDelete = async () => {
        const confirmation = window.confirm("Delete all selected projects?\nAssociated tasks won’t be grouped under these projects anymore.");
        if (confirmation) {
            try {
                await Promise.all(selectedProjects.map(projectId => deleteProject(projectId)));
                console.log("Projects deleted successfully.");
                updateState();
                setSelectedProjects([]);
            } catch (error) {
                console.error("Error deleting projects:", error);
            }
        }
    };

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 600;
    const filteredProjects = getFilteredProjects();
    const totalRows = Math.ceil(filteredProjects.length / itemsPerRow);

    const Row = React.memo(({ index, style }) => {
        const startIndex = index * itemsPerRow;
        return (
            <div style={style}>
                <Grid container spacing={2}>
                    {Array(itemsPerRow).fill(null).map((_, i) => {
                        const projectIndex = startIndex + i;
                        return projectIndex < filteredProjects.length ? (
                            <Grid item xs={12} sm={6} md={4} key={filteredProjects[projectIndex].projectId}>
                             
                                   <ProjectWidget
                                            project={filteredProjects[projectIndex]}
                                            subjects={subjects}
                                            refreshProjects={loadFromIndexedDB}
                                            selectedProjects={selectedProjects}
                                            projectIndex={projectIndex}
                                            toggleProjectSelection={toggleProjectSelection}
                                            filteredProjects={filteredProjects}
                                        />
                            </Grid>
                        ) : null;
                    })}
                </Grid>
            </div>
        );
    });

    return (
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TopBar />
            <Grid container direction="column" alignItems="center" justifyItems="center" width="100%" margin="auto">
                <Typography variant="h4" sx={{ color: '#907474', textAlign: 'center', mt: 2 }}>
                    {user?.name}'s Current Projects
                </Typography>
                <Grid
                    container
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                    paddingBottom="10px"
                    paddingTop="10px"
                    width="90%"
                    position="relative"
                    sx={{
                        borderTop: "1px solid #d9d9d9",
                        borderBottom: "1px solid #d9d9d9",
                        margin: "auto",
                        flexDirection: "column",
                    }}
                >
                    <Box display="flex" justifyContent="center">
                        <ProjectFilterBar
                            filterCriteria={filterCriteria}
                            setFilterCriteria={setFilterCriteria}
                            clearFilters={clearFilters}
                        />
                    </Box>
                    <Button
                        onClick={handleOpen}
                        variant="outlined"
                        startIcon={<AddIcon />}
                        sx={{
                            color: '#355147',
                            borderColor: '#355147',
                            marginTop: 2,
                            '&:hover': {
                                backgroundColor: '#355147',
                                color: '#fff',
                            },
                        }}
                    >
                        Add New Project
                    </Button>
                    <div style={{display:"flex",justifyContent:"space-between",width:"100%"}}>
                    <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedProjects.length === filteredProjects.length ? true : false}
                            onChange={toggleSelectAll}
                            color="primary"
                        />
                    }
                    label="Select All"
                />
                        
                        <Box display="flex" justifyContent="space-between" gap={2}>
            <Button
                variant="outlined"
                onClick={handleMenuOpen}
                endIcon={<ArrowDropDownIcon />}
                disabled={selectedProjects.length === 0}
                sx={{
                    color: '#355147',
                    borderColor: '#355147',
                    '&:hover': {
                        backgroundColor: '#355147',
                        color: '#fff',
                    },
                }}
            >
                Actions
            </Button>

            {/* Dropdown Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              
            >
                <MenuItem
                  
                    onClick={() => {
                        handleBulkArchive();
                        handleMenuClose();
                    }}
                    sx={{ color: '#355147' }}
                >
                    Archive Selected
                </MenuItem>
                <MenuItem
                    disabled={selectedProjects.length === 0}
                    onClick={() => {
                        handleBulkDelete();
                        handleMenuClose();
                    }}
                    sx={{ color: '#F3161E' }}
                >
                    Delete Selected
                </MenuItem>
            </Menu>
        </Box>
                    </div>
                </Grid>
            </Grid>
            <Grid container style={{ flexGrow: 1, overflow: 'hidden', width: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', paddingLeft: '1%', paddingRight: '1%'}}>
                    {isLoading ? (
                        <Grid container justifyContent="center" alignItems="center" style={{ minHeight: '150px' }}>
                            <CircularProgress />
                        </Grid>
                    ) : filteredProjects.length > 0 ? (
                        <List height={550} itemCount={totalRows} itemSize={rowHeight} width="100%">
                            {({ index, style }) => <Row index={index} style={style} />}
                        </List>
                    ) : (
                        <Grid container justifyContent="center" alignItems="center" style={{ width: '100%', marginTop: '2rem' }}>
                            <Paper
                                elevation={3}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2rem',
                                    backgroundColor: '#f5f5f5',
                                    width: '90%',
                                }}
                            >
                                <EmojiNatureIcon sx={{ fontSize: 50, color: '#4caf50', marginBottom: '1rem' }} />
                                <Typography variant="h6" color="textSecondary">No projects found!</Typography>
                                <Typography variant="body2" color="textSecondary" textAlign="center">
                                    It looks like you haven't added any projects yet. Click the + button to start your first project!
                                </Typography>
                            </Paper>
                        </Grid>
                    )}
                </div>
            </Grid>
            {isOpen && (
                <AddProjectForm
                    subjects={subjects}
                    isOpen={isOpen}
                    onClose={handleClose}
                    onAddProject={loadFromIndexedDB}
                    refreshProjects={loadFromIndexedDB}
                />
            )}
        </div>
    );
};

export default ProjectsDashboard;