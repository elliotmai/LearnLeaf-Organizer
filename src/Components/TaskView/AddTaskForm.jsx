import React, { useState, useEffect } from 'react';
import { addTask, fetchSubjects, addSubject, fetchProjects, addProject, formatDate, formatTime } from '/src/LearnLeaf_Functions.jsx';
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

export function AddTaskForm({ isOpen, onClose, onAddTask, initialSubject, initialProject, initialDueDate, refreshTasks }) {
    const { user } = useUser();
    const [subjects, setSubjects] = useState([]);
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [projects, setProjects] = useState([]);
    const [isNewProject, setIsNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [taskDetails, setTaskDetails] = useState({
        userId: user.id,
        subject: '',  // Start with an empty string, meaning "None" by default.
        assignment: '',
        description: '',
        priority: 'Medium',
        status: 'Not Started',
        startDateInput: '',
        dueDateInput: initialDueDate || '',
        dueTimeInput: '',
        project: '',  // Start with an empty string.
    });
    
    useEffect(() => {
        const loadSubjectsAndProjects = async () => {
            try {
                const fetchedSubjects = await fetchSubjects(user.id, null);
                const fetchedProjects = await fetchProjects(user.id, null);
    
                setSubjects(fetchedSubjects);
                setProjects(fetchedProjects);
    
                // Only update taskDetails if initial values are found in fetched data
                setTaskDetails(prevDetails => ({
                    ...prevDetails,
                    subject: fetchedSubjects.some(subj => subj.subjectName === initialSubject) ? initialSubject : '',
                    project: fetchedProjects.some(proj => proj.projectName === initialProject) ? initialProject : ''
                }));
    
            } catch (error) {
                console.error('Error fetching subjects or projects:', error);
            }
        };
    
        loadSubjectsAndProjects();
    }, [user?.id]);    

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        const isNewItemSelected = value === "newSubject" || value === "newProject";

        if (name === "subject") {
            if (isNewItemSelected) {
                setIsNewSubject(value === "newSubject");
                setTaskDetails(prevDetails => ({ ...prevDetails, subject: '' }));
            } else {
                setIsNewSubject(false);
                setTaskDetails(prevDetails => ({ ...prevDetails, subject: value }));
            }
        } else if (name === "newSubjectName" && isNewSubject) {
            setTaskDetails(prevDetails => ({ ...prevDetails, subject: value }));
        }

        if (name === "project") {
            if (isNewItemSelected) {
                setIsNewProject(value === "newProject");
                setTaskDetails(prevDetails => ({ ...prevDetails, project: '' }));
            } else {
                setIsNewProject(false);
                setTaskDetails(prevDetails => ({ ...prevDetails, project: value }));
            }
        } else if (name === "newProjectName" && isNewProject) {
            setTaskDetails(prevDetails => ({ ...prevDetails, project: value }));
        }

        // Handle all other inputs normally
        if (!["subject", "project", "newSubjectName", "newProjectName"].includes(name)) {
            setTaskDetails(prevDetails => ({ ...prevDetails, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let updatedTaskDetails = { ...taskDetails };

        // Check if "None" was selected for subject or project and replace with an empty string
        if (updatedTaskDetails.subject === "None") {
            updatedTaskDetails.subject = '';
        }
        if (updatedTaskDetails.project === "None") {
            updatedTaskDetails.project = '';
        }

        if (isNewSubject && newSubjectName) {
            const newSubjectDetails = {
                userId: user.id,
                subjectName: newSubjectName,
                semester: '',
                subjectColor: 'black' // Default color
            };
            await addSubject(newSubjectDetails);
            updatedTaskDetails.subject = newSubjectName;
        }

        if (isNewProject && newProjectName) {
            const newProjectDetails = {
                userId: user.id,
                projectName: newProjectName,
                subject: ''
            };
            await addProject(newProjectDetails);
            updatedTaskDetails.project = newProjectName;
        }

        const newTask = { ...taskDetails, userId: user.id };
        console.log("new task: ", newTask);
        const newTaskData = await addTask(newTask);

        if (newTaskData.dueDate != undefined) {
            newTaskData.dueDate = formatDate(newTaskData.dueDate)
        }

        if (newTaskData.startDate != undefined) {
            newTaskData.startDate = formatDate(newTaskData.startDate)
        }

        if (newTaskData.dueTime != undefined) {
            newTaskData.dueTime = formatTime(newTaskData.dueTime)
        }

        onAddTask(newTaskData);  // Immediately update the parent component with the new task
        onClose();
        // refreshTasks();  // Optional: refresh tasks to ensure data consistency
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
                            name="subject"
                            value={isNewSubject ? 'newSubject' : taskDetails.subject || ''}
                            onChange={handleInputChange}
                            required
                        >
                            <MenuItem value="None">None</MenuItem>
                            {subjects.map((subject) => (
                                <MenuItem key={subject.subjectName} value={subject.subjectName}>{subject.subjectName}</MenuItem>
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
                    <TextField fullWidth margin="normal" label="Assignment" name="assignment" value={taskDetails.assignment} onChange={handleInputChange} required />
                    <TextField fullWidth margin="normal" label="Description" name="description" value={taskDetails.description} onChange={handleInputChange} multiline maxRows={4}/>

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="priority-label">Priority</InputLabel>
                        <Select 
                        labelId="priority-label" 
                        id="priority" 
                        value={'Medium'}
                        name="priority" 
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
                        value={'Not Started'}
                        name="status" 
                        onChange={handleInputChange}>
                            <MenuItem value="Not Started">Not Started</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Completed">Completed</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField fullWidth margin="normal" label="Start Date" name="startDateInput" type="date" value={taskDetails.startDateInput} onChange={handleInputChange} InputLabelProps={{ shrink: true }} />
                    <TextField fullWidth margin="normal" label="Due Date" name="dueDateInput" type="date" value={taskDetails.dueDateInput} onChange={handleInputChange} InputLabelProps={{ shrink: true }} />
                    <TextField fullWidth margin="normal" label="Time Due" name="dueTimeInput" type="time" value={taskDetails.dueTimeInput} onChange={handleInputChange} InputLabelProps={{ shrink: true }} />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="project-label">Project</InputLabel>
                        <Select
                            labelId="project-label"
                            id="project"
                            name="project"
                            value={isNewProject ? "newProject" : taskDetails.project || ''}
                            onChange={handleInputChange}
                            required
                        >
                            <MenuItem value="None">None</MenuItem>
                            {projects.map((project) => (
                                <MenuItem key={project.projectName} value={project.projectName}>{project.projectName}</MenuItem>
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