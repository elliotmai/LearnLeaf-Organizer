import React, { useEffect, useState } from 'react';
import { archiveSubject, deleteSubject } from '/src/LearnLeaf_Functions.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { Box, Typography, CardActions, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { styled } from '@mui/material/styles';
import { EditSubjectForm } from './EditSubjectForm.jsx';
import './SubjectDashboard.css';
// import '/src/Components/TaskView/TaskView.css';

const CustomIconButton = styled(IconButton)({
    color: '#9F6C5B'
});

const SubjectWidget = ({ subject, refreshSubjects }) => {
    const [editedSubject, setEditedSubject] = useState({ ...subject });
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDescriptionOpen, setDescriptionOpen] = useState(false);

    const handleArchiveSubject = async () => {
        const confirmation = window.confirm("Are you sure you want to archive this subject?\nThis will mark all outstanding tasks as Completed.");
        if (confirmation) {
            try {
                await archiveSubject(subject.subjectId);
                console.log("Subject archived successfully.");
                refreshSubjects(); // Call refreshSubjects to update the dashboard
            } catch (error) {
                console.error("Error archiving subject:", error);
            }
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
                await deleteSubject(subject.subjectId);
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
            <Card
                sx={{
                    border: '3px solid', // Add border style to make it visible
                    borderRadius: '8px',
                    borderColor: subject.subjectColor // Use dynamic color value
                }}
            >
                <CardContent>
                    <Link
                        href={`/subjects/${subject.subjectId}`}
                        underline="hover"
                        variant="h6"
                        color="inherit"
                        sx={{
                            color: '#355147',
                            display: 'block',
                            fontWeight: 'bold',
                            fontSize: '22px'
                        }}
                        gutterBottom
                    >
                        {subject.subjectName}
                    </Link>

                    <Typography
                        variant="body1"
                        color="textPrimary"
                    >
                        {subject.subjectSemester}
                    </Typography>

                    {/* Description Typography with ellipsis and click event to expand */}
                    <Typography
                        variant="body2"
                        color="textSecondary"
                        onClick={() => setDescriptionOpen(true)}
                        sx={{
                            whiteSpace: 'pre-wrap',
                            fontStyle: 'italic',
                            textAlign: 'left',
                            padding: '8px',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {subject.subjectDescription}
                    </Typography>

                    {/* Dialog to show full description */}
                    <Dialog
                        open={isDescriptionOpen}
                        onClose={() => setDescriptionOpen(false)}
                        aria-labelledby="description-dialog-title"
                    >
                        <DialogTitle
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingRight: '16px'
                            }}
                        >
                            Full Description
                            <IconButton
                                aria-label="close"
                                onClick={() => setDescriptionOpen(false)}
                                sx={{
                                    color: (theme) => theme.palette.grey[500],
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                sx={{
                                    whiteSpace: 'pre-wrap',
                                    fontStyle: 'italic',
                                }}
                            >
                                {subject.subjectDescription}
                            </Typography>
                        </DialogContent>
                    </Dialog>
                </CardContent>

                <CardActions
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    {/* Edit Button on the far left */}
                    <CustomIconButton
                        aria-label="edit"
                        onClick={() => handleEditClick(subject)}
                    >
                        <EditIcon
                            fontSize="medium"
                        />
                    </CustomIconButton>

                    {/* Grouping Archive and Delete buttons on the right */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            size="small"
                            onClick={handleArchiveSubject}
                            variant="contained"
                            sx={{
                                backgroundColor: '#B6CDC8',
                                color: '#355147',
                                '&:hover': { backgroundColor: '#a8bdb8' },
                                mr: 1 // Reduce the margin to make them closer
                            }}
                        >
                            Archive
                        </Button>

                        <CustomIconButton
                            aria-label="delete"
                            onClick={() => handleDeleteClick(subject.subjectId)}
                        >
                            <DeleteIcon
                                fontSize="medium"
                            />
                        </CustomIconButton>
                    </div>
                </CardActions>
            </Card>
        </>
    );
};

export default SubjectWidget;
