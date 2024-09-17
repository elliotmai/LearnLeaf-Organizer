// @flow
import React, { useState } from 'react';
import { archiveSubject, deleteSubject } from '/src/LearnLeaf_Functions.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { EditSubjectForm } from './EditSubjectForm.jsx';
import './SubjectDashboard.css';

const CustomIconButton = styled(IconButton)({
    '&:hover': {
        backgroundColor: '#9F6C5B',
    },
});

const ArchiveButton = styled(Button)(({ theme }) => ({
    backgroundColor: theme.palette.warning.main,
    color: '#fff',
    '&:hover': {
        backgroundColor: theme.palette.warning.dark,
    },
}));

const SubjectWidget = ({ subject, refreshSubjects }) => {
    const [editedSubject, setEditedSubject] = useState({
        subjectId: subject.id,
        ...subject,
    });
    const [isEditModalOpen, setEditModalOpen] = useState(false);

    const handleArchiveSubject = async () => {
        try {
            await archiveSubject(subject.id);
            console.log("Subject archived successfully.");
            refreshSubjects(); // Call refreshSubjects to update the dashboard
        } catch (error) {
            console.error("Error archiving subject:", error);
        }
    };

    const widgetStyle = {
        border: `3px solid ${subject.subjectColor}`,
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
    };

    const handleEditClick = (subject) => {
        setEditedSubject({ ...subject });
        setEditModalOpen(true); // Open the edit modal
    };

    const handleDeleteClick = async () => {
        const confirmation = window.confirm("Are you sure you want to delete this subject?\n(This will not delete any associated tasks.)");
        if (confirmation) {
            try {
                await deleteSubject(subject.id);
                refreshSubjects(); // Call this function to refresh the subjects in the parent component
            } catch (error) {
                console.error("Error deleting subject:", error);
            }
        }
    };

    return (
        <>
            <EditSubjectForm
                key={editedSubject.subjectId}
                subject={editedSubject}
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={() => {
                    setEditModalOpen(false);
                    refreshSubjects();
                }}
            />
            <Box style={widgetStyle} className="subject-widget">
                <Link
                    href={`/subjects/${subject.id}`}
                    underline="hover"
                    variant="h6"
                    color="inherit"
                    sx={{ color: '#355147', display: 'block', fontWeight: 'bold', marginBottom: '8px' }}
                >
                    {subject.subjectName}
                </Link>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                    {subject.semester}
                </Typography>

                <Box display="flex" justifyContent="flex-start" alignItems="center" gap={1}>
                    {subject.status === "Active" && (
                        <ArchiveButton
                            variant="contained"
                            onClick={handleArchiveSubject}
                            size="small"
                            sx={{ backgroundColor: '#B6CDC8', color: '#355147', '&:hover': { backgroundColor: '#a8bdb8' }, mr: 2, ml: 1 }}
                        >
                            Archive
                        </ArchiveButton>
                    )}

                    <CustomIconButton aria-label="edit" onClick={() => handleEditClick(subject)}>
                        <EditIcon />
                    </CustomIconButton>

                    <CustomIconButton aria-label="delete" onClick={() => handleDeleteClick(subject.subjectId)}>
                        <DeleteIcon />
                    </CustomIconButton>
                </Box>
            </Box>
        </>
    );
};

export default SubjectWidget;