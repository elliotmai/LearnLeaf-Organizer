<<<<<<< Updated upstream
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
import '/src/Components/PageFormat.css';

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
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);
                setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
                refreshTasks(); // Refresh the task list after deletion
            } catch (error) {
                console.error('Error deleting task:', error);
            }
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

            <h1 style={{ color: '#907474' }}>{user?.name}'s Upcoming Tasks</h1>

            <div className="task-list">

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
=======
import React, { useState, useEffect } from 'react';
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import { fetchTasks, logoutUser, deleteTask, addTask, fetchSubjects,formatTime, addSubject, fetchProjects, addProject } from '/src/LearnLeaf_Functions.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Papa from 'papaparse';  // Import PapaParse
import '/src/Components/FormUI.css';
import '/src/Components/TaskView/TaskView.css';

const TaskList = () => {
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null); // State to store selected file
    const [uploadError, setUploadError] = useState(null);  // State to manage upload errors
    const { user, updateUser } = useUser();
    const navigate = useNavigate();
    const [taskDetails, setTaskDetails] = useState({
        userId: user.id,
        subject: '',
        assignment: '',
        priority: 'Medium',
        status: 'Not Started',
        startDateInput: '',
        dueDateInput: '',
        dueTimeInput: '',
        project: '',
    });

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

    const handleAddTask = (newTask) => {
        console.log({ newTask });
        setTasks(prevTasks => [...prevTasks, newTask]);
        refreshTasks();
    };

    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
        refreshTasks();
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteTask(taskId);
            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
            refreshTasks();
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

    // Handler for opening and closing the import modal
    const handleOpenImportModal = () => {
        setIsImportModalOpen(true);
    };

    const handleCloseImportModal = () => {
        setIsImportModalOpen(false);
        setSelectedFile(null); // Clear file input when closing modal
        setUploadError(null);  // Clear any previous error
    };

    // Handle file selection
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "text/csv") {
            setSelectedFile(file);
            setUploadError(null);  // Reset error if file is valid
        } else {
            setSelectedFile(null);
            setUploadError("Please select a valid CSV file.");
        }
    };

    const formatDateToDashed = (dateString) => {
        const [month, day, year] = dateString.split("/");
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Ensure month/day are 2 digits
    };
    


    const parseCSVFile = () => {
        if (selectedFile) {
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: function (result) {
                    if (result.errors.length) {
                        console.error('Errors during parsing:', result.errors);
                        setUploadError("Error parsing the file. Please check the CSV format.");
                    } else {
                        console.log('Parsed data:', result.data);

                        result.data.map(async (task) => {
                            let updatedTaskDetails = { ...taskDetails };

                            // Format dates and time properly
                            updatedTaskDetails.dueDateInput = formatDateToDashed(task.dueDate);
                            updatedTaskDetails.startDateInput = formatDateToDashed(task.startDate);
                            updatedTaskDetails.dueTimeInput = task.dueTime;

                            // Add other task details
                            updatedTaskDetails.assignment = task.assignment;
                            updatedTaskDetails.priority = task.priority;
                            updatedTaskDetails.status = task.status;

                            // Add subject and project (assuming these are functions to handle subjects and projects)
                            const newSubjectDetails = {
                                userId: user.id,
                                subjectName: task.subject,
                                semester: '',
                                subjectColor: 'black'
                            };
                            await addSubject(newSubjectDetails);

                            const newProjectDetails = {
                                userId: user.id,
                                projectName: task.project,
                                subject: task.subject
                            };
                            await addProject(newProjectDetails);

                            // Finally, add the task
                            try {
                                const newTask = await addTask({ ...updatedTaskDetails, userId: user.id });
                                handleAddTask(newTask);
                            } catch (error) {
                                console.error('Error adding task:', error);
                            }
                        });

                        refreshTasks();
                        setIsImportModalOpen(false);
                    }
                },
                error: function (error) {
                    console.error('File Parsing Error:', error);
                    setUploadError("Failed to parse the CSV file.");
                }
            });
        } else {
            setUploadError("No file selected.");
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

            <div className="task-list">
                <h1 style={{ color: '#907474' }}>{user?.name}'s Upcoming Tasks</h1>

                {isLoading ? (
                    <Grid container alignItems="center" justifyContent="center" direction="column" style={{ minHeight: '150px' }}>
                        <CircularProgress />
                        <p>Loading tasks...</p>
                    </Grid>
                ) : (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <button onClick={handleOpenImportModal}>Import</button>
                        </div>

                        <TasksTable
                            tasks={tasks}
                            refreshTasks={refreshTasks}
                            onDelete={handleDeleteTask}
                        />
                    </>
                )}
            </div>

            {/* Import Modal */}
            <Modal
                open={isImportModalOpen}
                onClose={handleCloseImportModal}
                aria-labelledby="import-modal-title"
                aria-describedby="import-modal-description"
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 400,
                        bgcolor: 'background.paper',
                        boxShadow: 24,
                        p: 4,
                        borderRadius: '10px',
                    }}
                >
                    <h2 id="import-modal-title">Upload CSV</h2>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ marginBottom: '10px' }}
                    />
                    {uploadError && <p style={{ color: 'red' }}>{uploadError}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button variant="contained" onClick={parseCSVFile}>Upload</Button>
                        <Button variant="outlined" onClick={handleCloseImportModal}>Cancel</Button>
                    </div>
                </Box>
            </Modal>
        </div>
    );
};

export default TaskList;
>>>>>>> Stashed changes
