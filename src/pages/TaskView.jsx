import React, { useState, useEffect } from 'react';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { useUser } from '/src/UserState.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import '/src/Components/FormUI.css';
import '/src/Components/TaskView/TaskView.css';
import '/src/Components/PageFormat.css';
import { getAllFromStore, saveToStore } from '/src/db.js';

const TaskList = () => {
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useUser();

    const loadFromIndexedDB = async () => {
        try {
            const activeSubjects = (await getAllFromStore('subjects')) || [];
            const activeProjects = (await getAllFromStore('projects')) || [];
            const activeTasks = (await getAllFromStore('tasks')) || [];

            const filteredSubjects = activeSubjects.filter(subject => subject.subjectStatus === 'Active');
            const filteredProjects = activeProjects.filter(project => project.projectStatus === 'Active');
            const filteredTasks = activeTasks.filter(task => task.taskStatus !== 'Completed');

            if (filteredSubjects.length > 0 && filteredProjects.length > 0 && filteredTasks.length > 0) {
                const sortedTasks = sortTasks(filteredTasks);
                setTasks(sortedTasks);
                setSubjects(filteredSubjects);
                setProjects(filteredProjects);
                setIsLoading(false);
                console.log('Data loaded from IndexedDB');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading data from IndexedDB:', error);
            return false;
        }
    };

    const updateState = async () => {
        setIsLoading(true);
        await loadFromIndexedDB();
    };

    useEffect(() => {
        if (user?.id) {
            updateState();
        }
    }, [user?.id]);

    const toggleFormVisibility = () => {
        setIsAddTaskFormOpen(!isAddTaskFormOpen);
    };

    const sortTasks = (tasks) => {
        return tasks.sort((a, b) => {
            const dateA = a.taskDueDate ? new Date(a.taskDueDate) : new Date('9999-12-31');
            const dateB = b.taskDueDate ? new Date(b.taskDueDate) : new Date('9999-12-31');
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;

            const timeA = a.taskDueTime || '23:59';
            const timeB = b.taskDueTime || '23:59';
            if (timeA < timeB) return -1;
            if (timeA > timeB) return 1;

            return a.taskName.localeCompare(b.taskName);
        });
    };

    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
    };

    const handleAddTask = async (newTask) => {
        updateState();
        console.log("Task added, state and IndexedDB updated");
    };

    const handleDeleteTask = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);
                updateState();
                console.log("Task deleted, state and IndexedDB updated");
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const handleEditTask = async (updatedTask) => {
        updateState();
        console.log("Task updated, state and IndexedDB updated");
    };

    return (
        <div className="view-container">
            <TopBar />
            <button className="fab" onClick={toggleFormVisibility}>+</button>
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
                        onDelete={handleDeleteTask}
                        onUpdateTask={handleEditTask}
                    />
                )}
            </div>
        </div>
    );
};

export default TaskList;
