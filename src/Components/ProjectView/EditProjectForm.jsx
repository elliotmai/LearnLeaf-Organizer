import React, { useState, useEffect } from 'react';
import { editProject, addSubject } from '/src/LearnLeaf_Functions.jsx';
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

export const EditProjectForm = ({ project, subjects, isOpen, onClose, onSave }) => {
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [formValues, setFormValues] = useState({
        ...project,
        projectSubjects: project.projectSubjects || ['None'],
        projectDueDateInput: project.projectDueDate || '',
        projectDueTimeInput: project.projectDueTime || ''
    });

    const handleInputChange = (index, value) => {
        const updatedSubjects = [...formValues.projectSubjects];
        updatedSubjects[index] = value || 'None';
        setFormValues({ ...formValues, projectSubjects: updatedSubjects });

        if (value === "newSubject") {
            setIsNewSubject(true);
        } else {
            setIsNewSubject(false);
        }
    };

    const addSubjectDropdown = () => {
        setFormValues({
            ...formValues,
            projectSubjects: [...formValues.projectSubjects, 'None'],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Remove "None" from the selected subjects
        const filteredSubjects = formValues.projectSubjects.filter(subject => subject !== 'None');

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

        await editProject({ ...formValues, projectSubjects: filteredSubjects });
        onClose();
        await onSave(); // Refresh the project list
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
                        onChange={(e) => setFormValues({ ...formValues, projectName: e.target.value })}
                        required
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Description"
                        name="projectDescription"
                        value={formValues.projectDescription}
                        onChange={(e) => setFormValues({ ...formValues, projectDescription: e.target.value })}
                        multiline
                        maxRows={4}
                    />

                    {/* Multiple Subject Dropdowns */}
                    {formValues.projectSubjects.map((projectSubject, index) => (
                        <FormControl fullWidth margin="normal" key={index}>
                            <InputLabel id={`subject-select-label-${index}`}>Subject</InputLabel>
                            <Select
                                labelId={`subject-select-label-${index}`}
                                id={`subject-select-${index}`}
                                value={projectSubject.subjectId || projectSubject || 'None'}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                            >
                                <MenuItem value="None">Select Subject...</MenuItem>
                                {subjects
                                    .filter((subject) => 
                                        (subject.subjectStatus === 'Active' ||
                                        subject.subjectId === projectSubject.subjectId) &&
                                        subject.subjectId !== "None"
                                    )
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
                        value={formValues.projectDueDate}
                        onChange={(e) => setFormValues({ ...formValues, projectDueDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Time Due"
                        name="projectDueTimeInput"
                        type="time"
                        value={formValues.projectDueTime}
                        onChange={(e) => setFormValues({ ...formValues, projectDueTime: e.target.value })}
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
