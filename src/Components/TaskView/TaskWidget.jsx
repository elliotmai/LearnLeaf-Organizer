import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardActions, Button, Grid, TextField, Select, MenuItem, InputLabel, FormControl, Typography, Snackbar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { editTask, addSubject, addProject } from '/src/LearnLeaf_Functions.jsx';
import {TaskEditForm} from '/src/Components/TaskView/EditForm.jsx'
import { debounce } from 'lodash';
import './TaskView.css';

const TaskWidget = ({ task, onDelete, subjects, projects, refreshTasks, onUpdateTask }) => {
    const [formValues, setFormValues] = useState({ ...task });
    const [editedTask, setEditedTask] = useState({});
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isNewProject, setIsNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [openSnackbar, setOpenSnackbar] = useState(false); // State to control the Snackbar visibility

    const toggleFormVisibility = () => {
        setIsEditTaskFormOpen(!isEditTaskFormOpen);
    };

    const handleTextFieldChange = useCallback(
        debounce((event) => {
            const { name, value } = event.target;
            setFormValues((prevDetails) => ({ ...prevDetails, [name]: value }));
        }, 300),
        []
    );

    const handleTimeFieldChange = (event) => {
        const { name, value } = event.target;
        setFormValues((prevDetails) => ({ ...prevDetails, [name]: value }));
    };

    const handleSelectChange = (event) => {
        const { name, value } = event.target;

        if (name === 'subject') {
            if (value === 'newSubject') {
                setIsNewSubject(true); // Show text field for new subject
            } else {
                setIsNewSubject(false); // Hide the text field when another subject is selected
            }
        }

        if (name === 'project') {
            if (value === 'newProject') {
                setIsNewProject(true); // Show text field for new project
            } else {
                setIsNewProject(false); // Hide the text field when another project is selected
            }
        }

        setFormValues((prevDetails) => ({ ...prevDetails, [name]: value }));
    };

    const handleDateChange = (event, field) => {
        const value = event.target.value || ''; // Handle "Clear" action by setting to empty string
        setFormValues((prevValues) => ({
            ...prevValues,
            [field]: value,
        }));
    };

    useEffect(() => {
        setFormValues({ ...task });
        setIsNewSubject(false);
        setNewSubjectName('');
        setIsNewProject(false);
        setNewProjectName('');
    }, [task]);

    const getValidSubject = () => subjects.some(subj => subj.subjectName === formValues.subject) ? formValues.subject : '';
    const getValidProject = () => projects.some(proj => proj.projectName === formValues.project) ? formValues.project : '';

    const getSubjectColor = () => {
        const selectedSubject = subjects.find(subj => subj.subjectName === formValues.subject);
        return selectedSubject ? selectedSubject.subjectColor : 'black';
    };

    const handleSave = async (editedTask) => {
        try {
            let updatedTask = { ...editedTask };
    
            let subjectAdded = false;
            let projectAdded = false;
    
            // If a new subject is being added
            if (isNewSubject && newSubjectName) {
                const newSubjectDetails = {
                    userId: updatedTask.userId,
                    subjectName: newSubjectName,
                    semester: '',
                    subjectColor: 'black'
                };
                await addSubject(newSubjectDetails);
                updatedTask.subject = newSubjectName;
                subjectAdded = true;  // Mark subject as added
            }
    
            // If a new project is being added
            if (isNewProject && newProjectName) {
                const newProjectDetails = {
                    userId: updatedTask.userId,
                    projectName: newProjectName,
                    subject: ''
                };
                await addProject(newProjectDetails);
                updatedTask.project = newProjectName;
                projectAdded = true;  // Mark project as added
            }
    
            // Save the task with the new subject or project
            await editTask(updatedTask);
    
            // Only after a successful save, update the local state
            onUpdateTask(updatedTask);
    
            // Show the Snackbar indicating success
            setOpenSnackbar(true);
    
            // Close the edit modal if it was open
            if (isEditModalOpen) {
                setEditModalOpen(false);
            }
    
            // Optionally, refresh tasks if a new subject or project was added
            // if (subjectAdded || projectAdded) {
            //     refreshTasks();
            // }
    
        } catch (error) {
            console.error('Error updating task:', error);
            // Optionally, show an error Snackbar or handle the error case
        }
    };    

    const handleEditClick = (task) => {
        setEditedTask({ ...task });
        setEditModalOpen(true); // Open the edit modal
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false); // Hide the Snackbar after timeout or action
    };

    return (
        <div style={{ position: 'relative' }}>
            <TaskEditForm
                key={editedTask.taskId}
                task={editedTask}
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleSave}               
            />

            <Card sx={{ minWidth: 275 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: getSubjectColor(), fontWeight: 'bold' }}>
                        {formValues.assignment || 'Unnamed Task'}
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Subject</InputLabel>
                                <Select
                                    value={isNewSubject ? 'newSubject' : getValidSubject()}
                                    name="subject"
                                    onChange={handleSelectChange}
                                >
                                    <MenuItem value="">Select Subject...</MenuItem>
                                    {subjects.map(subj => (
                                        <MenuItem key={subj.subjectName} value={subj.subjectName}>
                                            {subj.subjectName}
                                        </MenuItem>
                                    ))}
                                    <MenuItem value="newSubject">Add New Subject...</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {isNewSubject && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="New Subject Name"
                                    name="newSubjectName"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                />
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Project</InputLabel>
                                <Select
                                    value={isNewProject ? 'newProject' : getValidProject()}
                                    name="project"
                                    onChange={handleSelectChange}
                                >
                                    <MenuItem value="">Select Project...</MenuItem>
                                    {projects.map(proj => (
                                        <MenuItem key={proj.projectName} value={proj.projectName}>
                                            {proj.projectName}
                                        </MenuItem>
                                    ))}
                                    <MenuItem value="newProject">Add New Project...</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {isNewProject && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="New Project Name"
                                    name="newProjectName"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                />
                            </Grid>
                        )}

                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    name="priority"
                                    value={formValues.priority || 'Medium'}
                                    onChange={handleSelectChange}
                                >
                                    <MenuItem value="High">High</MenuItem>
                                    <MenuItem value="Medium">Medium</MenuItem>
                                    <MenuItem value="Low">Low</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    name="status"
                                    value={formValues.status || 'Not Started'}
                                    onChange={handleSelectChange}
                                >
                                    <MenuItem value="Not Started">Not Started</MenuItem>
                                    <MenuItem value="In Progress">In Progress</MenuItem>
                                    <MenuItem value="Completed">Completed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                            <TextField
                                label="Start Date"
                                name="startDate"
                                type="date"
                                value={formValues.startDate || ''} // Ensure the field is cleared
                                onChange={(e) => handleDateChange(e, 'startDate')}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <TextField
                                label="Deadline"
                                name="dueDate"
                                type="date"
                                value={formValues.dueDate || ''} // Ensure the field is cleared
                                onChange={(e) => handleDateChange(e, 'dueDate')}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Time Due"
                                name="dueTime"
                                type="time"
                                value={formValues.dueTime || ''}
                                onChange={handleTimeFieldChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>

                <CardActions
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingRight: 2
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            size="small"
                            onClick={() => handleSave(formValues)}
                            variant="contained"
                            sx={{
                                backgroundColor: '#B6CDC8',
                                color: '#355147',
                                '&:hover': { backgroundColor: '#a8bdb8' },
                                mr: 3,
                                ml: 1
                            }}
                        >
                            Save
                        </Button>

                        <EditIcon
                            onClick={() => handleEditClick(task)}
                            sx={{
                                color: '#9F6C5B',
                                fontSize: 'xl',
                                cursor: 'pointer'
                            }}
                        />
                    </div>

                    <Button
                        size="small"
                        onClick={() => onDelete(task.taskId)}
                        variant="contained"
                        sx={{
                            backgroundColor: '#ff5252',
                            color: '#fff',
                            '&:hover': { backgroundColor: '#ff1744' },
                        }}
                    >
                        Delete
                    </Button>
                </CardActions>


                {/* Snackbar Notification positioned at the top of the widget */}
                <Snackbar
                    open={openSnackbar}
                    autoHideDuration={3000}
                    onClose={handleCloseSnackbar}
                    message="Task has been successfully saved!"
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Position the Snackbar at the top
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)', // Center it within the widget
                    }}
                />
            </Card>
        </div>
    );
};

// Use React.memo correctly to wrap TaskWidget
export default React.memo(TaskWidget);
