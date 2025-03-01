import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore } from '/src/db.js';
import { sortSubjects, archiveSubject, deleteSubject } from '/src/LearnLeaf_Functions.jsx';
import { AddSubjectForm } from '/src/Components/SubjectView/AddSubjectForm.jsx';
import SubjectWidget from '/src/Components/SubjectView/SubjectWidget.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import SubjectFilterBar from './SubjectFilterBar';
import { Grid, Typography, CircularProgress,Menu, MenuItem, Box, Button, Paper, useTheme, useMediaQuery, Checkbox, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { FixedSizeList as List } from 'react-window';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
const Row = React.memo(({ index, style, subjects, refreshSubjects, itemsPerRow, selectedSubjects, toggleSubjectSelection }) => {
    const startIndex = index * itemsPerRow;
    return (
        <Box sx={{ ...style, width: '100%', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <Grid container spacing={3} sx={{ maxWidth: '100%' }}>
                {Array(itemsPerRow).fill(null).map((_, i) => {
                    const subjectIndex = startIndex + i;
                    return subjectIndex < subjects.length ? (
                        <Grid item xs={12} sm={6} md={4} lg={3} xl={3} key={subjects[subjectIndex].subjectId}>
                           
                                    <SubjectWidget subject={subjects[subjectIndex]}  refreshSubjects={refreshSubjects} selectedSubjects={selectedSubjects} toggleSubjectSelection={toggleSubjectSelection} subjectIndex={subjectIndex} subjects={subjects}  />
                        </Grid>
                    ) : null;
                })}
            </Grid>
        </Box>
    );
});

const SubjectsDashboard = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [filterCriteria, setFilterCriteria] = useState({
        searchSubject: '',
        searchSemester: '',
        searchDescription: ''
    });
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null); // State to manage the dropdown anchor

    // Open the dropdown menu
    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    // Close the dropdown menu
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const isLargeScreen = useMediaQuery(theme.breakpoints.between('md', 'lg'));
    const isXLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

    const getItemsPerRow = useCallback(() => {
        if (isSmallScreen) return 1;
        if (isMediumScreen) return 2;
        if (isLargeScreen) return 3;
        if (isXLargeScreen) return 4;
        return 3;
    }, [isSmallScreen, isMediumScreen, isLargeScreen, isXLargeScreen]);

   // Fetch active subjects from IndexedDB
   const loadFromIndexedDB = async () => {
    try {
        const allSubjects = await getAllFromStore('subjects');
        const activeSubjects = allSubjects.filter(subject => subject.subjectStatus === 'Active');
        console.log({activeSubjects});
        if (activeSubjects.length > 0) {
            setSubjects(sortSubjects(activeSubjects));
            setIsLoading(false);
            return true;
        }
        
        setSubjects(sortSubjects(activeSubjects));
        setIsLoading(false);
        return false;
    } catch (error) {
        console.error("Error loading subjects from IndexedDB:", error);
        return false;
    }
};

const updateState = async () => {
    setIsLoading(true);
    const isLoadedFromIndexedDB = await loadFromIndexedDB();
    if (!isLoadedFromIndexedDB) {
        console.log("No subjects data found in IndexedDB.");
    }
};

    useEffect(() => {
        if (user?.id) {
            updateState();
        }
    }, [user?.id]);

    const onClose = () => setIsOpen(false);
    const onOpen = () => setIsOpen(true);

    const getFilteredSubjects = (subjects, filterCriteria) => {
        return subjects.filter((subject) => {
            const matchesSearchSubject = filterCriteria.searchSubject === '' || subject.subjectName.toLowerCase().includes(filterCriteria.searchSubject.toLowerCase());
            const matchesSearchSemester = filterCriteria.searchSemester === '' || subject.subjectSemester.toLowerCase().includes(filterCriteria.searchSemester.toLowerCase());
            const matchesSearchDescription = filterCriteria.searchDescription === '' || subject.subjectDescription.toLowerCase().includes(filterCriteria.searchDescription.toLowerCase());

            return matchesSearchSubject && matchesSearchSemester && matchesSearchDescription;
        });
    };

    const clearFilters = () => {
        setFilterCriteria({
            searchSubject: '',
            searchSemester: '',
            searchDescription: ''
        });
    };

    const handleSubject = () => {
        updateState();
    };

    const toggleSubjectSelection = (subjectId) => {
        setSelectedSubjects(prevSelected =>
            prevSelected.includes(subjectId)
                ? prevSelected.filter(id => id !== subjectId)
                : [...prevSelected, subjectId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedSubjects.length === filteredSubjects.length) {
            setSelectedSubjects([]);
        } else {
            setSelectedSubjects(filteredSubjects.map(subject => subject.subjectId));
        }
    };

    const handleBulkArchive = async () => {
        const confirmation = window.confirm("Archive all selected subjects?\nThis will not delete any associated tasks.");
        if (confirmation) {
            try {
                await Promise.all(selectedSubjects.map(subjectId => archiveSubject(subjectId)));
                console.log("Subjects archived successfully.");
                updateState();
                setSelectedSubjects([]);
            } catch (error) {
                console.error("Error archiving subjects:", error);
            }
        }
    };

    const handleBulkDelete = async () => {
        const confirmation = window.confirm("Delete all selected subjects?\nAssociated tasks won’t be grouped under these subjects anymore.");
        if (confirmation) {
            try {
                await Promise.all(selectedSubjects.map(subjectId => deleteSubject(subjectId)));
                console.log("Subjects deleted successfully.");
                updateState();
                setSelectedSubjects([]);
            } catch (error) {
                console.error("Error deleting subjects:", error);
            }
        }
    };

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 300;
    const filteredSubjects = getFilteredSubjects(subjects, filterCriteria);
    const totalRows = Math.ceil(filteredSubjects.length / itemsPerRow);

    return (
        <Box sx={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TopBar />
            <Grid container direction="column" alignItems="center" justifyContent="center" width="90%" margin="auto">
                <Typography variant="h4" sx={{ color: '#907474', textAlign: 'center', mt: 2 }}>
                    {user?.name}'s Current Subjects
                </Typography>
                <Grid
                    container
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                    paddingBottom="10px"
                    paddingTop="10px"
                    position="relative"
                    sx={{
                        borderTop: "1px solid #d9d9d9",
                        borderBottom: "1px solid #d9d9d9",
                        margin: "auto",
                        flexDirection: "column",
                    }}
                >
                    <Box display="flex" justifyContent="center">
                        <SubjectFilterBar
                            filterCriteria={filterCriteria}
                            setFilterCriteria={setFilterCriteria}
                            clearFilters={clearFilters}
                        />
                    </Box>
                    <Button
                        onClick={onOpen}
                        variant="outlined"
                        startIcon={<AddIcon />}
                        sx={{
                            color: '#355147',
                            borderColor: '#355147',
                            marginTop: 2,
                            '&:hover': {
                                backgroundColor: '#355147',
                                color: '#fff',
                            },
                        }}
                    >
                        Add New Subject
                    </Button>
                    <div style={{display:"flex",justifyContent:"space-between",width:"100%"}}>

                        <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedSubjects.length === filteredSubjects.length ? true : false}
                            onChange={toggleSelectAll}
                            color="primary"
                        />
                    }
                    label="Select All"
                />

<Box display="flex" justifyContent="space-between" gap={2}>
            <Button
                variant="outlined"
                onClick={handleMenuOpen}
                endIcon={<ArrowDropDownIcon />}
                disabled={selectedSubjects.length === 0}
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
                        handleBulkDelete();
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
            </Grid>
            <Grid container style={{ flexGrow: 1, overflowY: 'auto', width: '100%' }} justifyContent="center">
                <Box sx={{ flex: 1, paddingLeft: '1%', paddingRight: '1%', maxWidth: '90%' }}>
                    {isLoading ? (
                        <Grid container justifyContent="center" alignItems="center" style={{ minHeight: '150px' }}>
                            <CircularProgress />
                        </Grid>
                    ) : filteredSubjects.length > 0 ? (
                        <List height={600} itemCount={totalRows} itemSize={rowHeight} width="100%">
                            {({ index, style }) => (
                                <Row
                                    index={index}
                                    style={style}
                                    subjects={filteredSubjects}
                                    refreshSubjects={updateState}
                                    itemsPerRow={itemsPerRow}
                                    selectedSubjects={selectedSubjects}
                                    toggleSubjectSelection={toggleSubjectSelection}
                                />
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
                                <Typography variant="h6" color="textSecondary">No subjects found!</Typography>
                                <Typography variant="body2" color="textSecondary" textAlign="center">
                                    Click the + button to add your first subject!
                                </Typography>
                            </Paper>
                        </Grid>
                    )}
                </Box>
            </Grid>
            {isOpen && (
                <AddSubjectForm
                    isOpen={isOpen}
                    onClose={onClose}
                    refreshSubjects={updateState}
                />
            )}
        </Box>
    );
};

export default SubjectsDashboard;