import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { archiveSubject, deleteSubject, blockSubject } from '/src/LearnLeaf_Functions.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { EditSubjectForm } from './EditSubjectForm.jsx';
import SubjectInfoWindow from './SubjectInfoWindow.jsx';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { Box, Typography, CardActions, FormControlLabel, Card, Checkbox, CardContent, Dialog, DialogTitle, DialogContent, Tooltip, DialogActions } from '@mui/material';

const SubjectWidget = ({ subject, refreshSubjects, selectedSubjects, toggleSubjectSelection, subjectIndex, subjects }) => {
    const navigate = useNavigate();

    const [editedSubject, setEditedSubject] = useState({ ...subject });
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isInfoOpen, setInfoOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const handleArchiveSubject = async () => {
        const confirmation = window.confirm("Archive this subject?\nThis will not delete any associated tasks.");
        if (confirmation) {
            try {
                await archiveSubject(subject.subjectId);
                refreshSubjects(); // Call refreshSubjects to update the dashboard
            } catch (error) {
                console.error("Error archiving subject:", error);
            }
        }
    };

    const handleEditClick = (subject) => {
        setEditedSubject({ ...subject });
        setEditModalOpen(true); // Open the edit modal
    };

    const handleDeleteClick = () => {
        setDeleteModalOpen(true); // Open the delete confirmation modal
    };

    const handleDeleteAction = async (blocked) => {
        setDeleteModalOpen(false);
        try {
            if (blocked) {
                await blockSubject(subject.subjectId);
            }
            else {
                await deleteSubject(subject.subjectId);
            }
            refreshSubjects(); // Call to refresh subjects
        } catch (error) {
            console.error(`Error ${blocked ? 'deleting and blocking' : 'deleting'} subject:`, error);
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
            <SubjectInfoWindow
                subject={subject}
                open={isInfoOpen}
                onClose={() => setInfoOpen(false)}
                onEdit={() => handleEditClick(subject)}
                onDelete={() => handleDeleteClick()}
            />
            <Card
                sx={{
                    position: 'relative',
                    borderRadius: '16px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                    padding: '16px',
                    backgroundColor: '#f9f9f9',
                    border: `3px solid ${subject.subjectColor || '#355147'}`,
                }}
            >

                <Box position="absolute" top={8} right={8}>
                    <IconButton
                        onClick={() => setInfoOpen(true)}
                        sx={{
                            color: '#355147',
                            '&:hover': { color: '#5B8E9F' },
                        }}
                    >
                        <Tooltip title="View Info">
                            <SearchIcon />
                        </Tooltip>
                    </IconButton>
                </Box>

                <Box display={"flex"}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={selectedSubjects.includes(subjects[subjectIndex].subjectId)}
                                onChange={() => toggleSubjectSelection(subjects[subjectIndex].subjectId)}
                            />
                        }

                    />
                </Box>
                <CardContent>

                    <Tooltip title="View Associated Tasks">
                        <Typography
                            variant="h6"
                            onClick={() => navigate(`/subjects/${subject.subjectId}`)}
                            sx={{
                                fontWeight: 'bold',
                                color: '#355147',
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': { color: '#5B8E9F' },
                            }}
                        >
                            {subject.subjectName}
                        </Typography>
                    </Tooltip>

                    <Typography 
                        variant="body2" 
                        color="textSecondary" 
                        gutterBottom 
                        sx={{ 
                            mt: 1, 
                            fontWeight: 'bold', 
                            color: '#9F6C5B',
                            whiteSpace: 'pre-wrap',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical'
                             }}>
                        {subject.subjectSemester}
                    </Typography>

                    {subject.subjectDescription && (
                        <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{
                                fontStyle: 'italic',
                                color: '#5B8E9F',
                                whiteSpace: 'pre-wrap',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                padding: '8px 0',
                                textAlign: 'center',
                                borderRadius: '8px',
                                backgroundColor: '#f1f3f4',
                            }}
                        >
                            {subject.subjectDescription}
                        </Typography>
                    )}
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
                                onClick={handleDeleteClick}
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

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', pb: 0 }}>
                    Confirm Deletion
                </DialogTitle>
                <DialogContent sx={{ pt: 2, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        What action would you like to take for this subject?
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Delete</strong>: This will delete the subject and unlink all associated tasks and projects.
                    </Typography>
                    <Typography variant="body2">
                        <strong>Delete and Block</strong>: This will also prevent the subject from being reloaded from your school.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteAction(false)} // Normal delete
                        sx={{ px: 3 }}
                    >
                        Delete
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => handleDeleteAction(true)} // Delete and block
                        sx={{ px: 3 }}
                    >
                        Delete and Block
                    </Button>
                    <Button
                        variant="outlined"
                        color="success"
                        onClick={() => setDeleteModalOpen(false)}
                        sx={{ px: 3 }}
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SubjectWidget;