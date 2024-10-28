import React, { useState, useEffect } from 'react';
import { deleteTask, sortTasks, addSubject, sortSubjects, addProject, sortProjects } from '/src/LearnLeaf_Functions.jsx';
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

            const filteredTasks = activeTasks.filter(task => task.taskStatus !== 'Completed');

            if (activeSubjects.length > 0 && activeProjects.length > 0 && filteredTasks.length > 0) {
                // Add subject and project info into tasks
                const tasksWithDetails = filteredTasks.map(task => {
                    const taskSubject = activeSubjects.find(subject => subject.subjectId === task.taskSubject); // Use activeSubjects, including 'None'
                    const taskProject = activeProjects.find(project => project.projectId === task.taskProject);

                    return {
                        ...task,
                        taskSubject, // Attach full subject details, including 'None'
                        taskProject  // Attach full project details
                    };
                });

                const sortedTasks = sortTasks(tasksWithDetails);
                const sortedSubjects = activeSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
                const sortedProjects = activeProjects.sort((a, b) => a.projectName.localeCompare(b.projectName));

                setTasks(sortedTasks);
                setSubjects(sortedSubjects); // Excludes 'None' subject
                setProjects(sortedProjects);
                setIsLoading(false);
                console.log('Data loaded from IndexedDB with filtered subjects');
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

    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
    };

    const handleAddTask = async (newTask) => {
        const sortedTasks = sortTasks([...tasks, newTask]);
        setTasks(sortedTasks);
        console.log("Task added, state and IndexedDB updated");
    };

    const handleDeleteTask = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);
                setTasks(prevTasks => prevTasks.filter(task => task.taskId !== taskId));
                console.log("Task deleted, state and IndexedDB updated");
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const handleEditTask = async (updatedTask) => {

        const activeSubjects = (await getAllFromStore('subjects')) || [];
        setSubjects(activeSubjects);

        const activeProjects = (await getAllFromStore('projects')) || [];
        setProjects(activeProjects);

        setTasks(prevTasks => {
            // Update or remove the specific task based on its status
            const updatedTasks = prevTasks
                .map(task => {
                    if (task.taskId === updatedTask.taskId) {
                        // Attach taskSubject and taskProject details
                        const taskSubject = activeSubjects.find(subject => subject.subjectId === updatedTask.taskSubject);
                        const taskProject = activeProjects.find(project => project.projectId === updatedTask.taskProject);

                        return {
                            ...updatedTask,
                            taskSubject, // Attach full subject details
                            taskProject  // Attach full project details
                        };
                    }
                    return task;
                })
                .filter(task => task.taskStatus !== 'Completed'); // Exclude completed tasks from the state

            // Sort the updated list of tasks before returning
            return sortTasks(updatedTasks);
        });

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
