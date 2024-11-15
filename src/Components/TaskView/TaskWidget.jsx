import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Button,
    Grid,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Tooltip,
    Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { editTask, addSubject, addProject, sortSubjects, sortProjects } from '/src/LearnLeaf_Functions.jsx';
import { TaskEditForm } from '/src/Components/TaskView/EditForm.jsx';
import './TaskView.css';

const TaskWidget = ({ task, onDelete, subjects = [], projects = [], onUpdateTask }) => {
    const [formValues, setFormValues] = useState({ ...task, taskSubject: task.taskSubject || 'None', taskProject: task.taskProject || 'None' });
    const [originalValues, setOriginalValues] = useState({ ...task });
    const [editedTask, setEditedTask] = useState({});
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [errors, setErrors] = useState({});
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isNewProject, setIsNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isDescriptionOpen, setDescriptionOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const isFieldUnsaved = (fieldName) => formValues[fieldName] !== originalValues[fieldName];

    useEffect(() => {
        // Warn user about unsaved changes when navigating away
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        const isNewItemSelected = value === "newSubject" || value === "newProject";

        if (name === "taskSubject") {
            setIsNewSubject(isNewItemSelected);
            setFormValues(prevDetails => ({
                ...prevDetails,
                taskSubject: isNewItemSelected ? 'None' : value,
            }));
        } else if (name === "taskProject") {
            setIsNewProject(isNewItemSelected);
            setFormValues(prevDetails => ({
                ...prevDetails,
                taskProject: isNewItemSelected ? 'None' : value,
            }));
        } else if (name === "taskDueTime" && value) {
            if (!formValues.taskDueDate) {
                setErrors(prevErrors => ({
                    ...prevErrors,
                    taskDueDate: 'Due date is required when due time is added.',
                }));
            } else {
                setErrors(prevErrors => ({ ...prevErrors, taskDueDate: '' }));
            }
        } else if (name === "taskDueDate") {
            setErrors(prevErrors => ({ ...prevErrors, taskDueDate: '' }));
        }

        if (!["taskSubject", "taskProject"].includes(name)) {
            setFormValues(prevDetails => ({ ...prevDetails, [name]: value }));
        }

        setHasUnsavedChanges(true);
    };

    useEffect(() => {
        setFormValues({ ...task, taskSubject: task.taskSubject || 'None', taskProject: task.taskProject || 'None' });
        setOriginalValues({ ...task });
        setIsNewSubject(false);
        setNewSubjectName('');
        setIsNewProject(false);
        setNewProjectName('');
    }, [task]);

    const handleSave = async () => {
        try {
            if (formValues.taskDueTime && !formValues.taskDueDate) {
                setErrors({ taskDueDate: 'Due date is required when due time is added.' });
                return;
            }

            let updatedTask = { ...formValues };

            // Add new subject if necessary
            if (isNewSubject && newSubjectName) {
                const newSubject = await addSubject({
                    subjectName: newSubjectName,
                    subjectSemester: '',
                    subjectDescription: '',
                    subjectColor: 'black',
                });
                updatedTask.taskSubject = newSubject.subjectId;
                formValues.taskSubject = updatedTask.taskSubject;
                setIsNewSubject(false);
                setNewSubjectName('');
            }

            // Add new project if necessary
            if (isNewProject && newProjectName) {
                const newProject = await addProject({
                    projectName: newProjectName,
                    projectDescription: '',
                    projectSubjects: [],
                });
                updatedTask.taskProject = newProject.projectId;
                formValues.taskProject = updatedTask.taskProject;
                setIsNewProject(false);
                setNewProjectName('');
            }

            // Call editTask with updated task
            const refreshedTask = await editTask(updatedTask);
            setTimeout(() => onUpdateTask(refreshedTask), 1);
            setOriginalValues(refreshedTask);
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleClearChanges = () => {
        setFormValues({ ...originalValues });
        setHasUnsavedChanges(false);
    };

    const handleEditClick = () => {
        setEditedTask({ ...formValues });
        setEditModalOpen(true);
    };

    return (
        <div style={{ position: 'relative' }}>
            <TaskEditForm
                key={editedTask.taskId}
                task={editedTask}
                subjects={subjects}
                projects={projects}
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={onUpdateTask}
            />
            <Card
                sx={{
                    minWidth: 275,
                    borderRadius: '12px',
                    boxShadow: 4,
                    backgroundColor: '#f9f9f9',
                    padding: '16px'
                }}
            >
                <CardContent>
                    {/* Task Name */}
                    <Typography
                        variant="h6"
                        sx={{
                            color: formValues.taskSubject?.subjectColor || '#355147',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                        }}
                    >
                        {formValues.taskName || 'Unnamed Task'}
                    </Typography>

                    {/* Subject */}
                    <Typography variant="body1" sx={{ color: '#355147', fontWeight: 'medium' }}>
                        Subject:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#907474', marginBottom: '8px' }}>
                        {formValues.taskSubject?.subjectName || 'No Subject'}
                    </Typography>

                    {/* Project */}
                    <Typography variant="body1" sx={{ color: '#355147', fontWeight: 'medium' }}>
                        Project:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#907474', marginBottom: '8px' }}>
                        {formValues.taskProject?.projectName || 'No Project'}
                    </Typography>

                    {/* Description */}
                    {task.taskDescription &&
                        <Tooltip title="Click to view full description">
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                onClick={() => setDescriptionOpen(true)}
                                sx={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    fontStyle: 'italic',
                                    textAlign: 'left',
                                    padding: '8px 0',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    color: '#5B8E9F',
                                }}
                            >
                                {formValues.taskDescription}
                            </Typography>
                        </Tooltip>
                    }

                    {/* Full Description Dialog */}
                    <Dialog open={isDescriptionOpen} onClose={() => setDescriptionOpen(false)}>
                        <DialogTitle
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingRight: '16px',
                            }}
                        >
                            Full Description
                            <IconButton onClick={() => setDescriptionOpen(false)} sx={{ color: 'grey.500' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent
                            dividers
                            sx={{
                                maxHeight: '400px', // Set your desired max height
                                overflowY: 'auto', // Enable vertical scrolling
                            }}
                        >
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                sx={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    fontStyle: 'italic',
                                }}
                            >
                                {formValues.taskDescription}
                            </Typography>
                        </DialogContent>

                    </Dialog>

                    <Divider sx={{ marginY: 2 }} />

                    {/* Editable Fields */}
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    value={formValues.taskPriority || 'Medium'}
                                    name="taskPriority"
                                    onChange={handleInputChange}
                                    sx={{
                                        backgroundColor: isFieldUnsaved('taskPriority') ? '#FFF4E5' : '#fff',
                                        borderRadius: 1
                                    }}
                                >
                                    <MenuItem value="High">High</MenuItem>
                                    <MenuItem value="Medium">Medium</MenuItem>
                                    <MenuItem value="Low">Low</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={formValues.taskStatus || 'Not Started'}
                                    name="taskStatus"
                                    onChange={handleInputChange}
                                    sx={{
                                        backgroundColor: isFieldUnsaved('taskStatus') ? '#FFF4E5' : '#fff',
                                        borderRadius: 1
                                    }}
                                >
                                    <MenuItem value="Not Started">Not Started</MenuItem>
                                    <MenuItem value="In Progress">In Progress</MenuItem>
                                    <MenuItem value="Completed">Completed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                            <TextField
                                label="Start Date"
                                name="taskStartDate"
                                type="date"
                                value={formValues.taskStartDate || ''}
                                onChange={handleInputChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    backgroundColor: isFieldUnsaved('taskStartDate') ? '#FFF4E5' : '#fff',
                                    borderRadius: 1
                                }}
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <TextField
                                label="Deadline"
                                name="taskDueDate"
                                type="date"
                                value={formValues.taskDueDate || ''}
                                onChange={handleInputChange}
                                error={!!errors.taskDueDate}
                                helperText={errors.taskDueDate}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    backgroundColor: isFieldUnsaved('taskDueDate') ? '#FFF4E5' : '#fff',
                                    borderRadius: 1
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Time Due"
                                name="taskDueTime"
                                type="time"
                                value={formValues.taskDueTime || ''}
                                onChange={handleInputChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    backgroundColor: isFieldUnsaved('taskDueTime') ? '#FFF4E5' : '#fff',
                                    borderRadius: 1
                                }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', paddingX: 2 }}>
                    <Button
                        size="small"
                        onClick={handleSave}
                        variant="contained"
                        sx={{
                            backgroundColor: '#B6CDC8',
                            color: '#355147',
                            '&:hover': { backgroundColor: '#A8BDB8', transform: 'scale(1.05)' },
                        }}
                    >
                        Save
                    </Button>
                    {hasUnsavedChanges && (
                        <Button
                            size="small"
                            onClick={handleClearChanges}
                            variant="outlined"
                            sx={{ color: '#F3161E', borderColor: '#F3161E', '&:hover': { backgroundColor: '#F3161E', color: '#fff' } }}
                        >
                            Clear Changes
                        </Button>
                    )}
                    <Tooltip title="Edit Task">
                        <EditIcon
                            onClick={handleEditClick}
                            sx={{
                                color: '#9F6C5B',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '50%',
                                '&:hover': { backgroundColor: '#9F6C5B', color: '#fff' },
                            }}
                        />
                    </Tooltip>
                    <div style={{ display: 'flex', alignItems: 'center' }}>

                        <Tooltip title="Delete Task">
                            <DeleteIcon
                                onClick={() => onDelete(task.taskId)}
                                sx={{
                                    color: '#F3161E',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '50%',
                                    marginLeft: 1,
                                    '&:hover': { backgroundColor: '#F3161E', color: '#fff' },
                                }}
                            />
                        </Tooltip>
                    </div>
                </CardActions>
            </Card>
        </div>
    );
};

export default React.memo(TaskWidget);