import React, { useState, useEffect } from 'react';
import format from 'date-fns/format';
import CalendarUI from '/src/Components/CalendarPage/CalendarUI';
import { useUser } from '/src/UserState.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { getAllFromStore } from '/src/db'; // Import IndexedDB helper functions
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '/src/Components/PageFormat.css';

const CalendarView = () => {
    const { user } = useUser();
    const [events, setEvents] = useState([]);
    const [subjects, setSubjects] = useState([]);  // Store active subjects
    const [projects, setProjects] = useState([]);  // Store active projects
    const [openAddTask, setOpenAddTask] = useState(false);
    const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentDate(format(new Date(), 'yyyy-MM-dd')); // Update current date every second
        }, 1000);
    
        return () => clearInterval(intervalId);
    }, []);

    // Function to refresh tasks, subjects, and projects from IndexedDB
    const refreshTasks = async () => {
        try {
            // Fetch all tasks, subjects, and projects from IndexedDB
            const allTasks = await getAllFromStore('tasks');
            const allSubjects = await getAllFromStore('subjects');
            const allProjects = await getAllFromStore('projects');

            // Filter active subjects and projects
            const activeSubjects = allSubjects.filter(subject => subject.subjectStatus === 'Active');
            const activeProjects = allProjects.filter(project => project.projectStatus === 'Active');

            // Filter tasks with due dates and format them as calendar events
            const tasksWithDueDates = allTasks.filter(task => task.taskDueDate);
            const formattedTasks = tasksWithDueDates.map(task => ({
                allDay: true,
                start: new Date(task.taskDueDate + 'T00:00:00'),
                end: new Date(task.taskDueDate + 'T23:59:59'),
                title: task.taskName,
                task: task,
                style: { 
                    backgroundColor: task.taskStatus === 'Completed' ? 'grey' : (task.taskSubject?.subjectColor || '#3174ad') // Grey if completed, else subject color
                }, // Default to grey if no subject color
            }));

            setEvents(formattedTasks);
            setSubjects(activeSubjects);
            setProjects(activeProjects);
        } catch (error) {
            console.error('Error loading data from IndexedDB:', error);
        }
    };

    useEffect(() => {
        if (user?.id) {
            refreshTasks();
        }
    }, [user?.id]);

    const toggleFormVisibility = () => {
        setOpenAddTask(!openAddTask);
    };

    const handleCloseAddTask = () => {
        setOpenAddTask(false);
    };

    return (
        <div className="view-container">
            <TopBar />
            <button className="fab" onClick={toggleFormVisibility}>
                +
            </button>
            <CalendarUI 
                events={events} 
                refreshTasks={refreshTasks}
                subjects={subjects} // Pass active subjects to CalendarUI
                projects={projects} // Pass active projects to CalendarUI
            />
            {openAddTask && (
                <AddTaskForm
                    isOpen={openAddTask}
                    onClose={handleCloseAddTask}
                    refreshTasks={refreshTasks}
                    initialDueDate={currentDate}
                    subjects={subjects}  // Pass active subjects to AddTaskForm
                    projects={projects}  // Pass active projects to AddTaskForm
                />
            )}
        </div>
    );
}

export default CalendarView;
