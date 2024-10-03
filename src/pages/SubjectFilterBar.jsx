import React, { useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const SubjectFilterBar = ({ filterCriteria, setFilterCriteria, clearFilters }) => {
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
                            id="searchSubject"
                            label="Search Subjects"
                            variant="outlined"
                            fullWidth
                            value={filterCriteria.searchSubject}
                            onChange={(e) => setFilterCriteria({ ...filterCriteria, searchSubject: e.target.value })}
                            placeholder="Search subjects..."
                        />
                    </Grid>

                    <Grid item xs={12} className="filter-item">
                        <TextField
                            id="searchSemester"
                            label="Search Semesters"
                            variant="outlined"
                            fullWidth
                            value={filterCriteria.searchSemester}
                            onChange={(e) => setFilterCriteria({ ...filterCriteria, searchSemester: e.target.value })}
                            placeholder="Search semesters..."
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
    );
};

export default SubjectFilterBar;
