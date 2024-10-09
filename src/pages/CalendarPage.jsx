import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import CalendarUI from '/src/Components/CalendarPage/CalendarUI';
import { fetchTasks, logoutUser } from '/src/LearnLeaf_Functions.jsx'
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import TopBar from '/src/pages/TopBar.jsx';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TaskFilterBar from './TaskFilterBar';


const CalendarView = () => {
    const { user, updateUser } = useUser();
    const [events, setEvents] = useState([]);
    const [filterCriteria, setFilterCriteria] = useState({
        searchQuery: '',
        priority: '',
        status: '',
        startDate: '',
        startDateComparison: '',
        dueDate: '',
        dueDateComparison: '',
        subject:'',
        project:''
    });

    const refreshTasks = async () => {
        if (user && user.id) {
            const tasks = await fetchTasks(user.id);
            const FilteredTasks = getFilteredTasks(tasks,filterCriteria);
            console.log({FilteredTasks});
            const tasksWithDueDates = FilteredTasks.filter(task => task.dueDate);
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
        console.log({filterCriteria});
        refreshTasks();
    }, [user?.id,filterCriteria]);

    const handleLogout = async () => {
        try {
            await logoutUser();
            updateUser(null);
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };


    const getFilteredTasks = (tasks, filterCriteria) => {
        return tasks.filter((task) => {
            const matchesSearchQuery = filterCriteria.searchQuery === '' || task.assignment.toLowerCase().includes(filterCriteria.searchQuery.toLowerCase());
            const matchesPriority = !filterCriteria.priority || task.priority === filterCriteria.priority;
            const matchesStatus = !filterCriteria.status || task.status === filterCriteria.status;
            const matchsSubject = !filterCriteria.subject || task.subject === filterCriteria.subject;
            const matchsProject = !filterCriteria.project || task.project === filterCriteria.project;

            let matchesStartDate = true;
            if (filterCriteria.startDateComparison === "none") {
                matchesStartDate = !task.startDate;
            } else if (filterCriteria.startDate) {
                matchesStartDate = filterByDate(task.startDate, filterCriteria.startDate, filterCriteria.startDateComparison);
            }

            let matchesDueDate = true;
            if (filterCriteria.dueDateComparison === "none") {
                matchesDueDate = !task.dueDate;
            } else if (filterCriteria.dueDate) {
                matchesDueDate = filterByDate(task.dueDate, filterCriteria.dueDate, filterCriteria.dueDateComparison);
            }

            return matchesSearchQuery && matchesPriority && matchesStatus && matchesStartDate && matchesDueDate && matchsSubject && matchsProject;
        });
    };

    const clearFilters = () => {
        setFilterCriteria({
            searchQuery: '',
            priority: '',
            status: '',
            startDate: '',
            startDateComparison: '',
            dueDate: '',
            dueDateComparison: '',
        });
    };

    return (
        <div className="view-container">

            <TopBar />

            <TaskFilterBar
                filterCriteria={filterCriteria}
                setFilterCriteria={setFilterCriteria}
                clearFilters={clearFilters}
            />
            <CalendarUI events={events} refreshTasks={refreshTasks} />
        </div>
    );
}

export default CalendarView;