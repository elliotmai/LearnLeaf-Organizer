import React, { useState, useEffect } from 'react';
import { useUser } from '/src/UserState.jsx';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import { getAllFromStore, saveToStore } from '/src/db.js'; // Use IndexedDB functions

// Styles
const boxStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
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

export const EditProjectForm = ({ project, subjects, isOpen, onClose, onSave }) => {
    const { user } = useUser();
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [formValues, setFormValues] = useState(project);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "subject" && value === "newSubject") {
            setIsNewSubject(true);
            setFormValues({ ...formValues, subject: '' });
        } else if (name === "newSubjectName") {
            setNewSubjectName(value);
            setFormValues({ ...formValues, subject: value });
        } else {
            setIsNewSubject(false);
            setFormValues({ ...formValues, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formValues.subject === "None") {
            formValues.subject = '';
        }

        // Add new subject to IndexedDB if needed
        if (isNewSubject && newSubjectName) {
            const newSubjectDetails = {
                userId: user.id,
                subjectName: newSubjectName,
                semester: '',
                subjectColor: 'black', // Default color
            };
            await saveToStore('subjects', [newSubjectDetails]); // Save the new subject in IndexedDB
            formValues.subject = newSubjectName;
        }

        // Save the updated project details to IndexedDB
        await saveToStore('projects', [formValues]);
        onSave(formValues); // Pass the updated project back to the parent component
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box sx={boxStyle}>
                <h2 style={{ color: "#8E5B9F" }}>Edit Project</h2>
                <form noValidate autoComplete="off" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Project Name"
                        name="projectName"
                        value={formValues.projectName}
                        onChange={handleInputChange}
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="subject-select-label">Subject</InputLabel>
                        <Select
                            labelId="subject-select-label"
                            id="subject-select"
                            name="subject"
                            value={isNewSubject ? "newSubject" : formValues.subject}
                            onChange={handleInputChange}
                        >
                            <MenuItem value="None">None</MenuItem>
                            {subjects.map(subject => (
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
                            onChange={handleInputChange}
                            required
                        />
                    )}
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Due Date"
                        name="projectDueDateInput"
                        type="date"
                        value={formValues.projectDueDateInput}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Time Due"
                        name="projectDueTimeInput"
                        type="time"
                        value={formValues.projectDueTimeInput}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                    />
                    <div style={{ marginTop: 16 }}>
                        <Button sx={submitButtonStyle} type="submit">
                            Submit
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
