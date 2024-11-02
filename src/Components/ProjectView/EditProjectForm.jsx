import React, { useState } from 'react';
import { editProject, addSubject } from '/src/LearnLeaf_Functions.jsx';
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

// Styles
const boxStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 500,
    bgcolor: 'background.paper',
    boxShadow: 24,
    pt: 2,
    pb: 3,
    px: 4,
    borderRadius: '12px',
};

const submitButtonStyle = {
    backgroundColor: '#B6CDC8',
    color: '#355147',
    '&:hover': {
        backgroundColor: '#A8BDB8',
        transform: 'scale(1.03)',
    },
};

const cancelButtonStyle = {
    color: '#ff5252',
    marginLeft: 1,
    '&:hover': {
        color: '#fff',
        backgroundColor: '#ff5252',
    },
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ color: "#8E5B9F", fontWeight: 'bold' }}>
                        Edit Project
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: 'grey.600' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <form noValidate autoComplete="off" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Project Name"
                        name="projectName"
                        value={formValues.projectName}
                        onChange={(e) => setFormValues({ ...formValues, projectName: e.target.value })}
                        required
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
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
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />

                    {formValues.projectSubjects.map((projectSubject, index) => (
                        <FormControl fullWidth margin="normal" key={index}>
                            <InputLabel id={`subject-select-label-${index}`}>Subject</InputLabel>
                            <Select
                                labelId={`subject-select-label-${index}`}
                                id={`subject-select-${index}`}
                                value={projectSubject.subjectId || projectSubject || 'None'}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                                sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                            >
                                <MenuItem value="None">Select Subject...</MenuItem>
                                {subjects
                                    .filter((subject) =>
                                        (subject.subjectStatus === 'Active' || subject.subjectId === projectSubject.subjectId) &&
                                        subject.subjectId !== 'None'
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
                            sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                        />
                    )}

                    <Button
                        variant="text"
                        onClick={addSubjectDropdown}
                        style={{
                            color: '#8E5B9F',
                            fontWeight: 'bold',
                            backgroundColor: 'transparent'
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
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
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
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button sx={submitButtonStyle} type="submit">
                            Save Changes
                        </Button>
                        <Button sx={cancelButtonStyle} onClick={onClose}>
                            Cancel
                        </Button>
                    </Box>
                </form>
            </Box>
        </Modal>
    );
};