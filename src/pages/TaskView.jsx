import React, { useState, useEffect } from 'react';
import { deleteTask, sortTasks, archiveTask, formatDate, formatTime } from '/src/LearnLeaf_Functions.jsx';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { useUser } from '/src/UserState.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getAllFromStore } from '/src/db.js';

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

            const filteredTasks = activeTasks.filter(task => task.taskStatus !== 'Completed' && task.taskStatus !== "Archived");
            console.log({filteredTasks});

            if (activeSubjects.length > 0 && activeProjects.length > 0 && filteredTasks.length > 0) {
                // Add subject and project info into tasks
                const tasksWithDetails = filteredTasks.map(task => {
                    const taskSubject = activeSubjects.find(subject => subject.subjectId === task.taskSubject);
                    const taskProject = activeProjects.find(project => project.projectId === task.taskProject);
                    const formattedDueDate = task.taskDueDate ? formatDate(task.taskDueDate) : '';
                    const formattedDueTime = task.taskDueTime ? formatTime(task.taskDueTime) : '';
                    const formattedStartDate = task.taskStartDate ? formatDate(task.taskStartDate) : '';


                    return {
                        ...task,
                        taskSubject,
                        taskProject,
                        taskDate: formattedDueDate,
                        taskTime: formattedDueTime,
                        taskStartDate: formattedStartDate
                    };
                });

                const sortedTasks = sortTasks(tasksWithDetails);
                console.log('Sorted Tasks:', sortedTasks);

                const sortedSubjects = activeSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
                console.log('Sorted Subjects:', sortedSubjects);

                const sortedProjects = activeProjects.sort((a, b) => a.projectName.localeCompare(b.projectName));
                console.log('Sorted Projects:', sortedProjects);

                setTasks(sortedTasks);
                setSubjects(sortedSubjects);
                setProjects(sortedProjects);
                setIsLoading(false);
                return true;
            }
            setIsLoading(false);
            return false;
        } catch (error) {
            console.error('Error loading data from IndexedDB:', error);
            return false;
        }
    };

    const updateState = async () => {
        setIsLoading(true);
        const isLoadedFromIndexedDB = await loadFromIndexedDB();
        if (!isLoadedFromIndexedDB) {
            setTasks([]);
            console.log("No tasks data found in IndexedDB.");
        }
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
        // const sortedTasks = sortTasks([...tasks, newTask]);
        // setTasks(sortedTasks);
        updateState();
    };

    const handleDeleteTask = async (taskId, bulkDelete = false) => {
        let confirmation = "";
        if (!bulkDelete) {

            confirmation = window.confirm("Are you sure you want to permanently delete this task?");
        }
        if (confirmation || bulkDelete) {
            try {
                await deleteTask(taskId);
                setTasks(prevTasks => prevTasks.filter(task => task.taskId !== taskId));
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const handleEditTask = async (updatedTask) => {

        console.log(updatedTask);
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
    };




    return (
        <div style={{ height: '100%', maxHeight: '-webkit-fill-available', overflowY: 'auto',
            WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column' }}>
            <TopBar />

            <Grid container direction="column" alignItems="center" justifyContent="center" width="100%">
                <Typography variant="h4" sx={{ color: '#907474', textAlign: 'center', mt: 2 }}>
                    {user?.name}'s Outstanding Tasks
                </Typography>

                <div style={{ flexGrow: 1, overflowY: 'auto',
        WebkitOverflowScrolling: 'touch', width: '100%' }}>
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
                            onAddTask={handleAddTask}
                            updateState={updateState}
                        />
                    )}
                </div>
            </Grid>
        </div>
    );
};

export default TaskList;