import React, { useState } from 'react';
import { addProject, addSubject } from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore } from '/src/db.js';
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
    bgcolor: 'background.paper',
    boxShadow: 24,
    pt: 2, pb: 3, px: 4,
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

        const newProject = await addProject({ ...projectDetails, projectSubjects: filteredSubjects });
        onClose();
        await refreshProjects(); // Refresh the project list
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box sx={boxStyle}>
                <h2 style={{ color: "#8E5B9F" }}>Add a New Project</h2>
                <form noValidate autoComplete="on" onSubmit={handleSubmit}>
                    <TextField
                        variant='standard'
                        color='primary'
                        fullWidth
                        label="Project Name"
                        name="projectName"
                        value={projectDetails.projectName}
                        onChange={(e) => setProjectDetails({ ...projectDetails, projectName: e.target.value })}
                        required
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
                    />

                    {projectDetails.projectSubjects.map((subject, index) => (
                        <FormControl 
                            fullWidth 
                            margin="normal" 
                            key={index}>
                            <InputLabel id={`subject-select-label-${index}`}>Subject</InputLabel>
                            <Select
                                labelId={`subject-select-label-${index}`}
                                id={`subject-select-${index}`}
                                value={subject}
                                onChange={(e) => handleInputChange(index, e.target.value)}
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
                        />
                    )}

                    <Button 
                        variant="text" 
                        onClick={addSubjectDropdown} 
                        style={{ 
                            color: "#8E5B9F",
                            fontWeight: "italics",
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
                    />
                    
                    <div style={{ marginTop: 16 }}>
                        <Button sx={submitButtonStyle} type="submit">
                            Add Project
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