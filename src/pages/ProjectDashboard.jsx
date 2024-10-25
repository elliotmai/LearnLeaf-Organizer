import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useEffect, useState } from 'react';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import { fetchProjects, logoutUser } from '/src/LearnLeaf_Functions.jsx';
import { AddProjectForm } from '/src/Components/ProjectView/AddProjectForm.jsx';
import ProjectWidget from '/src/Components/ProjectView/ProjectWidget.jsx';
import ProjectFilterBar from './ProjectFilterBar.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { Grid, useTheme, useMediaQuery } from '@mui/material'; // Import Material-UI components for layout
import CircularProgress from '@mui/material/CircularProgress'; // Loading spinner
import '/src/Components/PageFormat.css';
import '/src/Components/FilterBar.css';

const ProjectsDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(true); // Use isLoading state to manage loading
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
        if (isSmallScreen) return 1;
        if (isMediumScreen) return 2;
        return 3;
    };

    const loadFromLocalStorage = async () => {
        console.log('loading from storage');
        // Parse and filter projects from localStorage
        const activeProjects = (JSON.parse(localStorage.getItem('projects')) || [])
            .filter(project => project.projectStatus === 'Active');

        console.log(activeProjects);

        // If no active projects in localStorage, return false
        if (activeProjects.length === 0) {
            return false; // No data in localStorage
        }

        // Step 5: Read tasks from local storage
        const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];

        // Step 6: Process each project document from local storage
        const projectsWithDetails = await Promise.all(activeProjects.map(async (projectData) => {

            // Step 8: Count task statuses from local storage for this project
            const projectTasks = storedTasks.filter(task => task.taskProject.projectId === projectData.projectId);

            const statusCounts = projectTasks.reduce((acc, task) => {
                const taskStatus = task.taskStatus.replace(/\s+/g, ''); // Remove spaces from taskStatus
                if (['NotStarted', 'InProgress', 'Completed'].includes(taskStatus)) {
                    acc[taskStatus] = (acc[taskStatus] || 0) + 1;
                }
                return acc;
            }, {
                NotStarted: 0,
                InProgress: 0,
                Completed: 0
            });

            // Step 9: Find the next task (the one with the closest due date)
            const nextTask = projectTasks
                .filter(task => task.taskStatus !== 'Completed' && task.taskDueDate) // Only consider non-completed tasks with a due date
                .sort((a, b) => {
                    // First compare by taskDueDate
                    const dateComparison = a.taskDueDate.localeCompare(b.taskDueDate);

                    if (dateComparison !== 0) {
                        return dateComparison;
                    }

                    // If taskDueDate is the same, compare by taskDueTime
                    const timeA = convertTo24Hour(a.taskDueTime || '23:59'); // Default to end of the day if time is not specified
                    const timeB = convertTo24Hour(b.taskDueTime || '23:59'); // Default to end of the day if time is not specified
                    return timeA.localeCompare(timeB);
                })[0]; // Pick the first (earliest) task

            // Utility function to convert 'HH:MM am/pm' or 'HH:MM' to 24-hour format for consistent comparison
            function convertTo24Hour(time) {
                if (!time.includes('am') && !time.includes('pm')) {
                    // If no am/pm, assume it's already in 24-hour format
                    return time;
                }

                const [timePart, period] = time.toLowerCase().split(' ');
                let [hours, minutes] = timePart.split(':').map(Number);

                if (period === 'pm' && hours !== 12) {
                    hours += 12;
                } else if (period === 'am' && hours === 12) {
                    hours = 0; // Midnight case
                }

                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }

            // Return the project with all the details
            return {
                ...projectData,
                statusCounts,
                nextTaskName: nextTask?.taskName,
                nextTaskDueDate: nextTask?.taskDueDate,
                nextTaskDueTime: nextTask?.taskDueTime
            };
        }));

        // Set the projects with details to the state and mark loading as done
        setProjects(projectsWithDetails);
        setIsLoading(false); // Stop loading after data is set
        console.log('Data loaded from localStorage');
        return true; // Indicate that data was loaded from localStorage
    };

    const fetchData = async () => {
        try {
            console.log('loading from fb');
            // Fetch subjects from Firestore
            const fetchedProjects = await fetchProjects(null, null);
            setProjects(fetchedProjects.filter(project => project.projectStatus === 'Active'));

            // Store fetched data in localStorage for future use
            localStorage.setItem('projects', JSON.stringify(fetchedProjects));

            setIsLoading(false); // Stop loading after data is set
            console.log('Data fetched and saved to localStorage');
        } catch (error) {
            console.error('Error fetching data:', error);
            setIsLoading(false); // Handle error and stop loading
        }
    };

    const updateState = async () => {
        setIsLoading(true); // Start loading

        // Try to load data from localStorage first, if not available, fetch from Firestore
        const isLoadedFromLocalStorage = await loadFromLocalStorage();
        if (!isLoadedFromLocalStorage) {
            await fetchData(); // Fetch from Firestore if localStorage data is not available
        }
    };

    useEffect(() => {
        if (user?.id) {
            console.log('1');
            updateState();
            console.log('2');
        }
    }, [user?.id]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const filterByDate = (projectDateStr, filterDateStr, comparisonType) => {
        let projectDate = new Date(projectDateStr);
        projectDate = new Date(projectDate.getTime() - projectDate.getTimezoneOffset() * 60000).setHours(0, 0, 0, 0);

        let filterDate = new Date(filterDateStr);
        filterDate = new Date(filterDate.getTime() - filterDate.getTimezoneOffset() * 60000).setHours(0, 0, 0, 0);

        switch (comparisonType) {
            case 'before':
                return projectDate < filterDate;
            case 'before-equal':
                return projectDate <= filterDate;
            case 'equal':
                return projectDate === filterDate;
            case 'after':
                return projectDate > filterDate;
            case 'after-equal':
                return projectDate >= filterDate;
            default:
                return true;
        }
    };

    const getFilteredProjects = (projects, filterCriteria) => {
        return projects.filter((project) => {
            const matchesSearchProject = filterCriteria.searchProject === '' ||
                project.projectName.toLowerCase().includes(filterCriteria.searchProject.toLowerCase());
            const matchesSearchSubject = filterCriteria.searchSubject === '' ||
                project.projectSubjects.some(subject => subject.subjectName.toLowerCase().includes(filterCriteria.searchSubject.toLowerCase()));

            const matchesSearchDescription = filterCriteria.searchDescription === '' ||
                project.projectDescription.toLowerCase().includes(filterCriteria.searchSubject.toLowerCase());

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
        setFilterCriteria({
            searchProject: '',
            searchSubject: '',
            dueDate: '',
            dueDateComparison: ''
        });
    };

    const handleProject = () => {
        updateState();
        console.log("Subject updated, state and localStorage updated");
    };

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
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'auto', width: '100%' }}>
                        <CircularProgress />
                    </div>
                ) : (
                    filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                            <Grid item xs={12} sm={6} md={4} key={project.projectId}>
                                <ProjectWidget project={project} />
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
                />
            )}
        </div>
    );
};

export default ProjectsDashboard;
