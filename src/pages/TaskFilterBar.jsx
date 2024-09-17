import React, { useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const TaskFilterBar = ({ filterCriteria, setFilterCriteria, clearFilters }) => {
    // State to control the expansion of the filter section
    const [expanded, setExpanded] = useState(false); // Default to collapsed

    const handleAccordionChange = () => {
        setExpanded(!expanded);
    };

    return (
        <Accordion
            expanded={expanded}
            onChange={handleAccordionChange}
            sx={{
                borderRadius: 2, // Rounded corners
                mb: 2, // Padding/margin below the accordion
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
                <Grid container spacing={3} className="filter-bar">
                    {/* Search Input: Full Width on Top */}
                    <Grid item xs={12} className="filter-item">
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

                    {/* Below the Search Input: 3 Columns */}
                    <Grid container item spacing={3} xs={12}>
                        {/* First Column: Status on top, Priority below */}
                        <Grid item xs={12} sm={4} className="filter-item">
                            <Grid container spacing={2} direction="column">
                                <Grid item>
                                    <FormControl fullWidth variant="outlined">
                                        <InputLabel id="statusFilterLabel">Status</InputLabel>
                                        <Select
                                            labelId="statusFilterLabel"
                                            id="statusFilter"
                                            value={filterCriteria.status}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, status: e.target.value })}
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
                                            value={filterCriteria.priority}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, priority: e.target.value })}
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
                                    <FormControl fullWidth variant="outlined">
                                        <InputLabel id="startDateFilterLabel">Start Date</InputLabel>
                                        <Select
                                            labelId="startDateFilterLabel"
                                            id="startDateFilter"
                                            value={filterCriteria.startDateComparison}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, startDateComparison: e.target.value })}
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
                                        value={filterCriteria.startDate}
                                        onChange={(e) => setFilterCriteria({ ...filterCriteria, startDate: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Third Column: Due Date Comparison on top, Due Date Entry below */}
                        <Grid item xs={12} sm={4} className="filter-item">
                            <Grid container spacing={2} direction="column">
                                <Grid item>
                                    <FormControl fullWidth variant="outlined">
                                        <InputLabel id="dueDateFilterLabel">Due Date</InputLabel>
                                        <Select
                                            labelId="dueDateFilterLabel"
                                            id="dueDateFilter"
                                            value={filterCriteria.dueDateComparison}
                                            onChange={(e) => setFilterCriteria({ ...filterCriteria, dueDateComparison: e.target.value })}
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
                                        value={filterCriteria.dueDate}
                                        onChange={(e) => setFilterCriteria({ ...filterCriteria, dueDate: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Clear Filters Button: Full Width at Bottom */}
                    <Grid item xs={12} className="filter-item">
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={clearFilters}
                        >
                            Clear Filters
                        </Button>
                    </Grid>
                </Grid>
            </AccordionDetails>
        </Accordion>
    );
};

export default TaskFilterBar;
