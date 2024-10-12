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
import '/src/Components/PageFormat.css';

const TaskList = () => {
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, updateUser } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.id) {
            setIsLoading(true);
            fetchTasks(user.id, null, null)
                .then(fetchedTasks => {
                    setTasks(fetchedTasks);
                    setIsLoading(false);
                })
                .catch(error => {
                    console.error("Error fetching tasks:", error);
                    setIsLoading(false);
                });
        }
    }, [user?.id]);

    const toggleFormVisibility = () => {
        setIsAddTaskFormOpen(!isAddTaskFormOpen);
    };

    const refreshTasks = async () => {
        setIsLoading(true);
        const updatedTasks = await fetchTasks(user.id, null, null);
        setTasks(updatedTasks);
        setIsLoading(false);
    };

    const sortTasks = (tasks) => {
        return tasks.sort((a, b) => {
            // Convert date strings to Date objects for comparison
            const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
            const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
    
            // Compare by dueDate first
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
    
            // If due dates are the same, compare due times
            // Ensure dueTime is not null; default to "23:59" if null to put them at the end of the day
            const timeA = a.dueTime ? a.dueTime : '23:59';
            const timeB = b.dueTime ? b.dueTime : '23:59';
    
            if (timeA < timeB) return -1;
            if (timeA > timeB) return 1;
    
            // Finally, compare assignments
            return a.assignment.localeCompare(b.assignment);
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
        setTasks((prevTasks) => {
            let updatedTasks;
            if (updatedTask.status !== 'Completed') {
                updatedTasks = prevTasks.map((task) =>
                    task.taskId === updatedTask.taskId ? updatedTask : task
                );
            } else {
                updatedTasks = prevTasks.filter((task) => task.taskId !== updatedTask.taskId);
            }
            return sortTasks(updatedTasks);
        });
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
                    onAddTask={handleAddTask}
                    refreshTasks={refreshTasks}
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