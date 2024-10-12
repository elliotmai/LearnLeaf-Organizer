import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '/src/UserState.jsx';
import { fetchSubjects, fetchTasks, deleteTask } from '/src/LearnLeaf_Functions.jsx';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import '/src/Components/FormUI.css';

const SubjectTasks = () => {
    const { subjectId } = useParams(); // Get subjectId from URL
    const { user } = useUser();
    const [tasks, setTasks] = useState([]);
    const [subject, setSubject] = useState(null); // Initialize subject as null
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);

    // First useEffect to fetch the subject data
    useEffect(() => {
        if (user?.id && subjectId) {
            // console.log("Fetching subject...");
            setTasks([]); // Clear tasks while loading new subject
            fetchSubjects(user.id, subjectId)
                .then(fetchedSubjects => {
                    // console.log("Fetched Subjects:", fetchedSubjects);
                    if (fetchedSubjects.length > 0) {
                        setSubject(fetchedSubjects[0]); // Set the first fetched subject
                        // console.log("Subject set: ", fetchedSubjects[0]);
                    } else {
                        setSubject(null);
                        console.log("No subjects found");
                    }
                })
                .catch(error => {
                    console.error("Error fetching subject:", error);
                    setSubject(null);
                });
        } else {
            setSubject(null);
            console.log("User or subjectId is missing");
        }
    }, [user?.id, subjectId]); // This runs when the user or subjectId changes

    // Second useEffect to fetch the tasks after the subject is set
    useEffect(() => {
        // Fetch tasks only if the subject has been set
        if (user?.id && subject?.subjectName) {
            // console.log("Fetching tasks for subject:", subject.subjectName); // Debugging output for subject name
            fetchTasks(user.id, subject.subjectName, null)
                .then(fetchedTasks => {
                    setTasks(fetchedTasks);
                    // console.log("Fetched tasks:", fetchedTasks);
                })
                .catch(error => console.error("Error fetching tasks:", error));
        }
    }, [user?.id, subject]); // Re-fetch tasks when the user or subject changes

    const toggleFormVisibility = () => {
        setIsAddTaskFormOpen(!isAddTaskFormOpen);
    };

    const refreshTasks = async () => {
        // Fetch tasks from the database and update state
        if (subject?.subjectName) {
            const updatedTasks = await fetchTasks(user.id, subject.subjectName, null);
            setTasks(updatedTasks);
        }
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

    // Handler to close the AddTaskForm
    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
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
                    initialSubject = {subject?.subjectName}
                    initialProject = {null}
                    initialDueDate = {null}
                />
            )}

            <div>
                <h1 style={{ color: '#907474' }}>
                    {/* Conditional Rendering for Subject Name */}
                    Upcoming Tasks for {subject?.subjectName ? subject.subjectName : "Loading..."}
                </h1>

                {/* Conditional Rendering for Tasks Table */}
                {subject?.subjectName ? (
                    <TasksTable
                        tasks={tasks}
                        refreshTasks={refreshTasks}
                        onDelete={handleDeleteTask}
                        onUpdateTask={updateTaskInState}
                    />
                ) : (
                    // Display spinner with loading message
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
