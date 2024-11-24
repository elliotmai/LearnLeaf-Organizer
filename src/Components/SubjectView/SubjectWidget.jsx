import React, { useState } from 'react';
import { archiveSubject, deleteSubject } from '/src/LearnLeaf_Functions.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { EditSubjectForm } from './EditSubjectForm.jsx';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { Box, Typography, CardActions, Card, CardContent, Dialog, DialogTitle, DialogContent, Tooltip } from '@mui/material';

const SubjectWidget = ({ subject, refreshSubjects }) => {
    const [editedSubject, setEditedSubject] = useState({ ...subject });
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDescriptionOpen, setDescriptionOpen] = useState(false);

    const handleArchiveSubject = async () => {
        const confirmation = window.confirm("Archive this subject?\nThis will not delete any associated tasks.");
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
        const confirmation = window.confirm("Delete this subject?\nAssociated tasks won’t be grouped under this subject anymore.");
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
                    borderRadius: '16px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                    padding: '16px',
                    backgroundColor: '#f9f9f9',
                    border: `3px solid ${subject.subjectColor || '#355147'}`,
                }}
            >
                <CardContent>
                    <Tooltip title="View Associated Tasks">
                        <Link
                            href={`/subjects/${subject.subjectId}`}
                            underline="hover"
                            variant="h6"
                            sx={{
                                fontWeight: 'bold',
                                color: '#355147',
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': { color: '#5B8E9F' },
                            }}
                        >
                            {subject.subjectName}
                        </Link>
                    </Tooltip>

                    <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mt: 1, fontWeight: 'bold', color: '#9F6C5B' }}>
                        {subject.subjectSemester}
                    </Typography>

                    {subject.subjectDescription && (
                        <Tooltip title="Click to view full description">
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                onClick={() => setDescriptionOpen(true)}
                                sx={{
                                    fontStyle: 'italic',
                                    color: '#5B8E9F',
                                    whiteSpace: 'pre-wrap',
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    cursor: 'pointer',
                                    padding: '8px 0',
                                    textAlign: 'center',
                                    borderRadius: '8px',
                                    backgroundColor: '#f1f3f4',
                                }}
                            >
                                {subject.subjectDescription}
                            </Typography>
                        </Tooltip>
                    )}

                    <Dialog open={isDescriptionOpen} onClose={() => setDescriptionOpen(false)}>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '16px' }}>
                            Full Description
                            <IconButton onClick={() => setDescriptionOpen(false)} sx={{ color: 'grey.500' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                {subject.subjectDescription}
                            </Typography>
                        </DialogContent>
                    </Dialog>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', paddingX: 2 }}>
                    <Tooltip title="Edit Subject">
                        <IconButton
                            onClick={() => handleEditClick(subject)}
                            sx={{
                                color: '#9F6C5B',
                                '&:hover': { backgroundColor: '#9F6C5B', color: '#fff' },
                            }}
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Box>
                        <Button
                            size="small"
                            onClick={handleArchiveSubject}
                            sx={{
                                color: '#355147',
                                '&:hover': { backgroundColor: '#355147', color: '#fff' },
                            }}
                        >
                            Archive
                        </Button>
                        <Tooltip title="Delete Subject">
                            <IconButton
                                onClick={() => handleDeleteClick(subject.subjectId)}
                                sx={{
                                    color: '#F3161E',
                                    '&:hover': { backgroundColor: '#F3161E', color: '#fff' },
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </CardActions>
            </Card>
        </>
    );
};

export default SubjectWidget;