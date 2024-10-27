import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useEffect, useState } from 'react';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import { getAllFromStore } from '/src/db.js'; // Import IndexedDB functions
import { AddProjectForm } from '/src/Components/ProjectView/AddProjectForm.jsx';
import ProjectWidget from '/src/Components/ProjectView/ProjectWidget.jsx';
import ProjectFilterBar from './ProjectFilterBar.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { Grid, useTheme, useMediaQuery, CircularProgress } from '@mui/material';
import '/src/Components/PageFormat.css';
import '/src/Components/FilterBar.css';

const ProjectsDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [subjects, setsubjects] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
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

    const getItemsPerRow = () => {
        return isSmallScreen ? 1 : isMediumScreen ? 2 : 3;
    };

    const loadFromIndexedDB = async () => {
        console.log('Loading from IndexedDB');
        try {
            const activeProjects = (await getAllFromStore('projects')).filter(project => project.projectStatus === 'Active');
            const activeSubjects = (await getAllFromStore('subjects')).filter(subject => subject.subjectStatus === 'Active');
            const storedTasks = await getAllFromStore('tasks');

            const projectsWithDetails = activeProjects.map((project) => {
                const projectTasks = storedTasks.filter(task => task.taskProject?.projectId === project.projectId);
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

                return {
                    ...project,
                    statusCounts,
                    nextTaskName: nextTask?.taskName,
                    nextTaskDueDate: nextTask?.taskDueDate,
                    nextTaskDueTime: nextTask?.taskDueTime
                };
            });

            setsubjects(activeSubjects);
            setProjects(projectsWithDetails);
            setIsLoading(false);
            console.log('Data loaded from IndexedDB');
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
            console.error('Failed to load data from IndexedDB');
        }
        console.log('projects:', projects)
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

    const getFilteredProjects = (projects, filterCriteria) => {
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

    const clearFilters = () => setFilterCriteria({ searchProject: '', searchSubject: '', searchDescription: '', dueDate: '', dueDateComparison: '' });

    const handleProject = () => updateState();

    const itemsPerRow = getItemsPerRow();
    const filteredProjects = getFilteredProjects(projects, filterCriteria);

    return (
        <div className="view-container">
            <TopBar />
            <h1 style={{ color: '#907474' }}>{user?.name}'s Current Projects</h1>
            <ProjectFilterBar
                filterCriteria={filterCriteria}
                setFilterCriteria={setFilterCriteria}
                clearFilters={clearFilters}
            />
            <Grid container spacing={3} className="projects-grid">
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        <CircularProgress />
                    </div>
                ) : (
                    filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                            <Grid item xs={12} sm={6} md={4} key={project.projectId}>
                                <ProjectWidget 
                                    project={project}
                                    subjects={subjects} 
                                />
                            </Grid>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', width: '100%' }}>
                            <p>No projects found.</p>
                        </div>
                    )
                )}
            </Grid>
            <button className="fab" onClick={handleOpen}>
                +
            </button>
            {isOpen && (
                <AddProjectForm
                    isOpen={isOpen}
                    onClose={handleClose}
                    onAddProject={handleProject}
                />
            )}
        </div>
    );
};

export default ProjectsDashboard;
