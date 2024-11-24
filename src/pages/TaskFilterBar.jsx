import React, { useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// import '/src/Components/FilterBar.css';

const TaskFilterBar = ({ filterCriteria, setFilterCriteria, clearFilters }) => {
    // State to control the expansion of the filter section
    const [expanded, setExpanded] = useState(false); // Default to collapsed

    const handleAccordionChange = () => {
        setExpanded(!expanded);
    };

    return (
        <div className="filter-bar">
            <Accordion
                expanded={expanded}
                onChange={handleAccordionChange}
                sx={{
                    borderRadius: 2, // Rounded corners
                    boxShadow: 2, // Box shadow for a little elevation
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                        backgroundColor: '#f4f6f6', // Optional background color
                        borderRadius: 2, // Keep corners rounded when collapsed
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 'bold', // Bold text
                            color: '#355147', // Custom color for the "Filters" text
                        }}
                    >
                        Filters
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={3}>
                        {/* Below the Search Input: 3 Columns */}
                        <Grid container item spacing={3} xs={12}>
                            {/* First Column: Status on top, Priority below */}
                            <Grid item xs={12} sm={4} className="filter-item">
                                <Grid container spacing={2} direction="column">
                                    <Grid item>
                                        <TextField
                                            id="searchTask"
                                            label="Search Tasks"
                                            variant="outlined"
                                            fullWidth
                                            value={filterCriteria.searchQuery}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, searchQuery: e.target.value })}
                                            placeholder="Search tasks..."
                                        />
                                    </Grid>
                                    <Grid item>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel id="statusFilterLabel">Status</InputLabel>
                                            <Select
                                                labelId="statusFilterLabel"
                                                id="statusFilter"
                                                value={filterCriteria.taskStatus}
                                                onChange={(e) => setFilterCriteria({ ...filterCriteria, taskStatus: e.target.value })}
                                                label="Status"
                                            >
                                                <MenuItem value="">Show All</MenuItem>
                                                <MenuItem value="Not Started">Not Started</MenuItem>
                                                <MenuItem value="In Progress">In Progress</MenuItem>
                                                <MenuItem value="Completed">Completed</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel id="priorityFilterLabel">Priority</InputLabel>
                                            <Select
                                                labelId="priorityFilterLabel"
                                                id="priorityFilter"
                                                value={filterCriteria.taskPriority}
                                                onChange={(e) => setFilterCriteria({ ...filterCriteria, taskPriority: e.target.value })}
                                                label="Priority"
                                            >
                                                <MenuItem value="">Show All</MenuItem>
                                                <MenuItem value="High">High</MenuItem>
                                                <MenuItem value="Medium">Medium</MenuItem>
                                                <MenuItem value="Low">Low</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* Second Column: Start Date Comparison on top, Start Date Entry below */}
                            <Grid item xs={12} sm={4} className="filter-item">
                                <Grid container spacing={2} direction="column">
                                    <Grid item>
                                        <TextField
                                            id="searchSubject"
                                            label="Search Subjects"
                                            variant="outlined"
                                            fullWidth
                                            value={filterCriteria.taskSubject}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, taskSubject: e.target.value })}
                                            placeholder="Search subjects..."
                                        />
                                    </Grid>
                                    <Grid item>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel id="startDateFilterLabel">Start Date</InputLabel>
                                            <Select
                                                labelId="startDateFilterLabel"
                                                id="startDateFilter"
                                                value={filterCriteria.taskStartDateComparison}
                                                onChange={(e) => setFilterCriteria({ ...filterCriteria, taskStartDateComparison: e.target.value })}
                                                label="Start Date"
                                            >
                                                <MenuItem value="">Show All</MenuItem>
                                                <MenuItem value="before">Before</MenuItem>
                                                <MenuItem value="before-equal">Before or Equal to</MenuItem>
                                                <MenuItem value="equal">Equal to</MenuItem>
                                                <MenuItem value="after">After</MenuItem>
                                                <MenuItem value="after-equal">After or Equal to</MenuItem>
                                                <MenuItem value="none">None Set</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item>
                                        <TextField
                                            id="startDate"
                                            label="Start Date"
                                            type="date"
                                            variant="outlined"
                                            fullWidth
                                            InputLabelProps={{
                                                shrink: true,
                                            }}
                                            value={filterCriteria.taskStartDate}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, taskStartDate: e.target.value })}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* Third Column: Due Date Comparison on top, Due Date Entry below */}
                            <Grid item xs={12} sm={4} className="filter-item">
                                <Grid container spacing={2} direction="column">
                                    <Grid item>
                                        <TextField
                                            id="searchProject"
                                            label="Search Projects"
                                            variant="outlined"
                                            fullWidth
                                            value={filterCriteria.taskProject}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, taskProject: e.target.value })}
                                            placeholder="Search projects..."
                                        />
                                    </Grid>
                                    <Grid item>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel id="dueDateFilterLabel">Due Date</InputLabel>
                                            <Select
                                                labelId="dueDateFilterLabel"
                                                id="dueDateFilter"
                                                value={filterCriteria.taskDueDateComparison}
                                                onChange={(e) => setFilterCriteria({ ...filterCriteria, taskDueDateComparison: e.target.value })}
                                                label="Due Date"
                                            >
                                                <MenuItem value="">Show All</MenuItem>
                                                <MenuItem value="before">Before</MenuItem>
                                                <MenuItem value="before-equal">Before or Equal to</MenuItem>
                                                <MenuItem value="equal">Equal to</MenuItem>
                                                <MenuItem value="after">After</MenuItem>
                                                <MenuItem value="after-equal">After or Equal to</MenuItem>
                                                <MenuItem value="none">None Set</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item>
                                        <TextField
                                            id="dueDate"
                                            label="Due Date"
                                            type="date"
                                            variant="outlined"
                                            fullWidth
                                            InputLabelProps={{
                                                shrink: true,
                                            }}
                                            value={filterCriteria.taskDueDate}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, taskDueDate: e.target.value })}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Clear Filters Button: Full Width at Bottom */}
                        <Grid item xs={12} className="filter-item">
                            <Button
                                variant="contained"
                                // color="primary"
                                fullWidth
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </Button>
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>
        </div>
    );
};

export default TaskFilterBar;
