import React, { useState } from 'react';
import { addSubject } from '/src/LearnLeaf_Functions.jsx';
import {
    Modal,
    Box,
    TextField,
    Button,
    Typography,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ChromePicker } from 'react-color';

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

export function AddSubjectForm({ isOpen, onClose, refreshSubjects }) {
    const [subjectDetails, setSubjectDetails] = useState({
        subjectName: '',
        subjectSemester: '',
        subjectDescription: '',
        subjectColor: 'black',
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSubjectDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleColorChange = (color) => {
        setSubjectDetails(prev => ({ ...prev, subjectColor: color.hex }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addSubject(subjectDetails);
        onClose(); // Close the form
        await refreshSubjects(); // Refresh the subjects list to reflect the new addition
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box sx={boxStyle}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ color: "#8E5B9F", fontWeight: 'bold' }}>
                        Add a New Subject
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: 'grey.600' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        margin="normal"
                        id="subjectName"
                        name="subjectName"
                        label="Subject Name"
                        value={subjectDetails.subjectName}
                        onChange={handleInputChange}
                        required
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        id="semester"
                        name="subjectSemester"
                        label="Semester"
                        value={subjectDetails.subjectSemester}
                        onChange={handleInputChange}
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Description"
                        name="subjectDescription"
                        value={subjectDetails.subjectDescription}
                        onChange={handleInputChange}
                        multiline
                        maxRows={4}
                        sx={{ backgroundColor: '#F9F9F9', borderRadius: 1 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <ChromePicker
                            color={subjectDetails.subjectColor}
                            onChangeComplete={handleColorChange}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                        <Button sx={submitButtonStyle} type="submit" variant="contained">
                            Add Subject
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