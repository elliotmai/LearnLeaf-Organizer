import React, { useState, useEffect } from 'react';
import { editTask, fetchSubjects, addSubject, fetchProjects, addProject, formatDate, formatTime } from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';
import './TaskView.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';

const boxStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    height: '90vh',
    maxHeight: '90vh',
    overflowY: 'auto',
    bgcolor: 'background.paper',
    boxShadow: 24,
    pt: 2,
    pb: 3,
    px: 4,
};

const submitButtonStyle = {
    backgroundColor: '#B6CDC8',
    color: '#355147',
    '&:hover': {
        backgroundColor: '#a8bdb8',
    },
};

const cancelButtonStyle = {
    backgroundColor: 'transparent',
    color: '#355147',
    marginLeft: 1,
    '&:hover': {
        backgroundColor: '#a8bdb8',
    },
};

export const TaskEditForm = ({ task, subjects, projects, isOpen, onClose, onSave }) => {
    const { user } = useUser();
    const [formValues, setFormValues] = useState({
        taskId: task?.taskId || '',
        taskSubject: task?.taskSubject?.subjectId || 'None',
        taskName: task?.taskName || '',
        taskDescription: task?.taskDescription || '',
        taskPriority: task?.taskPriority || 'Medium',
        taskStatus: task?.taskStatus || 'Not Started',
        taskStartDate: task?.taskStartDate || '',
        taskDueDate: task?.taskDueDate || '',
        taskDueTime: task?.taskDueTime || '',
        taskProject: task?.taskProject?.projectId || 'None',
    });
    
    const [errors, setErrors] = useState({}); // State to track validation errors
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [isNewProject, setIsNewProject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newProjectName, setNewProjectName] = useState('');

    useEffect(() => {
        console.log('editing task: ', task);
    }, [user?.id, task]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        const isNewItemSelected = value === "newSubject" || value === "newProject";

        if (name === "taskSubject") {
            if (isNewItemSelected) {
                setIsNewSubject(value === "newSubject");
                setFormValues(prevDetails => ({ ...prevDetails, taskSubject: 'None' }));
            } else {
                setIsNewSubject(false);
                setFormValues(prevDetails => ({ ...prevDetails, taskSubject: value }));
            }
        } else if (name === "newSubjectName" && isNewSubject) {
            setFormValues(prevDetails => ({ ...prevDetails, taskSubject: value }));
        }

        if (name === "taskProject") {
            if (isNewItemSelected) {
                setIsNewProject(value === "newProject");
                setFormValues(prevDetails => ({ ...prevDetails, taskProject: 'None' }));
            } else {
                setIsNewProject(false);
                setFormValues(prevDetails => ({ ...prevDetails, taskProject: value }));
            }
        } else if (name === "newProjectName" && isNewProject) {
            setFormValues(prevDetails => ({ ...prevDetails, taskProject: value }));
        }

        // Validation logic for dueDateInput when dueTimeInput is provided
        if (name === 'taskDueTime' && value) {
            if (!formValues.taskDueDate) {
                setErrors((prevErrors) => ({
                    ...prevErrors,
                    taskDueDate: 'Due date is required when due time is added.',
                }));
            } else {
                setErrors((prevErrors) => ({
                    ...prevErrors,
                    taskDueDate: '', // Clear the error if dueDate is already set
                }));
            }
        } else if (name === 'taskDueDate') {
            setErrors((prevErrors) => ({
                ...prevErrors,
                taskDueDate: '', // Clear the error when the due date is provided
            }));
        }

        // Handle all other inputs normally
        if (!["taskSubject", "taskProject", "newSubjectName", "newProjectName"].includes(name)) {
            setFormValues(prevDetails => ({ ...prevDetails, [name]: value }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Check if dueTimeInput is present but dueDateInput is missing
        if (formValues.taskDueTime && !formValues.taskDueDate) {
            setErrors((prevErrors) => ({
                ...prevErrors,
                taskDueDate: 'Due date is required when due time is added.',
            }));
            return; // Prevent form submission if validation fails
        }

        let updatedTaskDetails = { ...formValues };

        if (isNewSubject && newSubjectName) {
            const newSubjectDetails = {
                subjectName: newSubjectName,
                subjectDescription: '',
                subjectSemester: '',
                subjectColor: 'black'
            };
            updatedTaskDetails.taskSubject = await addSubject(newSubjectDetails);
        }

        if (isNewProject && newProjectName) {
            const newProjectDetails = {
                projectName: newProjectName,
                projectDescription: '',
                projectSubjects: []
            };
            updatedTaskDetails.taskProject = await addProject(newProjectDetails);
        }

        const newTaskData = await editTask(updatedTaskDetails);

        onSave(newTaskData);
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={onClose} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
            <Box sx={boxStyle}>
                <h2 id="modal-modal-title" style={{ color: "#8E5B9F" }}>Edit Task</h2>
                <form noValidate autoComplete="on">
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="subject-label">Subject</InputLabel>
                        <Select
                            labelId="subject-label"
                            id="subject"
                            name="taskSubject"
                            value={isNewSubject ? 'newSubject' : formValues.taskSubject || 'None'}
                            onChange={handleInputChange}
                            required
                        >
                            <MenuItem value="None">Select Subject...</MenuItem>
                            {subjects.map(subject => (
                                <MenuItem key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}</MenuItem>
                            ))}
                            <MenuItem value="newSubject">Add New Subject...</MenuItem>
                        </Select>
                    </FormControl>
                    {isNewSubject && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="New Subject Name"
                            name="newSubjectName"
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            required
                        />
                    )}
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Name"
                        name="taskName"
                        value={formValues.taskName ? formValues.taskName : ''}
                        onChange={handleInputChange}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Description"
                        name="taskDescription"
                        value={formValues.taskDescription ? formValues.taskDescription : ''}
                        onChange={handleInputChange}
                        multiline
                        maxRows={4}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="priority-label">Priority</InputLabel>
                        <Select
                            labelId="priority-label"
                            id="priority"
                            value={formValues.taskPriority ? formValues.taskPriority : 'Medium'}
                            label="Priority"
                            name="taskPriority"
                            onChange={handleInputChange}
                        >
                            <MenuItem value="High">High</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="Low">Low</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="status-label">Status</InputLabel>
                        <Select
                            labelId="status-label"
                            id="status"
                            value={formValues.taskStatus ? formValues.taskStatus : 'Not Started'}
                            label="Status"
                            name="taskStatus"
                            onChange={handleInputChange}
                        >
                            <MenuItem value="Not Started">Not Started</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Completed">Completed</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Start Date"
                        name="taskStartDate"
                        type="date"
                        value={formValues.taskStartDate ? formValues.taskStartDate : ''}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Due Date"
                        name="taskDueDate"
                        type="date"
                        value={formValues.taskDueDate ? formValues.taskDueDate : ''}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.taskDueDate} // Display error styling if there is an error
                        helperText={errors.taskDueDate} // Display the error message
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Time Due"
                        name="taskDueTime"
                        type="time"
                        value={formValues.taskDueTime ? formValues.taskDueTime : ''}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="project-label">Project</InputLabel>
                        <Select
                            labelId="project-label"
                            id="project"
                            name="taskProject"
                            value={isNewProject ? 'newProject' : formValues.taskProject || 'None'}
                            onChange={handleInputChange}
                            required
                        >
                            <MenuItem value="None">Select Project...</MenuItem>
                            {projects.map(project => (
                                <MenuItem key={project.projectId} value={project.projectId}>{project.projectName}</MenuItem>
                            ))}
                            <MenuItem value="newProject">Add New Project...</MenuItem>
                        </Select>
                    </FormControl>
                    {isNewProject && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="New Project Name"
                            name="newProjectName"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            required
                        />
                    )}
                    <div style={{ marginTop: 16 }}>
                        <Button sx={submitButtonStyle} onClick={handleSave}>
                            Save
                        </Button>
                        <Button sx={cancelButtonStyle} onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Box>
        </Modal>
    );
};