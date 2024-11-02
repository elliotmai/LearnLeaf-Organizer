import React, { useState, useEffect } from 'react';
import format from 'date-fns/format';
import CalendarUI from '/src/Components/CalendarPage/CalendarUI';
import { useUser } from '/src/UserState.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import { deleteTask, sortTasks } from '/src/LearnLeaf_Functions.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { getAllFromStore } from '/src/db.js';
import { Button, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '/src/Components/PageFormat.css';

const CalendarView = () => {
    const { user } = useUser();
    const [events, setEvents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        const intervalId = setInterval(() => {
            const localDate = new Date();
            const formattedDate = format(localDate, 'yyyy-MM-dd');
            setCurrentDate(formattedDate); // Updates current date in the local time zone
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    // Helper function to format a task for the calendar
    const formatTask = (task) => {

        return {
            allDay: true,
            start: new Date(task.taskDueDate + 'T00:00:00'),
            end: new Date(task.taskDueDate + (task.taskDueTime ? `T${task.taskDueTime}` : 'T23:59:59')),
            title: task.taskName,
            task: {
                ...task,
            },
            style: {
                backgroundColor: task.taskStatus === 'Completed' ? '#dedede' : (task.taskSubject?.subjectColor || '#3174ad')
            }
        };
    };

    const loadFromIndexedDB = async () => {
        try {
            const allSubjects = await getAllFromStore('subjects');
            const allProjects = await getAllFromStore('projects');
            const allTasks = await getAllFromStore('tasks');

            console.log('fetched tasks:', allTasks);

            const sortedTasks = allTasks.map(task => ({
                ...task,
                taskSubject: allSubjects.find(subject => subject.subjectId === task.taskSubject),
                taskProject: allProjects.find(project => project.projectId === task.taskProject)
            }));

            console.log('sortedTasks:', sortedTasks);

            const formattedEvents = sortedTasks.filter(task => task.taskDueDate).map(formatTask);

            console.log('formatted events:', formattedEvents);

            setEvents(formattedEvents);
            setSubjects(allSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)));
            setProjects(allProjects.sort((a, b) => a.projectName.localeCompare(b.projectName)));
        } catch (error) {
            console.error('Error loading data from IndexedDB:', error);
        }
    };

    useEffect(() => {
        if (user?.id) {
            loadFromIndexedDB();
        }
    }, [user?.id]);

    const toggleFormVisibility = () => {
        setIsAddTaskFormOpen(!isAddTaskFormOpen);
    };

    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
    };

    const handleAddTask = async (newTask) => {
        const formattedTask = formatTask(newTask);
        setEvents([...events, formattedTask]);
    };

    const handleDeleteTask = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);
                setEvents(prevEvents => prevEvents.filter(event => event.task.taskId !== taskId));
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const handleEditTask = async (updatedTask) => {
        const formattedUpdatedTask = formatTask(updatedTask);
        setEvents(prevEvents => prevEvents.map(event =>
            event.task.taskId === updatedTask.taskId ? formattedUpdatedTask : event
        ));
    };

    return (
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TopBar />
            <Grid container direction="column" alignItems="center" justifyItems="center" width="100%">
                <Button
                    onClick={toggleFormVisibility}
                    variant="outlined"
                    startIcon={<AddIcon />}
                    sx={{
                        color: '#355147',
                        borderColor: '#355147',
                        marginTop: 2,
                        '&:hover': {
                            backgroundColor: '#355147',
                            color: '#fff',
                        },
                    }}
                >
                    Add New Task
                </Button>
            </Grid>
            <CalendarUI
                events={events}
                refreshTasks={loadFromIndexedDB}
                subjects={subjects}
                projects={projects}
            />
            {isAddTaskFormOpen && (
                <AddTaskForm
                    isOpen={isAddTaskFormOpen}
                    onClose={handleCloseAddTaskForm}
                    onAddTask={handleAddTask}
                    subjects={subjects}
                    projects={projects}
                    initialDueDate={currentDate}
                />
            )}
        </div>
    );
};

export default CalendarView;
