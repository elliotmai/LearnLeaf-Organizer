import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore } from '/src/db.js';
import { deleteTask, sortTasks } from '/src/LearnLeaf_Functions.jsx';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { CircularProgress, Grid, Typography } from '@mui/material';
import '/src/Components/FormUI.css';

const SubjectTasks = () => {
    const { subjectId } = useParams();
    const { user } = useUser();
    const [pageSubject, setPageSubject] = useState(null);
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
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
            const foundSubject = allSubjects.find(subject => subject.subjectId === subjectId);
            if (foundSubject) {
                setPageSubject(foundSubject);
            } else {
                console.error(`Subject with ID ${subjectId} not found`);
            }

            // Filter tasks specific to this subject
            const filteredTasks = activeTasks.filter(task => task.taskSubject === subjectId);

            if (filteredTasks.length > 0) {
                // Add subject and project info into tasks
                const tasksWithDetails = filteredTasks.map(task => {
                    const taskSubject = allSubjects.find(subject => subject.subjectId === task.taskSubject); // Use activeSubjects, including 'None'
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

    const handleAddTask = async () => {
        updateState();
    };

    const handleDeleteTask = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to permanently delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);
                setTasks(prevTasks => prevTasks.filter(task => task.taskId !== taskId));
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
                .filter(task => task.taskStatus !== 'Completed' && task.taskSubject.subjectId === subjectId); // Exclude completed tasks from the state

            // Sort the updated list of tasks before returning
            return sortTasks(updatedTasks);
        });

    };

    return (
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TopBar />

            <Grid container direction="column" alignItems="center" justifyContent="center" width="100%">
                <Typography variant="h4" sx={{ color: '#907474', textAlign: 'center', mt: 2 }}>
                    {pageSubject ? `Outstanding Tasks for ${pageSubject.subjectName}` : 'Loading...'}
                </Typography>
                <div style={{ flexGrow: 1, overflow: 'hidden', width: '100%' }}>
                    {pageSubject ? (
                        <TasksTable
                            tasks={tasks}
                            subjects={subjects}
                            projects={projects}
                            onAddTask={handleAddTask}
                            onDelete={handleDeleteTask}
                            onUpdateTask={handleEditTask}
                            initialSubject={pageSubject.subjectId}
                        />
                    ) : (
                        <Grid container alignItems="center" justifyContent="center" direction="column" style={{ minHeight: '150px' }}>
                            <CircularProgress />
                            <p>Loading tasks...</p>
                        </Grid>
                    )}
                </div>
            </Grid >
        </div >
    );
};

export default SubjectTasks;