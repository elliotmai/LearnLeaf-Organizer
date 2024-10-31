import React, { useState } from 'react';
import { addProject, addSubject } from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';
import { Modal, Box, TextField, Button, FormControl, Select, MenuItem, InputLabel, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

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

export function AddProjectForm({ subjects, isOpen, onClose, refreshProjects }) {
    const { user } = useUser();
    const [projectDetails, setProjectDetails] = useState({
        projectName: '',
        projectDescription: '',
        projectSubjects: ['None'], // Initialize with one 'None' subject
        projectDueDateInput: '',
        projectDueTimeInput: '',
    });
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');

    // Handle changes to any input in the form
    const handleInputChange = (index, value) => {
        const updatedSubjects = [...projectDetails.projectSubjects];
        updatedSubjects[index] = value;
        setProjectDetails({ ...projectDetails, projectSubjects: updatedSubjects });

        if (value === "newSubject") {
            setIsNewSubject(true);
        } else {
            setIsNewSubject(false);
        }
    };

    // Add a new subject dropdown
    const addSubjectDropdown = () => {
        setProjectDetails({
            ...projectDetails,
            projectSubjects: [...projectDetails.projectSubjects, 'None'],
        });
    };

    const removeSubjectDropdown = (index) => {
        const updatedSubjects = projectDetails.projectSubjects.filter((_, i) => i !== index);
        setProjectDetails({ ...projectDetails, projectSubjects: updatedSubjects });
    };

    // Handle the form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Remove "None" from the selected subjects
        const filteredSubjects = projectDetails.projectSubjects.filter(subject => subject !== 'None');

        // If a new subject is added, add it to the list
        if (isNewSubject && newSubjectName) {
            const newSubjectDetails = {
                subjectName: newSubjectName,
                subjectSemester: '',
                subjectColor: 'black',
                subjectDescription: ''
            };
            await addSubject(newSubjectDetails);
            filteredSubjects.push(newSubjectName); // Add the new subject to project subjects
        }

        console.log({ ...projectDetails, projectSubjects: filteredSubjects });

        const newProject = await addProject({ ...projectDetails, projectSubjects: filteredSubjects });
        onClose();
        await refreshProjects(); // Refresh the project list
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box sx={boxStyle}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ color: "#8E5B9F", fontWeight: 'bold' }}>
                        Add New Project
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: 'grey.600' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <form noValidate autoComplete="on" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Project Name"
                        name="projectName"
                        value={projectDetails.projectName}
                        onChange={(e) => setProjectDetails({ ...projectDetails, projectName: e.target.value })}
                        required
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Description"
                        name="projectDescription"
                        value={projectDetails.projectDescription}
                        onChange={(e) => setProjectDetails({ ...projectDetails, projectDescription: e.target.value })}
                        multiline
                        maxRows={4}
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />

                    {projectDetails.projectSubjects.map((subject, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id={`subject-select-label-${index}`}>Subject</InputLabel>
                                <Select
                                    labelId={`subject-select-label-${index}`}
                                    id={`subject-select-${index}`}
                                    value={subject}
                                    onChange={(e) => handleInputChange(index, e.target.value)}
                                    sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                                >
                                    <MenuItem value="None">Select Subject...</MenuItem>
                                    {subjects
                                        .filter(subject => subject.subjectId !== 'None' && subject.subjectStatus === 'Active')
                                        .map((subject) => (
                                            <MenuItem key={subject.subjectId} value={subject.subjectId}>
                                                {subject.subjectName}
                                            </MenuItem>
                                        ))}
                                    <MenuItem value="newSubject">Add New Subject...</MenuItem>
                                </Select>
                            </FormControl>
                            {index > 0 && (
                                <IconButton onClick={() => removeSubjectDropdown(index)} sx={{ color: '#ff5252', ml: 1 }}>
                                    <RemoveCircleOutlineIcon />
                                </IconButton>
                            )}
                        </Box>
                    ))}

                    {isNewSubject && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="New Subject Name"
                            name="newSubjectName"
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            required
                            sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                        />
                    )}

                    <Button
                        variant="text"
                        onClick={addSubjectDropdown}
                        style={{
                            color: "#8E5B9F",
                            fontWeight: "italic",
                            backgroundColor: "transparent"
                        }}
                    >
                        Add Another Subject
                    </Button>

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Due Date"
                        name="projectDueDateInput"
                        type="date"
                        value={projectDetails.projectDueDateInput}
                        onChange={(e) => setProjectDetails({ ...projectDetails, projectDueDateInput: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Time Due"
                        name="projectDueTimeInput"
                        type="time"
                        value={projectDetails.projectDueTimeInput}
                        onChange={(e) => setProjectDetails({ ...projectDetails, projectDueTimeInput: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button sx={submitButtonStyle} type="submit">
                            Add Project
                        </Button>
                        <Button sx={cancelButtonStyle} onClick={onClose}>
                            Cancel
                        </Button>
                    </Box>
                </form>
            </Box>
        </Modal>
    );
}