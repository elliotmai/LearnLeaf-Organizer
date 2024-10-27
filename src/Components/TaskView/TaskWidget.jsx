import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardActions, Button, Grid, TextField, Select, MenuItem, InputLabel, FormControl, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';
import { editTask, addSubject, addProject, sortSubjects, sortProjects } from '/src/LearnLeaf_Functions.jsx';
import { TaskEditForm } from '/src/Components/TaskView/EditForm.jsx';
import './TaskView.css';

const TaskWidget = ({ task, onDelete, subjects = [], projects = [], onUpdateTask }) => {
    const [formValues, setFormValues] = useState({ ...task });
    const [originalValues, setOriginalValues] = useState({ ...task });
    const [editedTask, setEditedTask] = useState({});
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [errors, setErrors] = useState({});
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isNewProject, setIsNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

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

    const handleSelectChange = (event) => {
        const { name, value } = event.target;

        if (name === 'taskSubject') {
            setIsNewSubject(value === 'newSubject');
        }
        if (name === 'taskProject') {
            setIsNewProject(value === 'newProject');
        }
        setFormValues((prevValues) => ({ ...prevValues, [name]: value }));
    };

    useEffect(() => {
        setFormValues({ ...task });
        setOriginalValues({ ...task });
        setIsNewSubject(false);
        setNewSubjectName('');
        setIsNewProject(false);
        setNewProjectName('');
    }, [task]);

    const handleSave = async () => {
        try {

            if (formValues.taskDueTime && !formValues.taskDueDate) {
                setErrors(prevErrors => ({
                    ...prevErrors,
                    taskDueDate: 'Due date is required when due time is added.',
                }));
                return;
            }

            let updatedTask = { ...formValues };

            if (isNewSubject && newSubjectName) {
                const newSubjectDetails = {
                    subjectName: newSubjectName,
                    subjectSemester: '',
                    subjectDescription: '',
                    subjectColor: 'black',
                };
                const addedSubject = await addSubject(newSubjectDetails);
                const sortedSubjects = sortSubjects([...subjects, addedSubject]);
                subjects = sortedSubjects;
                updatedTask.taskSubject = addedSubject.subjectId;
            }

            if (isNewProject && newProjectName) {
                const newProjectDetails = {
                    projectName: newProjectName,
                    projectDescription: '',
                    projectSubjects: [],
                };
                const addedProject = await addProject(newProjectDetails);
                const sortedProjects = sortProjects([...projects, addedProject]);
                projects = sortedProjects;
                updatedTask.taskProject = addedProject.projectId;
            }

            const refreshedTask = await editTask(updatedTask);
            onUpdateTask(formValues);
            setOriginalValues(refreshedTask);
            if (isEditModalOpen) {
                setEditModalOpen(false);
            }
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
                    <Typography variant="h6" gutterBottom sx={{ color: formValues.taskSubject?.subjectColor, fontWeight: 'bold' }}>
                        {formValues.taskName || 'Unnamed Task'}
                    </Typography>

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
                                    <MenuItem value="None">Select Subject...</MenuItem>
                                    {subjects.map((subj) => (
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
                                    <MenuItem value="None">Select Project...</MenuItem>
                                    {projects.map((proj) => (
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