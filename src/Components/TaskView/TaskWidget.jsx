import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardActions, Button, Grid, TextField, Select, MenuItem, InputLabel, FormControl, Typography, Dialog, DialogTitle, DialogContent } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';
import { editTask, addSubject, addProject, sortSubjects, sortProjects } from '/src/LearnLeaf_Functions.jsx';
import { TaskEditForm } from '/src/Components/TaskView/EditForm.jsx';
import './TaskView.css';

const TaskWidget = ({ task, onDelete, subjects = [], projects = [], onUpdateTask}) => {
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

    const isFieldUnsaved = (fieldName) => formValues[fieldName] !== originalValues[fieldName];

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
        } catch (error) {
            console.error('Error updating task:', error);
        }
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

            <Card sx={{ minWidth: 275 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ color: formValues.taskSubject?.subjectColor, fontWeight: 'bold' }}>
                        {formValues.taskName || 'Unnamed Task'}
                    </Typography>
                    <Tooltip title="Click to view more">
                        <Typography
                            variant="body2"
                            color="textSecondary"
                            onClick={() => setDescriptionOpen(true)}
                            gutterBottom
                            sx={{
                                whiteSpace: 'pre-wrap',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                padding: '8px',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {formValues.taskDescription}
                        </Typography>
                    </Tooltip>

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
                                {formValues.taskDescription}
                            </Typography>
                        </DialogContent>
                    </Dialog>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Subject</InputLabel>
                                <Select
                                    value={isNewSubject ? 'newSubject' : formValues.taskSubject?.subjectId || formValues.taskSubject}
                                    name="taskSubject"
                                    onChange={handleInputChange}
                                    className={isFieldUnsaved('taskSubject') ? 'unsaved-bg' : ''}
                                >
                                    <MenuItem key="None" value="None">Select Subject...</MenuItem>
                                    {subjects
                                        .filter((subj) =>
                                            (subj.subjectStatus === "Active" ||
                                            subj.subjectId === (formValues.taskSubject?.subjectId || formValues.taskSubject)) &&
                                            subj.subjectId !== "None"
                                        )
                                        .map((subj) => (
                                            <MenuItem key={subj.subjectId} value={subj.subjectId}>
                                                {subj.subjectName}
                                            </MenuItem>
                                        ))}

                                    <MenuItem value="newSubject">Add New Subject...</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {isNewSubject && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="New Subject Name"
                                    name="newSubjectName"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                />
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Project</InputLabel>
                                <Select
                                    value={isNewProject ? 'newProject' : formValues.taskProject?.projectId || formValues.taskProject}
                                    name="taskProject"
                                    onChange={handleInputChange}
                                    className={isFieldUnsaved('taskProject') ? 'unsaved-bg' : ''}
                                >
                                    <MenuItem key="None" value="None">Select Project...</MenuItem>
                                    {projects
                                        .filter((
                                            (proj) => proj.projectStatus === "Active" ||
                                            proj.projectId === (formValues.taskProject?.projectId || formValues.taskProject) &&
                                            proj.projectId !== "None")
                                        )
                                        .map((proj) => (
                                            <MenuItem key={proj.projectId} value={proj.projectId}>
                                                {proj.projectName}
                                            </MenuItem>
                                        ))}
                                    <MenuItem value="newProject">Add New Project...</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {isNewProject && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="New Project Name"
                                    name="newProjectName"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                />
                            </Grid>
                        )}

                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    value={formValues.taskPriority || 'Medium'}
                                    name="taskPriority"
                                    onChange={handleInputChange}
                                    className={isFieldUnsaved('taskPriority') ? 'unsaved-bg' : ''}
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
                                    className={isFieldUnsaved('taskStatus') ? 'unsaved-bg' : ''}
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
                                className={isFieldUnsaved('taskStartDate') ? 'unsaved-bg' : ''}
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
                                className={isFieldUnsaved('taskDueDate') ? 'unsaved-bg' : ''}
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
                                className={isFieldUnsaved('taskDueTime') ? 'unsaved-bg' : ''}
                            />
                        </Grid>
                    </Grid>
                </CardContent>

                <CardActions
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingRight: 2,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            size="small"
                            onClick={handleSave}
                            variant="contained"
                            sx={{
                                backgroundColor: '#B6CDC8',
                                color: '#355147',
                                '&:hover': {
                                    backgroundColor: '#a8bdb8',
                                    transform: 'scale(1.03)',
                                },
                                mr: 3,
                                ml: 1,
                            }}
                        >
                            Save
                        </Button>
                        <Tooltip title="Open Edit Window">
                            <EditIcon
                                onClick={handleEditClick}
                                sx={{
                                    color: '#9F6C5B',
                                    fontSize: 'xl',
                                    cursor: 'pointer',
                                    padding: '6px',          // Add padding to give space within the circle
                                    borderRadius: '50%',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        backgroundColor: '#9F6C5B',
                                        color: '#fff',
                                    },
                                }}
                            />
                        </Tooltip>
                    </div>
                    <Tooltip title="Delete Task">
                        <DeleteIcon
                            onClick={() => onDelete(task.taskId)}
                            sx={{
                                color: '#d1566e',
                                fontSize: 'xl',
                                cursor: 'pointer',
                                padding: '6px',          // Add padding to give space within the circle
                                borderRadius: '50%',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    backgroundColor: '#d1566e',
                                    color: '#fff',
                                },
                            }}
                        />
                    </Tooltip>
                </CardActions>
            </Card>
        </div>
    );
};

export default React.memo(TaskWidget);