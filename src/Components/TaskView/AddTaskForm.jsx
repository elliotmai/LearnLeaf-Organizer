import React, { useState, useEffect } from 'react';
import { addTask, addSubject, addProject, sortTasks, sortSubjects, sortProjects } from '/src/LearnLeaf_Functions.jsx';
import { getAllFromStore } from '/src/db.js';
import { useUser } from '/src/UserState.jsx';
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
        transform: 'scale(1.03)',
    },
};

const cancelButtonStyle = {
    color: '#ff5252',
    marginLeft: 1,
    '&:hover': { 
        color: '#fff',
        backgroundColor: '#ff5252' 
    }
};

export function AddTaskForm({ isOpen, onClose, onAddTask, subjects, projects, initialSubject, initialProject, initialDueDate }) {
    const { user } = useUser();
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

        console.log('task details:', taskDetails, '\nnew subject?', isNewSubject, '\nnew subject:', newSubjectName, '\nnew project?', isNewProject, '\nnew project:', newProjectName);

        if (taskDetails.dueTimeInput && !taskDetails.dueDateInput) {
            setErrors(prevErrors => ({
                ...prevErrors,
                dueDateInput: 'Due date is required when due time is added.',
            }));
            return;
        }

        let updatedTaskDetails = { ...taskDetails };

        if (isNewSubject && newSubjectName) {
            const newSubjectDetails = {
                subjectName: newSubjectName,
                subjectDescription: '',
                subjectSemester: '',
                subjectColor: 'black'
            };
            const addedSubject = await addSubject(newSubjectDetails);
            updatedTaskDetails.taskSubject = addedSubject.subjectId;
            const sortedSubjects = sortSubjects([...subjects, addedSubject])
            subjects = sortedSubjects;
        }

        if (isNewProject && newProjectName) {
            const newProjectDetails = {
                projectName: newProjectName,
                projectDescription: '',
                projectSubjects: []
            };
            const addedProject = await addProject(newProjectDetails);
            updatedTaskDetails.taskProject = addedProject.projectId;

            const sortedProjects = sortProjects([...projects, addedProject])
            projects = sortedProjects;
        }

        const newTaskData = await addTask(updatedTaskDetails);
        console.log('new task data: ', newTaskData);

        onAddTask(newTaskData);

        onClose();
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box sx={boxStyle}>
                <h2 style={{ color: "#8E5B9F" }}>Add a New Task</h2>
                <form noValidate autoComplete="on" onSubmit={handleSubmit}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="subject-label">Subject</InputLabel>
                        <Select
                            labelId="subject-label"
                            id="subject"
                            name="taskSubject"
                            value={isNewSubject ? 'newSubject' : taskDetails.taskSubject || 'None'}
                            onChange={handleInputChange}
                            required
                        >
                            <MenuItem value="None">Select Subject...</MenuItem>
                            {subjects.map((subject) => (
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
                    <TextField fullWidth margin="normal" label="Name" name="taskName" value={taskDetails.taskName} onChange={handleInputChange} required />
                    <TextField fullWidth margin="normal" label="Description" name="taskDescription" value={taskDetails.taskDescription} onChange={handleInputChange} multiline maxRows={4} />

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="priority-label">Priority</InputLabel>
                        <Select
                            labelId="priority-label"
                            id="priority"
                            value={taskDetails.taskPriority}
                            name="taskPriority"
                            onChange={handleInputChange}>
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
                            value={taskDetails.taskStatus}
                            name="taskStatus"
                            onChange={handleInputChange}>
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
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="project-label">Project</InputLabel>
                        <Select
                            labelId="project-label"
                            id="project"
                            name="taskProject"
                            value={isNewProject ? "newProject" : taskDetails.taskProject || 'None'}
                            onChange={handleInputChange}
                            required
                        >
                            <MenuItem value="None">Select Project...</MenuItem>
                            {projects.map((project) => (
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
                        <Button sx={submitButtonStyle} type="submit">
                            Add Task
                        </Button>
                        <Button sx={cancelButtonStyle} onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Box>
        </Modal>
    );
}