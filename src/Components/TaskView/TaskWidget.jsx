import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardActions, Button, Grid, TextField, Select, MenuItem, InputLabel, FormControl, Typography } from '@mui/material';
import { editTask, addSubject, addProject } from '/src/LearnLeaf_Functions.jsx';
import { debounce } from 'lodash';

const TaskWidget = ({ task, onDelete, subjects, projects }) => {
    const [formValues, setFormValues] = useState({ ...task });
    const [isNewSubject, setIsNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isNewProject, setIsNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    const handleTextFieldChange = useCallback(
        debounce((event) => {
            const { name, value } = event.target;
            setFormValues((prevDetails) => ({ ...prevDetails, [name]: value }));
        }, 300),
        []
    );

    const handleSelectChange = (event) => {
        const { name, value } = event.target;
        setFormValues((prevDetails) => ({ ...prevDetails, [name]: value }));
    };

    useEffect(() => {
        setFormValues({ ...task });
        setIsNewSubject(false);
        setNewSubjectName('');
        setIsNewProject(false);
        setNewProjectName('');
    }, [task]);

    const getValidSubject = () => subjects.some(subj => subj.subjectName === formValues.subject) ? formValues.subject : '';
    const getValidProject = () => projects.some(proj => proj.projectName === formValues.project) ? formValues.project : '';

    const getSubjectColor = () => {
        const selectedSubject = subjects.find(subj => subj.subjectName === formValues.subject);
        return selectedSubject ? selectedSubject.subjectColor : 'black';
    };

    const handleSave = async () => {
        try {
            let updatedTask = { ...formValues };

            if (isNewSubject && newSubjectName) {
                const newSubjectDetails = { userId: updatedTask.userId, subjectName: newSubjectName, semester: '', subjectColor: 'black' };
                await addSubject(newSubjectDetails);
                updatedTask.subject = newSubjectName;
            }

            if (isNewProject && newProjectName) {
                const newProjectDetails = { userId: updatedTask.userId, projectName: newProjectName, subject: '' };
                await addProject(newProjectDetails);
                updatedTask.project = newProjectName;
            }

            await editTask(updatedTask);
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    return (
        <Card sx={{ minWidth: 275 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: getSubjectColor(), fontWeight: 'bold' }}>
                    {formValues.assignment || 'Unnamed Task'}
                </Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Subject</InputLabel>
                            <Select
                                value={isNewSubject ? 'newSubject' : getValidSubject()}
                                name="subject"
                                onChange={handleSelectChange}
                            >
                                <MenuItem value="">Select Subject...</MenuItem>
                                {subjects.map(subj => (
                                    <MenuItem key={subj.subjectName} value={subj.subjectName}>
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
                                value={isNewProject ? 'newProject' : getValidProject()}
                                name="project"
                                onChange={handleSelectChange}
                            >
                                <MenuItem value="">Select Project...</MenuItem>
                                {projects.map(proj => (
                                    <MenuItem key={proj.projectName} value={proj.projectName}>
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
                                name="priority"
                                value={formValues.priority}
                                onChange={handleSelectChange}
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
                                name="status"
                                value={formValues.status}
                                onChange={handleSelectChange}
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
                            name="startDate"
                            type="date"
                            value={formValues.startDate}
                            onChange={handleTextFieldChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={6}>
                        <TextField
                            label="Deadline"
                            name="dueDate"
                            type="date"
                            value={formValues.dueDate}
                            onChange={handleTextFieldChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Time Due"
                            name="dueTime"
                            type="time"
                            value={formValues.dueTime}
                            onChange={handleTextFieldChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                </Grid>
            </CardContent>

            <CardActions>
                <Button
                    size="small"
                    onClick={handleSave}
                    variant="contained"
                    sx={{ backgroundColor: '#B6CDC8', color: '#355147', '&:hover': { backgroundColor: '#a8bdb8' }, mr: 2, ml: 1 }}
                >
                    Save
                </Button>

                <Button
                    size="small"
                    onClick={() => onDelete(task.taskId)}
                    variant="contained"
                    sx={{ backgroundColor: '#ff5252', color: '#fff', '&:hover': { backgroundColor: '#ff1744' } }}
                >
                    Delete
                </Button>
            </CardActions>
        </Card>
    );
};

// Use React.memo correctly to wrap TaskWidget
export default React.memo(TaskWidget);
