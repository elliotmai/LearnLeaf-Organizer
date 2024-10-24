import React, { useState, useEffect } from 'react';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { useUser } from '/src/UserState.jsx';
import { fetchTasks, fetchSubjects, fetchProjects, deleteTask } from '/src/LearnLeaf_Functions.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import '/src/Components/FormUI.css';
import '/src/Components/TaskView/TaskView.css';
import '/src/Components/PageFormat.css';

const TaskList = () => {
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, updateUser } = useUser();

    const loadFromLocalStorage = () => {
        // Parse and filter subjects, projects, and tasks from localStorage
        const activeSubjects = (JSON.parse(localStorage.getItem('subjects')) || [])
            .filter(subject => subject.subjectStatus === 'Active');

        const activeProjects = (JSON.parse(localStorage.getItem('projects')) || [])
            .filter(project => project.projectStatus === 'Active');

        const activeTasks = (JSON.parse(localStorage.getItem('tasks')) || [])
            .filter(task => task.taskStatus !== 'Completed');

        // Check if localStorage contains the required data
        if (activeSubjects.length > 0 && activeProjects.length > 0 && activeTasks.length > 0) {
            const sortedTasks = sortTasks(activeTasks);  // Sort the updated tasks

            setTasks(sortedTasks);
            // Set the filtered data from localStorage
            setSubjects(activeSubjects);
            setProjects(activeProjects);
            setTasks(sortedTasks);
            setIsLoading(false);
            console.log('Data loaded from localStorage');
            return true; // Indicate that data was loaded from localStorage
        }

        return false; // Indicate that localStorage didn't have the data
    };

    const fetchData = async () => {
        try {
            // Fetch subjects from Firestore
            const fetchedSubjects = await fetchSubjects(null, 'Active');
            setSubjects(fetchedSubjects);

            // Fetch projects from Firestore
            const fetchedProjects = await fetchProjects(null, 'Active');
            setProjects(fetchedProjects);

            // Fetch tasks from Firestore
            const fetchedTasks = await fetchTasks(null, null);
            const sortedTasks = sortTasks(fetchedTasks);  // Sort the updated tasks

            setTasks(sortedTasks);

            // Store fetched data in localStorage for future use
            localStorage.setItem('subjects', JSON.stringify(fetchedSubjects));
            localStorage.setItem('projects', JSON.stringify(fetchedProjects));
            localStorage.setItem('tasks', JSON.stringify(fetchedTasks));

            setIsLoading(false);
            console.log('Data fetched and saved to localStorage');
        } catch (error) {
            console.error('Error fetching data:', error);
            setIsLoading(false); // Handle error and stop loading
        }
    };

    const updateState = async() => {
        setIsLoading(true);

            // Try to load data from localStorage first, if not available, fetch from Firestore
            const isLoadedFromLocalStorage = loadFromLocalStorage();
            if (!isLoadedFromLocalStorage) {
                fetchData(); // Fetch from Firestore if localStorage data is not available
            }
    }

    useEffect(() => {
        if (user?.id) {
            updateState();
        }
    }, [user?.id]);

    const toggleFormVisibility = () => {
        setIsAddTaskFormOpen(!isAddTaskFormOpen);
    };

    const refreshTasks = async () => {
        setIsLoading(true);
        const updatedTasks = await fetchTasks(null, null);
        setTasks(updatedTasks);
        setIsLoading(false);
    };

    const sortTasks = (tasks) => {
        return tasks.sort((a, b) => {
            // Convert date strings to Date objects for comparison
            const dateA = a.taskDueDate ? new Date(a.taskDueDate) : new Date('9999-12-31');
            const dateB = b.taskDueDate ? new Date(b.taskDueDate) : new Date('9999-12-31');

            // Compare by dueDate first
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;

            // If due dates are the same, compare due times
            // Ensure dueTime is not null; default to "23:59" if null to put them at the end of the day
            const timeA = a.taskDueTime ? a.taskDueTime : '23:59';
            const timeB = b.taskDueTime ? b.taskDueTime : '23:59';

            if (timeA < timeB) return -1;
            if (timeA > timeB) return 1;

            // Finally, compare assignments
            return a.taskName.localeCompare(b.taskName);
        });
    };

    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
    };

    // Function to add a task and update localStorage
    // Helper function to save tasks to localStorage
    const saveTasksToLocalStorage = (tasks) => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

    // Function to add a task and update both localStorage and state
    const handleAddTask = (newTask) => {
        updateState();

        console.log("Task added, state and localStorage updated");
    };

    // Function to delete a task and update both localStorage and state
    const handleDeleteTask = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);

                updateState();

                console.log("Task deleted, state and localStorage updated");
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    // Function to update a task and update both localStorage and state
    const handleEditTask = (updatedTask) => {

        updateState();

        console.log("Task updated, state and localStorage updated");
    };

    return (
        <div className="view-container">
            <TopBar />
            <button className="fab" onClick={toggleFormVisibility}>
                +
            </button>

            {isAddTaskFormOpen && (
                <AddTaskForm
                    isOpen={isAddTaskFormOpen}
                    onClose={handleCloseAddTaskForm}
                    onAddTask={handleAddTask}
                    subjects={subjects}
                    projects={projects}
                />
            )}

            <h1 style={{ color: '#907474' }}>{user?.name}'s Upcoming Tasks</h1>

            <div className="task-list">
                {isLoading ? (
                    <Grid container alignItems="center" justifyContent="center" direction="column" style={{ minHeight: '150px' }}>
                        <CircularProgress />
                        <p>Loading tasks...</p>
                    </Grid>
                ) : (
                    <TasksTable
                        tasks={tasks}
                        subjects={subjects}
                        projects={projects}
                        refreshTasks={refreshTasks}
                        onDelete={handleDeleteTask}
                        onUpdateTask={handleEditTask}
                    />
                )}
            </div>
        </div>
    );
};

export default TaskList;