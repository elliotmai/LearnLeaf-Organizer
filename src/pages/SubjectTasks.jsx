import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore, deleteFromStore } from '/src/db.js'; // Import IndexedDB functions
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
    const [tasks, setTasks] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);

    // Fetch data from IndexedDB
    const loadFromIndexedDB = async () => {
        try {
            // Load and filter active subjects, projects, and tasks
            const allSubjects = await getAllFromStore('subjects');
            const allProjects = await getAllFromStore('projects');
            const allTasks = await getAllFromStore('tasks');

            const activeSubjects = allSubjects.filter(subject => subject.subjectStatus === 'Active');
            const activeProjects = allProjects.filter(project => project.projectStatus === 'Active');
            const activeTasks = allTasks.filter(task => task.taskStatus !== 'Completed');

            // Find the specified subject by ID
            const foundSubject = activeSubjects.find(subject => subject.subjectId === subjectId);
            if (foundSubject) {
                setPageSubject(foundSubject);
            } else {
                console.error(`Subject with ID ${subjectId} not found`);
            }

            // Filter tasks specific to this subject
            const filteredTasks = sortTasks(activeTasks.filter(task => task.taskSubject?.subjectId === subjectId));
            setSubjects(activeSubjects);
            setProjects(activeProjects);
            setTasks(filteredTasks);
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
        const isLoadedFromIndexedDB = await loadFromIndexedDB();
        if (!isLoadedFromIndexedDB) {
            console.error('Error loading data from IndexedDB');
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

    const handleAddTask = (newTask) => {
        updateState();
        console.log("Task added, state and IndexedDB updated");
    };

    const handleDeleteTask = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteFromStore('tasks', taskId);
                updateState();
                console.log("Task deleted, state and IndexedDB updated");
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
    };

    const handleEditTask = (updatedTask) => {
        updateState();
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