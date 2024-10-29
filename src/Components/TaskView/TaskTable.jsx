import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import debounce from 'lodash.debounce';
import { getAllFromStore } from '/src/db.js';
import { useUser } from '/src/UserState.jsx';
import Grid from '@mui/material/Grid';
import { useTheme, useMediaQuery, Paper, Typography } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import TaskWidget from '/src/Components/TaskView/TaskWidget.jsx';
import TaskFilterBar from '../../pages/TaskFilterBar';
import './TaskView.css';
import '/src/Components/PageFormat.css';

const TasksTable = ({ tasks, subjects, projects, onDelete, onUpdateTask }) => {
    const [filterCriteria, setFilterCriteria] = useState({
        searchQuery: '',
        taskPriority: '',
        taskStatus: '',
        taskStartDate: '',
        taskStartDateComparison: '',
        taskDueDate: '',
        taskDueDateComparison: '',
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

    // Debounce search query handling
    const handleSearchChange = useCallback(
        debounce((value) => {
            setFilterCriteria(prev => ({ ...prev, searchQuery: value }));
        }, 300),
        []
    );

    // Filter by date
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

    // Filter tasks based on criteria
    const getFilteredTasks = (tasks, filterCriteria) => {
        return tasks.filter((task) => {
            const matchesSearchQuery = filterCriteria.searchQuery === '' || task.taskName.toLowerCase().includes(filterCriteria.searchQuery.toLowerCase());
            const matchesPriority = !filterCriteria.taskPriority || task.taskPriority === filterCriteria.taskPriority;
            const matchesStatus = !filterCriteria.taskStatus || task.taskStatus === filterCriteria.taskStatus;

            let matchesStartDate = true;
            if (filterCriteria.taskStartDateComparison === "none") {
                matchesStartDate = !task.taskStartDate;
            } else if (filterCriteria.taskStartDate) {
                matchesStartDate = filterByDate(task.taskStartDate, filterCriteria.taskStartDate, filterCriteria.taskStartDateComparison);
            }

            let matchesDueDate = true;
            if (filterCriteria.taskDueDateComparison === "none") {
                matchesDueDate = !task.taskDueDate;
            } else if (filterCriteria.taskDueDate) {
                matchesDueDate = filterByDate(task.taskDueDate, filterCriteria.taskDueDate, filterCriteria.taskDueDateComparison);
            }

            return matchesSearchQuery && matchesPriority && matchesStatus && matchesStartDate && matchesDueDate;
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setFilterCriteria({
            searchQuery: '',
            taskPriority: '',
            taskStatus: '',
            taskStartDate: '',
            taskStartDateComparison: '',
            taskDueDate: '',
            taskDueDateComparison: '',
        });
    };

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterCriteria(prev => ({ ...prev, [name]: value }));
    };

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 550;
    const filteredTasks = getFilteredTasks(tasks, filterCriteria);
    const totalRows = Math.ceil(filteredTasks.length / itemsPerRow);

    // Render each row of tasks
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
                                <Grid item xs={12} sm={6} md={4} lg={4} xl={3} key={filteredTasks[taskIndex].taskId}>
                                    <TaskWidget
                                        task={filteredTasks[taskIndex]}
                                        onDelete={onDelete}
                                        subjects={subjects}
                                        projects={projects}
                                        onUpdateTask={onUpdateTask}
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
            <TaskFilterBar
                filterCriteria={filterCriteria}
                setFilterCriteria={setFilterCriteria}
                clearFilters={clearFilters}
                onSearchChange={handleSearchChange}
                onFilterChange={handleFilterChange}
            />
            {tasks.length > 0 ? (
                <List
                    height={600}
                    itemCount={totalRows}
                    itemSize={rowHeight}
                    width="100%"
                >
                    {({ index, style }) => (
                        <Row index={index} style={style} />
                    )}
                </List>
            ) : (
                <Grid container justifyContent="center" alignItems="center" style={{ width: '100%', marginTop: '2rem' }}>
                    <Paper
                        elevation={3}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2rem',
                            backgroundColor: '#f5f5f5',
                            width: '90%',
                        }}
                    >
                        <AssignmentTurnedInIcon sx={{ fontSize: 50, color: '#64b5f6', marginBottom: '1rem' }} />
                        <Typography variant="h6" color="textSecondary">
                            No tasks found!
                        </Typography>
                        <Typography variant="body2" color="textSecondary" textAlign="center">
                            You have no upcoming tasks. Add a new task to stay organized!
                        </Typography>
                    </Paper>
                </Grid>
            )}
        </div>
    );
};

export default TasksTable;