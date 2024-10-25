import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardActions, Button, Grid, TextField, Select, MenuItem, InputLabel, FormControl, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { editTask, addSubject, addProject } from '/src/LearnLeaf_Functions.jsx';
import { TaskEditForm } from '/src/Components/TaskView/EditForm.jsx';
import './TaskView.css';

const TaskWidget = ({ task, onDelete, subjects = [], projects = [], refreshTasks, onUpdateTask }) => {
    const [formValues, setFormValues] = useState({ ...task });
    const [originalValues, setOriginalValues] = useState({ ...task });
    const [editedTask, setEditedTask] = useState({});
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isNewProject, setIsNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    const hasUnsavedChanges = () => JSON.stringify(formValues) !== JSON.stringify(originalValues);

    const isFieldUnsaved = (fieldName) => formValues[fieldName] !== originalValues[fieldName];

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormValues((prevValues) => ({ ...prevValues, [name]: value }));
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

    const handleDateChange = (event, field) => {
        const value = event.target.value || '';
        setFormValues((prevValues) => ({ ...prevValues, [field]: value }));
    };

    const handleTimeFieldChange = (event) => {
        const { name, value } = event.target;
        setFormValues((prevDetails) => ({ ...prevDetails, [name]: value }));
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
            let updatedTask = { ...formValues };

            if (isNewSubject && newSubjectName) {
                const newSubjectDetails = {
                    subjectName: newSubjectName,
                    subjectSemester: '',
                    subjectDescription: '',
                    subjectColor: 'black',
                };
                const addedSubject = await addSubject(newSubjectDetails);
                updatedTask.taskSubject = addedSubject.subjectId;
                await refreshTasks();
            }

            if (isNewProject && newProjectName) {
                const newProjectDetails = {
                    projectName: newProjectName,
                    projectDescription: '',
                    projectSubjects: [],
                };
                const addedProject = await addProject(newProjectDetails);
                updatedTask.taskProject = addedProject.projectId;
                await refreshTasks();
            }

            const refreshedTask = await editTask(updatedTask);
            onUpdateTask(refreshedTask);
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
                                    onChange={handleSelectChange}
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
                                    onChange={handleSelectChange}
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
                                    onChange={handleSelectChange}
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
                                    onChange={handleSelectChange}
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
                                onChange={(e) => handleDateChange(e, 'taskStartDate')}
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
                                onChange={(e) => handleDateChange(e, 'taskDueDate')}
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
                                onChange={handleTimeFieldChange}
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
                                '&:hover': { backgroundColor: '#a8bdb8' },
                                mr: 3,
                                ml: 1,
                            }}
                        >
                            Save
                        </Button>

                        <EditIcon
                            onClick={handleEditClick}
                            sx={{
                                color: '#9F6C5B',
                                fontSize: 'xl',
                                cursor: 'pointer',
                            }}
                        />
                    </div>

                    <Button
                        size="small"
                        onClick={() => onDelete(task.taskId)}
                        variant="contained"
                        sx={{
                            backgroundColor: '#ff5252',
                            color: '#fff',
                            '&:hover': { backgroundColor: '#ff1744' },
                        }}
                    >
                        Delete
                    </Button>
                </CardActions>
            </Card>
        </div>
    );
};

export default React.memo(TaskWidget);