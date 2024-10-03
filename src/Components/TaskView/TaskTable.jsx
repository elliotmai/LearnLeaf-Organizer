import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import debounce from 'lodash.debounce';  // Import debounce
import { deleteTask, fetchProjects, fetchSubjects } from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';
import Grid from '@mui/material/Grid';
import { useTheme, useMediaQuery } from '@mui/material';
import TaskWidget from '/src/Components/TaskView/TaskWidget.jsx';
import TaskFilterBar from '../../pages/TaskFilterBar';
import './TaskView.css';
import '/src/Components/PageFormat.css';

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
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const isLargeScreen = useMediaQuery(theme.breakpoints.between('md', 'lg'));
    const isXLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

    // Adjust the number of items per row based on screen size
    const getItemsPerRow = useCallback(() => {
        if (isSmallScreen) return 1;
        if (isMediumScreen) return 2;
        if (isLargeScreen) return 3;
        if (isXLargeScreen) return 4;
        return 3; // Default to 3 items per row
    }, [isSmallScreen, isMediumScreen, isLargeScreen, isXLargeScreen]);

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

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 550; // Adjust the item size based on the widget height
    const filteredTasks = getFilteredTasks(initialTasks, filterCriteria);
    const totalRows = Math.ceil(filteredTasks.length / itemsPerRow);

    const Row = React.memo(({ index, style }) => {
        const startIndex = index * itemsPerRow;

        return (
            <div style={style}>
                <Grid container spacing={2} className="task-widgets">
                    {Array(itemsPerRow)
                        .fill(null)
                        .map((_, i) => {
                            const taskIndex = startIndex + i;
                            return taskIndex < filteredTasks.length ? (
                                <Grid item xs={12} sm={6} md={4} lg={4} xl={3} key={taskIndex}>
                                    <TaskWidget
                                        task={filteredTasks[taskIndex]}
                                        onDelete={onDelete}
                                        subjects={subjects}
                                        projects={projects}
                                        refreshTasks={refreshTasks}
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
            {/* <div className="filter-bar"> */}
                <TaskFilterBar
                    filterCriteria={filterCriteria}
                    setFilterCriteria={setFilterCriteria}
                    clearFilters={clearFilters}
                />
            {/* </div> */}

            <List
                height={600}
                itemCount={totalRows}
                itemSize={rowHeight} // Adjust the row height to fit the content
                width="100%"
            >
                {({ index, style }) => (
                    <Row index={index} style={style} />
                )}
            </List>
        </div>
    );
};

export default TasksTable;