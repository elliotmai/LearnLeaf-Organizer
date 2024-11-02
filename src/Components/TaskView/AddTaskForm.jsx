import { addTask, addSubject, addProject } from '/src/LearnLeaf_Functions.jsx';
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
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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

export function AddTaskForm({ isOpen, onClose, onAddTask, subjects, projects, initialSubject, initialProject, initialDueDate }) {
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isNewProject, setIsNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [taskDetails, setTaskDetails] = useState({
        taskSubject: initialSubject || 'None',
        taskName: '',
        taskDescription: '',
        taskPriority: 'Medium',
        taskStatus: 'Not Started',
        startDateInput: '',
        dueDateInput: initialDueDate || '',
        dueTimeInput: '',
        taskProject: initialProject || 'None',
    });

    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(1);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        const isNewItemSelected = value === "newSubject" || value === "newProject";

        if (name === "taskSubject") {
            setIsNewSubject(isNewItemSelected);
            setTaskDetails(prevDetails => ({
                ...prevDetails,
                taskSubject: isNewItemSelected ? 'None' : value,
            }));
        } else if (name === "taskProject") {
            setIsNewProject(isNewItemSelected);
            setTaskDetails(prevDetails => ({
                ...prevDetails,
                taskProject: isNewItemSelected ? 'None' : value,
            }));
        } else if (name === 'dueTimeInput' && value && !taskDetails.dueDateInput) {
            setErrors(prevErrors => ({
                ...prevErrors,
                dueDateInput: 'Due date is required when due time is added.',
            }));
        } else if (name === 'dueDateInput') {
            setErrors(prevErrors => ({ ...prevErrors, dueDateInput: '' }));
        }

        if (!["taskSubject", "taskProject"].includes(name)) {
            setTaskDetails(prevDetails => ({ ...prevDetails, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (taskDetails.dueTimeInput && !taskDetails.dueDateInput) {
            setErrors(prevErrors => ({
                ...prevErrors,
                dueDateInput: 'Due date is required when due time is added.',
            }));
            return;
        }

        if (isNewSubject && newSubjectName) {
            const newSubject = await addSubject({
                subjectName: newSubjectName,
                subjectSemester: '',
                subjectDescription: '',
                subjectColor: 'black',
            });
            taskDetails.taskSubject = newSubject.subjectId;
            setIsNewSubject(false);
            setNewSubjectName('');
        }

        if (isNewProject && newProjectName) {
            const newProject = await addProject({
                projectName: newProjectName,
                projectDescription: '',
                projectSubjects: [],
            });
            taskDetails.taskProject = newProject.projectId;
            setIsNewProject(false);
            setNewProjectName('');
        }

        const newTaskData = await addTask(taskDetails);

        setTimeout(() => onAddTask(newTaskData), 1);

        onClose();
    };

    const handleNext = () => {
        const newErrors = {};
        if (!taskDetails.taskName) {
            newErrors.taskName = 'Task name is required';
        }

        if (isNewSubject && newSubjectName == '') {
            newErrors.taskSubject = 'New subject name is required';
        }

        if (isNewProject && newProjectName == '') {
            newErrors.taskProject = 'New project name is required';
        }

        if (Object.keys(newErrors).length === 0) {
            setStep(2);
        } else {
            setErrors(newErrors);
        }
    };

    const handleBack = () => {
        setStep(1);
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box sx={boxStyle}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ color: "#8E5B9F", fontWeight: 'bold' }}>
                        Add New Task
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: 'grey.600' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <form noValidate autoComplete="on" onSubmit={handleSubmit}>
                    {step === 1 && (
                        <>
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Task Name"
                                name="taskName"
                                value={taskDetails.taskName}
                                onChange={handleInputChange}
                                required
                                error={!!errors.taskName}
                                helperText={errors.taskName}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Description"
                                name="taskDescription"
                                value={taskDetails.taskDescription}
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
                                    value={taskDetails.taskSubject}
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
                                <>
                                    <TextField
                                        fullWidth
                                        margin="normal"
                                        label="New Subject Name"
                                        name="newSubjectName"
                                        value={newSubjectName}
                                        onChange={(e) => setNewSubjectName(e.target.value)}
                                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                                        required
                                        error={!!errors.taskSubject}
                                    />
                                    {errors.taskSubject && (
                                        <Typography variant="caption" color="error">
                                            {errors.taskSubject}
                                        </Typography>
                                    )}
                                </>
                            )}

                            <FormControl fullWidth margin="normal">
                                <InputLabel id="project-label">Project</InputLabel>
                                <Select
                                    labelId="project-label"
                                    name="taskProject"
                                    value={taskDetails.taskProject}
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
                                <>
                                    <TextField
                                        fullWidth
                                        margin="normal"
                                        label="New Project Name"
                                        name="newProjectName"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                                        required
                                        error={!!errors.taskProject}
                                    />
                                    {errors.taskProject && (
                                        <Typography variant="caption" color="error">
                                            {errors.taskProject}
                                        </Typography>
                                    )}
                                </>
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
                                    value={taskDetails.taskPriority}
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
                                    value={taskDetails.taskStatus}
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
                                name="startDateInput"
                                type="date"
                                value={taskDetails.startDateInput}
                                onChange={handleInputChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Due Date"
                                name="dueDateInput"
                                type="date"
                                value={taskDetails.dueDateInput}
                                onChange={handleInputChange}
                                InputLabelProps={{ shrink: true }}
                                error={!!errors.dueDateInput}
                                helperText={errors.dueDateInput}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Time Due"
                                name="dueTimeInput"
                                type="time"
                                value={taskDetails.dueTimeInput}
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
                                    type="submit"
                                    sx={{
                                        ...buttonStyle,
                                        backgroundColor: '#8E5B9F',
                                        color: '#FFF',
                                        '&:hover': {
                                            backgroundColor: '#8E5B9F',
                                            transform: 'scale(1.03)',
                                        },
                                    }}
                                >
                                    Add Task
                                </Button>
                            </Box>
                        </>
                    )}
                </form>
            </Box>
        </Modal>
    );
}