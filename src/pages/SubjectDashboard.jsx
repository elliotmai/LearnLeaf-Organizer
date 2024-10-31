import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore } from '/src/db.js';
import { AddSubjectForm } from '/src/Components/SubjectView/AddSubjectForm.jsx';
import SubjectWidget from '/src/Components/SubjectView/SubjectWidget.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import SubjectFilterBar from './SubjectFilterBar';
import { Grid, Typography, CircularProgress, Box, Button, Paper, useTheme, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { FixedSizeList as List } from 'react-window';

const Row = React.memo(({ index, style, subjects, refreshSubjects, itemsPerRow }) => {
    const startIndex = index * itemsPerRow;
    return (
        <Box sx={{ ...style, width: '100%', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <Grid container spacing={3} sx={{ maxWidth: '100%' }}>
                {Array(itemsPerRow).fill(null).map((_, i) => {
                    const subjectIndex = startIndex + i;
                    return subjectIndex < subjects.length ? (
                        <Grid item xs={12} sm={6} md={4} lg={3} xl={3} key={subjects[subjectIndex].subjectId}>
                            <SubjectWidget subject={subjects[subjectIndex]} refreshSubjects={refreshSubjects} />
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
            if (activeSubjects.length > 0) {
                setSubjects(activeSubjects);
                setIsLoading(false);
                return true;
            }
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

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 280;
    const filteredSubjects = getFilteredSubjects(subjects, filterCriteria);
    const totalRows = Math.ceil(filteredSubjects.length / itemsPerRow);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
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
                </Grid>
            </Grid>
            <Grid container style={{ flexGrow: 1, overflow: 'hidden', width: '100%' }} justifyContent="center">
                <Box sx={{ flex: 1, overflowY: 'auto', padding: '1%', maxWidth: '90%' }}>
                    {isLoading ? (
                        <Grid container justifyContent="center" alignItems="center" style={{ minHeight: '150px' }}>
                            <CircularProgress />
                        </Grid>
                    ) : filteredSubjects.length > 0 ? (
                        <List height={600} itemCount={totalRows} itemSize={rowHeight} width="100%">
                            {({ index, style }) => (
                                <Row index={index} style={style} subjects={filteredSubjects} refreshSubjects={updateState} itemsPerRow={itemsPerRow} />
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