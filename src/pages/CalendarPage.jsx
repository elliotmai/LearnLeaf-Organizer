import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import CalendarUI from '/src/Components/CalendarPage/CalendarUI';
import { fetchTasks, logoutUser } from '/src/LearnLeaf_Functions.jsx'
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import TopBar from '/src/pages/TopBar.jsx';
import 'react-big-calendar/lib/css/react-big-calendar.css';


const CalendarView = () => {
    const { user, updateUser } = useUser();
    const [events, setEvents] = useState([]);

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

    const handleLogout = async () => {
        try {
            await logoutUser();
            updateUser(null);
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="view-container">
            <TopBar />
            <CalendarUI events={events} refreshTasks={refreshTasks}/>
        </div>
    );
}

export default CalendarView;