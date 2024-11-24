import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { enUS } from 'date-fns/locale';
import parseISO from 'date-fns/parseISO';
import { deleteTask, formatDateDisplay, formatTimeDisplay } from '/src/LearnLeaf_Functions.jsx';
import { TaskEditForm } from '/src/Components/TaskView/EditForm.jsx'
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import { Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css';
import '/src/Components/FormUI.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const CalendarUI = ({ events, refreshTasks, subjects, projects }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editedTask, setEditedTask] = useState(null);

    const eventPropGetter = (event) => ({
        style: {
            backgroundColor: event.style?.backgroundColor || '#3174ad',
            color: 'white',
        },
    });

    const handleEventClick = (event) => {
        setSelectedEvent(event);
        setIsDialogOpen(true);
    };

    const handleSelectSlot = (slotInfo) => {
        setSelectedDate(format(slotInfo.start, 'yyyy-MM-dd'));
        setIsAddTaskFormOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
    };

    const handleEditClick = () => {
        setEditedTask(selectedEvent.task);
        setEditModalOpen(true);
        handleCloseDialog();
    };

    const handleDeleteClick = async () => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteTask(selectedEvent.task.taskId);
                refreshTasks();
                handleCloseDialog();
            } catch (error) {
                console.error("Error deleting task:", error);
            }
        }
    };

    return (
        <div style={{ height: 700, width: '95%', paddingTop: '20px', alignSelf: 'center', overflowY: 'auto' }}>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                views={['month', 'week', 'day']}
                step={1440}
                timeslots={1}
                style={{ height: 700 }}
                eventPropGetter={eventPropGetter}
                onSelectEvent={handleEventClick}
                selectable
                onSelectSlot={handleSelectSlot}
            />

            {isDialogOpen && selectedEvent && (
                <Dialog
                    open={isDialogOpen}
                    onClose={handleCloseDialog}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle 
                        variant='h5'
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingRight: '16px',
                            // color: '#8E5B9F',
                            // fontWeight: 'bold'
                        }}
                    >
                        Task Details
                        <IconButton
                            aria-label="close"
                            onClick={handleCloseDialog}
                            sx={{
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{ fontStyle: 'italic' }}>
                            {/* Title */}
                            {selectedEvent.title && (
                                <Typography variant="h6" 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        color: selectedEvent.task?.taskSubject?.subjectColor || 'defaultColor' }}>
                                    {selectedEvent.title}
                                </Typography>
                            )}

                            {/* Description */}
                            {selectedEvent.task?.taskDescription && (
                                <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                                    {selectedEvent.task.taskDescription}
                                </Typography>
                            )}

                            {/* Subject */}
                            {selectedEvent.task?.taskSubject?.subjectName && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Subject:</strong> {selectedEvent.task.taskSubject.subjectName}
                                </Typography>
                            )}

                            {/* Due Date */}
                            {selectedEvent.task?.taskDueDate && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Due Date:</strong> {formatDateDisplay(selectedEvent.task.taskDueDate)}
                                </Typography>
                            )}

                            {/* Due Time */}
                            {selectedEvent.task?.taskDueTime && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Due Time:</strong> {formatTimeDisplay(selectedEvent.task.taskDueTime)}
                                </Typography>
                            )}

                            {/* Project */}
                            {selectedEvent.task?.taskProject?.projectName && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Project:</strong> {selectedEvent.task.taskProject.projectName}
                                </Typography>
                            )}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 24px',
                        }}
                    >
                        <Tooltip title="Open Edit Window">
                            <EditIcon
                                onClick={handleEditClick}
                                sx={{
                                    color: '#9F6C5B',
                                    fontSize: 'xl',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '50%',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        backgroundColor: '#9F6C5B',
                                        color: '#fff',
                                    },
                                }}
                            />
                        </Tooltip>

                        <Tooltip title="Delete Task">
                            <IconButton
                                onClick={handleDeleteClick}
                                sx={{
                                    color: '#d1566e',
                                    fontSize: 'xl',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '50%',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        backgroundColor: '#d1566e',
                                        color: '#fff',
                                    },
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </DialogActions>

                </Dialog>

            )}

            {isEditModalOpen && editedTask && (
                <TaskEditForm
                    task={editedTask}
                    subjects={subjects}
                    projects={projects}
                    isOpen={isEditModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    onSave={() => {
                        refreshTasks();
                        setEditModalOpen(false);
                    }}
                />
            )}

            {isAddTaskFormOpen && (
                <AddTaskForm
                    isOpen={isAddTaskFormOpen}
                    onClose={() => setIsAddTaskFormOpen(false)}
                    onAddTask={() => refreshTasks()}
                    subjects={subjects}
                    projects={projects}
                    initialDueDate={selectedDate}
                />
            )}
        </div>
    );
};

export default CalendarUI;