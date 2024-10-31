import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore, saveToStore, deleteFromStore } from '/src/db.js';
import { deleteTask, sortTasks } from '/src/LearnLeaf_Functions.jsx';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import {CircularProgress, Grid, Typography} from '@mui/material';

const ProjectTasks = () => {
    const [pageProject, setPageProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const { user } = useUser();
    const { projectId } = useParams();
    const [isLoading, setIsLoading] = useState(true);

    // Fetch data from IndexedDB
    const loadFromIndexedDB = async () => {
        try {
            // Load and filter active subjects, projects, and tasks
            const allSubjects = await getAllFromStore('subjects');
            const allProjects = await getAllFromStore('projects');
            const allTasks = await getAllFromStore('tasks');

            const activeTasks = allTasks.filter(task => task.taskStatus !== 'Completed');

            // Find the specified subject by ID
            const foundProject = allProjects.find(project => project.projectId === projectId);
            if (foundProject) {
                setPageProject(foundProject);
            } else {
                console.error(`Project with ID ${projectId} not found`);
            }

            // Filter tasks specific to this subject
            const filteredTasks = activeTasks.filter(task => task.taskProject === projectId);

            if (filteredTasks.length > 0) {
                // Add subject and project info into tasks
                const tasksWithDetails = filteredTasks.map(task => {
                    const taskSubject = allSubjects.find(subject => subject.subjectId === task.taskSubject);
                    const taskProject = allProjects.find(project => project.projectId === task.taskProject);

                    return {
                        ...task,
                        taskSubject, // Attach full subject details, including 'None'
                        taskProject  // Attach full project details
                    };
                });

                const sortedTasks = sortTasks(tasksWithDetails);
                setTasks(sortedTasks);
            }
            setSubjects(allSubjects);
            setProjects(allProjects);

            setIsLoading(false);
            console.log('Data loaded from IndexedDB');
            return true;
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
        const confirmation = window.confirm("Are you sure you want to permanently delete this task?");
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

        const allSubjects = (await getAllFromStore('subjects')) || [];
        setSubjects(allSubjects);

        const allProjects = (await getAllFromStore('projects')) || [];
        setProjects(allProjects);

        setTasks(prevTasks => {
            // Update or remove the specific task based on its status
            const updatedTasks = prevTasks
                .map(task => {
                    if (task.taskId === updatedTask.taskId) {
                        // Attach taskSubject and taskProject details
                        const taskSubject = allSubjects.find(subject => subject.subjectId === updatedTask.taskSubject);
                        const taskProject = allProjects.find(project => project.projectId === updatedTask.taskProject);

                        return {
                            ...updatedTask,
                            taskSubject, // Attach full subject details
                            taskProject  // Attach full project details
                        };
                    }
                    return task;
                })
                .filter(task => task.taskStatus !== 'Completed' && task.taskProject.projectId === projectId); // Exclude completed tasks from the state

            // Sort the updated list of tasks before returning
            return sortTasks(updatedTasks);
        });

        console.log("Task updated, state and IndexedDB updated");
    };

    return (
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TopBar />

            <div>
            <Typography variant="h4" sx={{ color: '#907474', textAlign: 'center', mt: 2 }}>
                    {pageProject ? `Outstanding Tasks for ${pageProject.projectName}` : 'Loading project...'}
                </Typography>

                {pageProject ? (
                    <TasksTable
                        tasks={tasks}
                        subjects={subjects}
                        projects={projects}
                        refreshTasks={updateState}
                        onDelete={handleDeleteTask}
                        onUpdateTask={handleEditTask}
                        initialProject={pageProject.projectId}
                    />
                ) : (
                    <Grid container alignItems="center" justifyContent="center" direction="column" style={{ minHeight: '150px' }}>
                        <CircularProgress />
                        <p>Loading tasks...</p>
                    </Grid>
                )}
            </div>
        </div>
    );
};

export default ProjectTasks;