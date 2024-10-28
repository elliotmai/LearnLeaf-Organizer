import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore } from '/src/db.js';
import { deleteTask, sortTasks} from '/src/LearnLeaf_Functions.jsx';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
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
    
    
    const subjectIdFull = user?.id ? `${subjectId}_${user.id}` : null;

    // Fetch data from IndexedDB
    const loadFromIndexedDB = async () => {
        try {
            // Load and filter active subjects, projects, and tasks
            const allSubjects = await getAllFromStore('subjects');
            const allProjects = await getAllFromStore('projects');
            const allTasks = await getAllFromStore('tasks');

            const activeTasks = allTasks.filter(task => task.taskStatus !== 'Completed');

            // Find the specified subject by ID
            const foundSubject = allSubjects.find(subject => subject.subjectId === subjectIdFull);
            if (foundSubject) {
                setPageSubject(foundSubject);
            } else {
                console.error(`Subject with ID ${subjectIdFull} not found`);
            }

            // Filter tasks specific to this subject
            const filteredTasks = activeTasks.filter(task => task.taskSubject === subjectIdFull);

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
                .filter(task => task.taskStatus !== 'Completed' && task.taskSubject === subjectIdFull); // Exclude completed tasks from the state

            // Sort the updated list of tasks before returning
            return sortTasks(updatedTasks);
        });

        console.log("Task updated, state and IndexedDB updated");
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
                    initialSubject={pageSubject?.subjectId}
                />
            )}

            <div>
                <h1 style={{ color: '#907474' }}>
                    Upcoming Tasks for {pageSubject?.subjectName || "Loading..."}
                </h1>

                {pageSubject ? (
                    <TasksTable
                        tasks={tasks}
                        subjects={subjects}
                        projects={projects}
                        refreshTasks={updateState}
                        onDelete={handleDeleteTask}
                        onUpdateTask={handleEditTask}
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

export default SubjectTasks;