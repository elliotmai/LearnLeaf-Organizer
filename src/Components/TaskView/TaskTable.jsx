import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import debounce from 'lodash.debounce';  // Import debounce
import { deleteTask, fetchProjects, fetchSubjects } from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';
import Grid from '@mui/material/Grid';
import TaskWidget from '/src/Components/TaskView/TaskWidget.jsx';
import './TaskView.css';

const TasksTable = ({ tasks: initialTasks, refreshTasks, onDelete }) => {
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filterCriteria, setFilterCriteria] = useState({
        searchQuery: '',
        priority: '',
        status: '',
        startDate: '',
        startDateComparison: '',
        dueDate: '',
        dueDateComparison: '',
    });

    const { user } = useUser();

    useEffect(() => {
        const loadSubjectsAndProjects = async () => {
            try {
                const fetchedSubjects = await fetchSubjects(user.id);
                const fetchedProjects = await fetchProjects(user.id);
                setSubjects(fetchedSubjects);
                setProjects(fetchedProjects);
            } catch (error) {
                console.error('Error fetching subjects or projects:', error);
            }
        };

        loadSubjectsAndProjects();
    }, [user?.id]);

    // Debounce search query handling
    const handleSearchChange = useCallback(
        debounce((value) => {
            setFilterCriteria(prev => ({ ...prev, searchQuery: value }));
        }, 300),
        []
    );

    const filterByDate = (taskDateStr, filterDateStr, comparisonType) => {
        let taskDate = new Date(taskDateStr);
        taskDate = new Date(taskDate.getTime() - taskDate.getTimezoneOffset() * 60000).setHours(0, 0, 0, 0);

        let filterDate = new Date(filterDateStr);
        filterDate = new Date(filterDate.getTime() - filterDate.getTimezoneOffset() * 60000).setHours(0, 0, 0, 0);

        switch (comparisonType) {
            case 'before':
                return taskDate < filterDate;
            case 'before-equal':
                return taskDate <= filterDate;
            case 'equal':
                return taskDate === filterDate;
            case 'after':
                return taskDate > filterDate;
            case 'after-equal':
                return taskDate >= filterDate;
            default:
                return true;
        }
    };

    const getFilteredTasks = (tasks, filterCriteria) => {
        return tasks.filter((task) => {
            const matchesSearchQuery = filterCriteria.searchQuery === '' || task.assignment.toLowerCase().includes(filterCriteria.searchQuery.toLowerCase());
            const matchesPriority = !filterCriteria.priority || task.priority === filterCriteria.priority;
            const matchesStatus = !filterCriteria.status || task.status === filterCriteria.status;

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

            return matchesSearchQuery && matchesPriority && matchesStatus && matchesStartDate && matchesDueDate;
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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterCriteria(prev => ({ ...prev, [name]: value }));
    };

    const Row = React.memo(({ index, style }) => {
        const startIndex = index * 3;
        const filteredTasks = getFilteredTasks(initialTasks, filterCriteria);

        return (
            <div style={style}>
                <Grid container spacing={3} className="task-widgets">
                    {Array(3).fill(null).map((_, i) => {
                        const taskIndex = startIndex + i;
                        return taskIndex < filteredTasks.length ? (
                            <Grid item xs={12} sm={6} md={4} key={taskIndex}>
                                <TaskWidget
                                    task={filteredTasks[taskIndex]}
                                    onDelete={onDelete}
                                    subjects={subjects}
                                    projects={projects}
                                />
                            </Grid>
                        ) : null;
                    })}
                </Grid>
            </div>
        );
    });

    return (
        <div className="task-table">
            <div className="filter-bar">
                <div className="filter-item">
                    <label htmlFor="searchTask">Search:</label>
                    <input
                        id="searchTask"
                        type="text"
                        placeholder="Search tasks..."
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, searchQuery: e.target.value })}
                    />
                </div>
                <div className="filter-item">
                    <label htmlFor="priorityFilter">Priority:</label>
                    <select
                        id="priorityFilter"
                        value={filterCriteria.priority}
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, priority: e.target.value })}
                    >
                        <option value="">Show All</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>

                <div className="filter-item">
                    <label htmlFor="statusFilter">Status:</label>
                    <select
                        id="statusFilter"
                        value={filterCriteria.status}
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, status: e.target.value })}
                    >
                        <option value="">Show All</option>
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>

                <div className="filter-item">
                    <label htmlFor="startDateFilter">Start Date:</label>
                    <select
                        id="startDateFilter"
                        value={filterCriteria.startDateComparison}
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, startDateComparison: e.target.value })}
                    >
                        <option value="">Show All</option>
                        <option value="before">Before</option>
                        <option value="before-equal">Before or Equal to</option>
                        <option value="equal">Equal to</option>
                        <option value="after">After</option>
                        <option value="after-equal">After or Equal to</option>
                        <option value="none">None Set</option>
                    </select>
                    <input
                        type="date"
                        value={filterCriteria.startDate}
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, startDate: e.target.value })}
                    />
                </div>

                <div className="filter-item">
                    <label htmlFor="dueDateFilter">Due Date:</label>
                    <select
                        id="dueDateFilter"
                        value={filterCriteria.dueDateComparison}
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, dueDateComparison: e.target.value })}
                    >
                        <option value="">Show All</option>
                        <option value="before">Before</option>
                        <option value="before-equal">Before or Equal to</option>
                        <option value="equal">Equal to</option>
                        <option value="after">After</option>
                        <option value="after-equal">After or Equal to</option>
                        <option value="none">None Set</option>
                    </select>
                    <input
                        type="date"
                        value={filterCriteria.dueDate}
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, dueDate: e.target.value })}
                    />
                </div>

                <button onClick={clearFilters}>Clear Filters</button>
            </div>

            <List
                height={600}
                itemCount={Math.ceil(getFilteredTasks(initialTasks, filterCriteria).length / 3)}
                itemSize={550}  // Adjust the item size based on the widget height
                width="100%"
            >
                {Row}
            </List>
        </div>
    );
};

export default TasksTable;