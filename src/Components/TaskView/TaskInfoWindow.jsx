import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    IconButton,
    Box,
    Tooltip,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemButton,
    ListItemAvatar,
    Avatar,
    Checkbox,
    TextField,
    Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatDateDisplay, formatTimeDisplay } from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';

const TaskInfoWindow = ({ task, open, onClose, onEdit, onDelete }) => {
    const { user } = useUser();

    const SubtaskList = () => {
        const [tasks, setTasks] = useState(["Subtask 1", "Subtask 2"]); // Initial items
        const [newTask, setNewTask] = useState(""); // Input field state
    
        // Function to add a new task
        const handleAddTask = () => {
            if (newTask.trim() !== "") {
                setTasks([...tasks, newTask]); // Add new task to list
                setNewTask(""); // Clear input field
            }
        };
    
        return (
            <Box sx={{ maxWidth: 400, margin: "auto", textAlign: "center" }}>
                {/* List of Subtasks */}
                <List sx={{ paddingLeft: 0 }}>
                    {tasks.map((task, index) => (
                        <ListItem
                            key={index}
                            sx={{
                                border: "1px solid #ccc",
                                borderRadius: "8px",
                                marginBottom: "8px",
                                padding: "8px",
                            }}
                        >
                            <Checkbox edge="start" />
                            <ListItemText primary={task} />
                        </ListItem>
                    ))}
                </List>
    
                {/* Input Field & Add Button */}
                <Box sx={{ display: "flex", gap: 1, marginTop: 2 }}>
                    <TextField
                        fullWidth
                        label="New Subtask"
                        variant="outlined"
                        size="small"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleAddTask}>
                        Add
                    </Button>
                </Box>
            </Box>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                style: {
                    borderRadius: '16px',
                    backgroundColor: '#B6CDC8', // Opal
                    boxShadow: '0px 6px 15px rgba(0, 0, 0, 0.2)',
                    maxWidth: '420px',
                    width: '90%',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 20px',
                    backgroundColor: '#355147', // Mineral Green
                    color: '#FFFFFF',
                    borderRadius: '16px 16px 0 0',
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Task Details
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: '#FFFFFF',
                            '&:hover': { backgroundColor: '#5B8E9F' }, // Misty Blue
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent
                sx={{
                    padding: '16px',
                    backgroundColor: '#F9F9F9',
                }}
            >
                <Box sx={{ padding: '8px 16px' }}>
                    {[
                        { label: 'Task Name', value: task.taskName || 'Unnamed Task' },
                        {
                            label: 'Due Date',
                            value: task.taskDueDate
                                ? `${formatDateDisplay(
                                    task.taskDueDate,
                                    user.dateFormat
                                )}${task.taskDueTime
                                    ? ` at ${formatTimeDisplay(task.taskDueTime, user.timeFormat)}`
                                    : ''}`
                                : 'No Due Date Set',
                        },
                        {
                            label: 'Subject',
                            value: task.taskSubject?.subjectName || 'No Subject',
                        },
                        {
                            label: 'Subtasks',
                            value: <SubtaskList />,
                        },
                        {
                            label: 'Project',
                            value: task.taskProject?.projectName || 'No Project',
                        },
                        {
                            label: 'Description',
                            value: task.taskDescription || 'No Description',
                        },
                    ].map((field, index) => (
                        <Box key={index} sx={{ marginBottom: '16px' }}>
                            <Typography
                                variant="body1"
                                sx={{
                                    fontWeight: 'bold',
                                    color: '#355147', // Mineral Green
                                    marginBottom: '4px',
                                }}
                            >
                                {field.label}:
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#5D4037', // Soft brown tone
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {field.value}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 20px',
                    backgroundColor: '#FFFFFF', // Mineral Green
                    color: '355147',
                    borderRadius: '0px 0px 16px 16px',
                }}
            >
                {/* <Box sx={{ justifyContent: 'space-between', paddingX: 2 }}> */}
                <Tooltip title="Edit Task">
                    <IconButton
                        onClick={onEdit}
                        sx={{
                            color: '#9F6C5B', // Leather
                            padding: '6px',
                            borderRadius: '50%',
                            '&:hover': { backgroundColor: '#9F6C5B', color: '#FFFFFF' },
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete Task">
                    <IconButton
                        onClick={() => onDelete(task.taskId)}
                        sx={{
                            color: '#F3161E', // Scarlet
                            padding: '6px',
                            borderRadius: '50%',
                            '&:hover': { backgroundColor: '#F3161E', color: '#FFFFFF' },
                        }}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
                {/* </Box> */}

            </DialogActions>
        </Dialog>
    );
};

export default TaskInfoWindow;
