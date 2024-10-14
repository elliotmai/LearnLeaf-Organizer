import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import format from 'date-fns/format';
import CalendarUI from '/src/Components/CalendarPage/CalendarUI';
import { fetchTasks, logoutUser, formatDate } from '/src/LearnLeaf_Functions.jsx'
import { useUser } from '/src/UserState.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import { useNavigate } from 'react-router-dom';
import TopBar from '/src/pages/TopBar.jsx';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '/src/Components/PageFormat.css';

const CalendarView = () => {
    const { user, updateUser } = useUser();
    const [events, setEvents] = useState([]);
    const [openAddTask, setOpenAddTask] = useState(false);
    const [currentDate, setCurrentDate] = useState(formatDate(new Date()));

    useEffect(() => {
        const intervalId = setInterval(() => {
          setCurrentDate(formatDate(new Date()));
        }, 1000); // Update every second
    
        return () => clearInterval(intervalId);
      }, []);

    const refreshTasks = async () => {
        if (user && user.id) {
            const tasks = await fetchTasks(user.id);
            const tasksWithDueDates = tasks.filter(task => task.dueDate);
            const formattedTasks = tasksWithDueDates.map(task => ({
                allDay: true,
                start: new Date(task.dueDate + 'T00:00:00'),
                end: new Date(task.dueDate + 'T23:59:59'),
                title: task.assignment,
                task: task,
                style: { backgroundColor: task.subjectColor },
            }));
            setEvents(formattedTasks);
        }
    };

    useEffect(() => {
        refreshTasks();
    }, [user?.id]);

    const toggleFormVisibility = () => {
        console.log(currentDate);
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
            <CalendarUI events={events} refreshTasks={refreshTasks}/>
            {openAddTask && (
                <AddTaskForm
                    isOpen={openAddTask}
                    onClose={handleCloseAddTask}
                    refreshTasks={refreshTasks}
                    initialDueDate={currentDate}
                />
            )}
        </div>
    );
}

export default CalendarView;