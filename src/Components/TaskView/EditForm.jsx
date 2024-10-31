import React, { useState } from 'react';
import {
    Modal,
    Box,
    TextField,
    Button,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
    Typography,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { editTask, addSubject, addProject, sortSubjects, sortProjects } from '/src/LearnLeaf_Functions.jsx';

const boxStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 500,
    maxHeight: '90vh',
    overflowY: 'auto',
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: '12px',
    px: 4,
    pt: 3,
    pb: 3,
};

const buttonStyle = {
    mt: 2,
    width: '48%',
};

export const TaskEditForm = ({ task, subjects, projects, isOpen, onClose, onSave }) => {
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

    const [errors, setErrors] = useState({});
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [isNewProject, setIsNewProject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [step, setStep] = useState(1);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        const isNewItemSelected = value === "newSubject" || value === "newProject";

        if (name === "taskSubject") {
            setIsNewSubject(isNewItemSelected);
            setFormValues(prevDetails => ({
                ...prevDetails,
                taskSubject: isNewItemSelected ? 'None' : value,
            }));
        } else if (name === "taskProject") {
            setIsNewProject(isNewItemSelected);
            setFormValues(prevDetails => ({
                ...prevDetails,
                taskProject: isNewItemSelected ? 'None' : value,
            }));
        } else if (name === "taskDueTime" && value) {
            if (!formValues.taskDueDate) {
                setErrors(prevErrors => ({
                    ...prevErrors,
                    taskDueDate: 'Due date is required when due time is added.',
                }));
            } else {
                setErrors(prevErrors => ({ ...prevErrors, taskDueDate: '' }));
            }
        } else if (name === "taskDueDate") {
            setErrors(prevErrors => ({ ...prevErrors, taskDueDate: '' }));
        }

        if (!["taskSubject", "taskProject"].includes(name)) {
            setFormValues(prevDetails => ({ ...prevDetails, [name]: value }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (formValues.taskDueTime && !formValues.taskDueDate) {
            setErrors(prevErrors => ({
                ...prevErrors,
                taskDueDate: 'Due date is required when due time is added.',
            }));
            return;
        }

        let updatedTaskDetails = { ...formValues };

        // If a new subject is being added
        if (isNewSubject && newSubjectName) {
            const newSubjectDetails = {
                subjectName: newSubjectName,
                subjectSemester: '',
                subjectDescription: '',
                subjectColor: 'black',
                subjectStatus: 'Active',
            };
            const addedSubject = await addSubject(newSubjectDetails);
            const sortedSubjects = sortSubjects([...subjects, addedSubject]);
            subjects = sortedSubjects;
            updatedTaskDetails.taskSubject = addedSubject.subjectId;
        }

        // If a new project is being added
        if (isNewProject && newProjectName) {
            const newProjectDetails = {
                projectName: newProjectName,
                projectDescription: '',
                projectSubjects: [],
                projectStatus: 'Active',
            };
            const addedProject = await addProject(newProjectDetails);
            const sortedProjects = sortProjects([...projects, addedProject]);
            projects = sortedProjects;
            updatedTaskDetails.taskProject = addedProject.projectId;
        }

        const newTaskData = await editTask(updatedTaskDetails);

        onSave(newTaskData);
        onClose();
    };

    const handleNext = () => {
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
    };

    return (
        <Modal open={isOpen} onClose={onClose} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
            <Box sx={boxStyle}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ color: "#8E5B9F", fontWeight: 'bold' }}>
                        Edit Task
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: 'grey.600' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <form noValidate autoComplete="on">
                    {step === 1 && (
                        <>
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Task Name"
                                name="taskName"
                                value={formValues.taskName}
                                onChange={handleInputChange}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Description"
                                name="taskDescription"
                                value={formValues.taskDescription}
                                onChange={handleInputChange}
                                multiline
                                maxRows={4}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            />
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="subject-label">Subject</InputLabel>
                                <Select
                                    labelId="subject-label"
                                    name="taskSubject"
                                    value={formValues.taskSubject}
                                    onChange={handleInputChange}
                                    sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                                >
                                    <MenuItem value="None">Select Subject...</MenuItem>
                                    {subjects
                                        .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
                                        .filter(subject => subject.subjectStatus === "Active")
                                        .map((subject) => (
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
                                    sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                                    required
                                />
                            )}
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="project-label">Project</InputLabel>
                                <Select
                                    labelId="project-label"
                                    name="taskProject"
                                    value={formValues.taskProject}
                                    onChange={handleInputChange}
                                    sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                                >
                                    <MenuItem value="None">Select Project...</MenuItem>
                                    {projects
                                        .sort((a, b) => a.projectName.localeCompare(b.projectName))
                                        .filter(project => project.projectStatus === "Active")
                                        .map((project) => (
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
                                    sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                                    required
                                />
                            )}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                <Button
                                    onClick={handleNext}
                                    sx={{
                                        ...buttonStyle,
                                        backgroundColor: '#B6CDC8',
                                        color: '#355147',
                                        '&:hover': {
                                            backgroundColor: '#B6CDC8',
                                            transform: 'scale(1.03)',
                                        },
                                    }}
                                >
                                    Next
                                </Button>
                            </Box>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="priority-label">Priority</InputLabel>
                                <Select
                                    labelId="priority-label"
                                    name="taskPriority"
                                    value={formValues.taskPriority}
                                    onChange={handleInputChange}
                                    sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
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
                                    name="taskStatus"
                                    value={formValues.taskStatus}
                                    onChange={handleInputChange}
                                    sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
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
                                value={formValues.taskStartDate}
                                onChange={handleInputChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Due Date"
                                name="taskDueDate"
                                type="date"
                                value={formValues.taskDueDate}
                                onChange={handleInputChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Time Due"
                                name="taskDueTime"
                                type="time"
                                value={formValues.taskDueTime}
                                onChange={handleInputChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Button
                                    onClick={handleBack}
                                    sx={{
                                        ...buttonStyle,
                                        backgroundColor: '#B6CDC8',
                                        color: '#355147',
                                        '&:hover': {
                                            backgroundColor: '#B6CDC8',
                                            transform: 'scale(1.03)',
                                        },
                                    }}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    sx={{
                                        ...buttonStyle,
                                        backgroundColor: '#8E5B9F', color: '#FFF'
                                        ,
                                        '&:hover': {
                                            backgroundColor: '#8E5B9F',
                                            transform: 'scale(1.03)',
                                        },
                                    }}
                                >
                                    Save
                                </Button>
                            </Box>
                        </>
                    )}
                </form>
            </Box>
        </Modal>
    );
};