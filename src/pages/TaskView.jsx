import React, { useState, useEffect } from 'react';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.id) {
            setIsLoading(true);
    
            const loadFromLocalStorage = () => {
                // Check if tasks, subjects, and projects exist in localStorage
                const storedSubjects = localStorage.getItem('subjects');
                const storedProjects = localStorage.getItem('projects');
                const storedTasks = localStorage.getItem('tasks');
    
                if (storedSubjects && storedProjects && storedTasks) {
                    // Parse and set the data from localStorage
                    setSubjects(JSON.parse(storedSubjects));
                    setProjects(JSON.parse(storedProjects));
                    setTasks(JSON.parse(storedTasks));
                    setIsLoading(false);
                    console.log('Data loaded from localStorage');
                    return true; // Indicate that data was loaded from localStorage
                }
    
                return false; // Indicate that localStorage didn't have the data
            };
    
            const fetchData = async () => {
                try {
                    // Fetch subjects first
                    const fetchedSubjects = await fetchSubjects(null);
                    setSubjects(fetchedSubjects);
    
                    // After subjects are fetched, fetch projects
                    const fetchedProjects = await fetchProjects(null);
                    setProjects(fetchedProjects);
    
                    // After projects are fetched, fetch tasks
                    const fetchedTasks = await fetchTasks(null, null);
                    setTasks(fetchedTasks);
    
                    // Store fetched data in localStorage for future use
                    localStorage.setItem('subjects', JSON.stringify(fetchedSubjects));
                    localStorage.setItem('projects', JSON.stringify(fetchedProjects));
                    localStorage.setItem('tasks', JSON.stringify(fetchedTasks));
    
                    setIsLoading(false);
                    console.log('Data fetched and saved to localStorage');
    
                } catch (error) {
                    console.error('Error fetching data:', error);
                    setIsLoading(false); // Set loading state to false in case of error
                }
            };
    
            // Try to load data from localStorage first, if not available, fetch from Firestore
            const isLoadedFromLocalStorage = loadFromLocalStorage();
            if (!isLoadedFromLocalStorage) {
                fetchData();
            }
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

    const handleAddTask = (newTask) => {
        if (!newTask) {
            console.error("New task is undefined!");
            return;
        }

        setTasks((prevTasks) => {
            const updatedTasks = [...prevTasks, newTask];
            return sortTasks(updatedTasks);
        });
    };


    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
    };

    const handleDeleteTask = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);
                setTasks((prevTasks) => {
                    const updatedTasks = prevTasks.filter((task) => task.taskId !== taskId);
                    return updatedTasks;
                });
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const updateTaskInState = (updatedTask) => {
        console.log(updatedTask);
        setTasks((prevTasks) => {
            let updatedTasks;
            if (updatedTask.taskStatus !== 'Completed') {
                updatedTasks = prevTasks.map((task) =>
                    task.taskId === updatedTask.taskId ? updatedTask : task
                );
            } else {
                updatedTasks = prevTasks.filter((task) => task.taskId !== updatedTask.taskId);
            }
            return sortTasks(updatedTasks);
        });
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
                    refreshTasks={refreshTasks}
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
                        onUpdateTask={updateTaskInState} // Pass update function to TasksTable
                    />
                )}
            </div>
        </div>
    );
};

export default TaskList;