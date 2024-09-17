import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import { fetchTasks, logoutUser, deleteTask } from '/src/LearnLeaf_Functions.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import '/src/Components/FormUI.css';
import '/src/Components/TaskView/TaskView.css';

const TaskList = () => {
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Loading state for spinner
    const { user, updateUser } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.id) {
            setIsLoading(true); // Start loading
            fetchTasks(user.id, null, null)
                .then(fetchedTasks => {
                    setTasks(fetchedTasks);
                    setIsLoading(false); // Stop loading once tasks are fetched
                })
                .catch(error => {
                    console.error("Error fetching tasks:", error);
                    setIsLoading(false); // Stop loading on error
                });
        }
    }, [user?.id]); // Re-fetch tasks when the user id changes

    const toggleFormVisibility = () => {
        setIsAddTaskFormOpen(!isAddTaskFormOpen);
    };

    const refreshTasks = async () => {
        setIsLoading(true); // Start loading when refreshing
        const updatedTasks = await fetchTasks(user.id, null, null);
        setTasks(updatedTasks);
        setIsLoading(false); // Stop loading once tasks are refreshed
    };

    const handleAddTask = (newTask) => {
        setTasks(prevTasks => [...prevTasks, newTask]);
        refreshTasks(); // Optionally refresh after adding the task to get the latest state
    };

    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
        refreshTasks(); // Optionally refresh tasks after closing the form
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteTask(taskId);
            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
            refreshTasks(); // Refresh the task list after deletion
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            updateUser(null);
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
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
                    onAddTask={handleAddTask}  // Pass handleAddTask to AddTaskForm
                    refreshTasks={refreshTasks}  // Optional, refresh to ensure data consistency
                />
            )}

            <div className="task-list">
                <h1 style={{ color: '#907474' }}>{user?.name}'s Upcoming Tasks</h1>
                
                {/* Conditional Rendering for Spinner and TasksTable */}
                {isLoading ? (
                    <Grid container alignItems="center" justifyContent="center" direction="column" style={{ minHeight: '150px' }}>
                        <CircularProgress />
                        <p>Loading tasks...</p>
                    </Grid>
                ) : (
                    <TasksTable
                        tasks={tasks}
                        refreshTasks={refreshTasks}
                        onDelete={handleDeleteTask}  // Pass handleDeleteTask to TasksTable
                    />
                )}
            </div>
        </div>
    );
};

export default TaskList;
