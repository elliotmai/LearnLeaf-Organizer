import React, { useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import '/src/Components/FilterBar.css';

const ProjectFilterBar = ({ filterCriteria, setFilterCriteria, clearFilters }) => {
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
                        <Grid item xs={12} sm={4} className="filter-item">
                            <Grid container spacing={2} direction="column">
                                {/* Search Input: Full Width on Top */}
                                <Grid item xs={6} className="filter-item">
                                    <TextField
                                        id="searchProject"
                                        label="Search Projects"
                                        // variant="outlined"
                                        fullWidth
                                        value={filterCriteria.searchProject}
                                        onChange={(e) => setFilterCriteria({ ...filterCriteria, searchProject: e.target.value })}
                                        placeholder="Search projects..."
                                    />
                                </Grid>

                                <Grid item xs={6} className="filter-item">
                                    <TextField
                                        id="searchSubject"
                                        label="Search Subjects"
                                        variant="outlined"
                                        fullWidth
                                        value={filterCriteria.searchSubject}
                                        onChange={(e) => setFilterCriteria({ ...filterCriteria, searchSubject: e.target.value })}
                                        placeholder="Search subjects..."
                                    />
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item xs={12} sm={4} className="filter-item">
                            <Grid container spacing={2} direction="column">
                                <Grid item>
                                    <FormControl xs={8} fullWidth variant="outlined">
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
                                    xs={8}
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

                        <Grid item xs={8} className="filter-item">
                                    <TextField
                                        id="searchDescription"
                                        label="Search Descriptions"
                                        variant="outlined"
                                        fullWidth
                                        value={filterCriteria.searchDescription}
                                        onChange={(e) => setFilterCriteria({ ...filterCriteria, searchDescription: e.target.value })}
                                        placeholder="Search descriptions..."
                                    />
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
        </div>
    );
};

export default ProjectFilterBar;
