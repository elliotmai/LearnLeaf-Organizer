import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import debounce from 'lodash.debounce';
import { getAllFromStore } from '/src/db.js';
import { useUser } from '/src/UserState.jsx';
import Grid from '@mui/material/Grid';
import { useTheme, useMediaQuery, Paper, Menu, MenuItem, Typography, Button, Box, FormControlLabel, Checkbox } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import TaskWidget from '/src/Components/TaskView/TaskWidget.jsx';
import TaskFilterBar from '../../pages/TaskFilterBar';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { archiveTask } from '/src/LearnLeaf_Functions.jsx';
import { deleteAllProjects } from '../../LearnLeaf_Functions';


const TasksTable = ({ tasks, subjects, projects, onDelete, onUpdateTask, onAddTask, initialSubject, initialProject, updateState }) => {
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const [listHeight, setListHeight] = useState(window.innerHeight - 200); // Default initial height
    const [selectedTasks, setSelectedTasks] = useState(new Set()); // Store selected task IDs
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null); // State to manage the dropdown anchor

    // Open the dropdown menu
    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    // Close the dropdown menu
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    useEffect(() => {
        // Update list height on window resize
        const updateListHeight = () => {
            setListHeight(window.innerHeight - 200); // Adjust as needed for header/footer heights
        };

        window.addEventListener('resize', updateListHeight);
        return () => window.removeEventListener('resize', updateListHeight);
    }, []);

    const [filterCriteria, setFilterCriteria] = useState({
        searchQuery: '',
        taskPriority: '',
        taskStatus: '',
        taskStartDate: '',
        taskStartDateComparison: '',
        taskDueDate: '',
        taskDueDateComparison: '',
        taskSubject: '',
        taskProject: ''
    });

    const { user } = useUser();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

    // Adjust the number of items per row based on screen size
    const getItemsPerRow = useCallback(() => {
        if (isSmallScreen) return 1;
        if (isMediumScreen) return 2;
        if (isLargeScreen) return 4;
        return 3; // Default to 3 items per row
    }, [isSmallScreen, isMediumScreen, isLargeScreen]);

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
            const matchesSubject = filterCriteria.taskSubject === '' || task.taskSubject.subjectName.toLowerCase().includes(filterCriteria.taskSubject.toLowerCase());
            const matchesProject = filterCriteria.taskProject === '' || task.taskProject.projectName.toLowerCase().includes(filterCriteria.taskProject.toLowerCase());
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

            return matchesSearchQuery && matchesSubject && matchesProject && matchesPriority && matchesStatus && matchesStartDate && matchesDueDate;
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
            taskSubject: '',
            taskProject: ''
        });
    };

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterCriteria(prev => ({ ...prev, [name]: value }));
    };

    const toggleFormVisibility = () => {
        setIsAddTaskFormOpen(!isAddTaskFormOpen);
    };

    const handleCloseAddTaskForm = () => {
        setIsAddTaskFormOpen(false);
    };

    const handleAddTask = async (newTask) => {
        // const sortedTasks = sortTasks([...tasks, newTask]);
        // setTasks(sortedTasks);
        updateState();
    };

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 600;
    const filteredTasks = getFilteredTasks(tasks, filterCriteria);
    const totalRows = Math.ceil(filteredTasks.length / itemsPerRow);

    const toggleTaskSelection = (taskId) => {
        setSelectedTasks(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(taskId)) {
                newSelected.delete(taskId);
            } else {
                newSelected.add(taskId);
            }

            // If all tasks are selected, update the "Select All" state
            setIsAllSelected(newSelected.size === filteredTasks.length);

            return newSelected;
        });
    };


    const handleDeleteSelected = () => {
        const confirmation = window.confirm("Are you sure you want to permanently delete these tasks?");
        if (confirmation) {
            // Convert the Set to an array before iterating
            [...selectedTasks].forEach(taskId => onDelete(taskId, true)); // Call `onDelete` for each selected task
            setSelectedTasks(new Set()); // Clear selection after deletion
        }
    };

    const handleArchiveSelected = () => {
        selectedTasks.forEach(taskId => onUpdateTask(taskId, { taskStatus: 'Archived' })); // Update status
        setSelectedTasks(new Set());
    };


    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedTasks(new Set()); // Clear all selections
        } else {
            setSelectedTasks(new Set(filteredTasks.map(task => task.taskId))); // Select all filtered tasks
        }
        setIsAllSelected(!isAllSelected);
    };


    // useEffect(() => {
    //     deleteAllProjects();
    // }, []);


    // Render each row of tasks
    const Row = React.memo(({ index, style }) => {
        const startIndex = index * itemsPerRow;
        return (
            <div style={{ ...style, paddingBottom: '10px' }}> {/* Add padding to the row */}
                <Grid container spacing={2} className="task-widgets" style={{ padding: '10px 0' }}>
                    {Array(itemsPerRow).fill(null).map((_, i) => {
                        const taskIndex = startIndex + i;
                        return taskIndex < filteredTasks.length ? (
                            <Grid
                                item
                                xs={12}
                                sm={6}
                                md={4}
                                lg={3}
                                xl={3}
                                key={filteredTasks[taskIndex].taskId}
                                style={{ marginBottom: '10px', minHeight: rowHeight }} // Ensure consistent row height
                            >
                                <TaskWidget
                                    task={filteredTasks[taskIndex]}
                                    onDelete={onDelete}
                                    subjects={subjects}
                                    projects={projects}
                                    onUpdateTask={onUpdateTask}
                                    isSelected={selectedTasks.has(filteredTasks[taskIndex].taskId)}
                                    onSelectTask={toggleTaskSelection}
                                />
                            </Grid>
                        ) : null;
                    })}
                </Grid>
            </div>
        );
    });




    const handleBulkArchive = async () => {
        const confirmation = window.confirm("Archive all selected tasks?\nThis will not delete any associated tasks.");
        if (confirmation) {
            try {
                // Convert the Set to an array before using map
                await Promise.all([...selectedTasks].map(taskId => archiveTask(taskId)));
                // console.log("Tasks archived successfully.");
                updateState();
                setSelectedTasks(new Set()); // Clear the selection
            } catch (error) {
                console.error("Error archiving tasks:", error);
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '-webkit-fill-available' }}>


            {isAddTaskFormOpen && (
                <AddTaskForm
                    isOpen={isAddTaskFormOpen}
                    onClose={handleCloseAddTaskForm}
                    onAddTask={onAddTask}
                    subjects={subjects}
                    projects={projects}
                    initialSubject={initialSubject}
                    initialProject={initialProject}
                />
            )}

            <Grid
                container
                alignItems="center"
                justifyContent="center"
                spacing={1}
                paddingBottom="10px"
                paddingTop="10px"
                width="90%"
                position="relative"
                sx={{
                    borderTop: "1px solid #d9d9d9",
                    borderBottom: "1px solid #d9d9d9",
                    margin: "auto",
                    flexDirection: "column",
                }}
            >

                <Box display="flex" justifyContent="center" marginBottom="0.5%">
                    <TaskFilterBar
                        filterCriteria={filterCriteria}
                        setFilterCriteria={setFilterCriteria}
                        clearFilters={clearFilters}
                        onSearchChange={handleSearchChange}
                        onFilterChange={handleFilterChange}
                    />
                </Box>
                <Button
                    onClick={toggleFormVisibility}
                    variant="outlined"
                    startIcon={<AddIcon />}
                    sx={{
                        color: '#355147',
                        borderColor: '#355147',
                        '&:hover': {
                            backgroundColor: '#355147',
                            color: '#fff',
                        },
                    }}
                >
                    Add New Task
                </Button>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isAllSelected}
                                onChange={toggleSelectAll}
                                color="primary"
                            />
                        }
                        label="Select All"
                    />

                    <Box display="flex" gap={2}>
                        <Button
                            onClick={handleMenuOpen}
                            endIcon={<ArrowDropDownIcon />}
                            variant="outlined"
                            disabled={selectedTasks.size === 0}
                            sx={{
                                color: '#355147',
                                borderColor: '#355147',
                                '&:hover': {
                                    backgroundColor: '#355147',
                                    color: '#fff',
                                },
                            }}
                        >
                            Actions
                        </Button>

                        {/* Dropdown Menu */}
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                        >
                            <MenuItem
                                onClick={() => {
                                    handleBulkArchive();
                                    handleMenuClose();
                                }}
                                sx={{ color: '#355147' }}

                            >
                                Archive Selected
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    handleDeleteSelected();
                                    handleMenuClose();
                                }}
                                sx={{ color: '#F3161E' }}
                            >
                                Delete Selected
                            </MenuItem>
                        </Menu>
                    </Box>
                </div>

            </Grid>


            <div style={{ flex: 1, overflow: 'hidden' }}>
                <Box sx={{ marginLeft: '20px', marginRight: '20px' }}> {/* Adjust margin as needed */}
                    {tasks.length > 0 ? (
                        <List height={listHeight} itemCount={totalRows} itemSize={rowHeight} width="100%">
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
                                <Typography variant="h6" color="textSecondary">No tasks found!</Typography>
                                <Typography variant="body2" color="textSecondary" textAlign="center">
                                    You have no upcoming tasks. Add a new task to stay organized!
                                </Typography>
                            </Paper>
                        </Grid>
                    )}
                </Box>
            </div>
        </div>
    );
};

export default TasksTable;