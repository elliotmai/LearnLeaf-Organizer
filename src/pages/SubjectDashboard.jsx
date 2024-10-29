import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore } from '/src/db.js';
import { sortSubjects } from '/src/LearnLeaf_Functions.jsx';
import { AddSubjectForm } from '/src/Components/SubjectView/AddSubjectForm.jsx';
import SubjectWidget from '/src/Components/SubjectView/SubjectWidget.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import SubjectFilterBar from './SubjectFilterBar';
import { Grid, useMediaQuery, useTheme, Typography, Paper } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects'; // Import a fun icon
import { FixedSizeList as List } from 'react-window';
import '/src/Components/PageFormat.css';
import '/src/Components/FilterBar.css';

const Row = React.memo(({ index, style, subjects, refreshSubjects, itemsPerRow }) => {
    const startIndex = index * itemsPerRow;
    return (
        <div style={style}>
            <Grid container spacing={3} className="task-widgets">
                {Array(itemsPerRow).fill(null).map((_, i) => {
                    const subjectIndex = startIndex + i;
                    return subjectIndex < subjects.length ? (
                        <Grid item xs={12} sm={6} md={4} lg={4} xl={3} key={subjects[subjectIndex].subjectId}>
                            <SubjectWidget
                                subject={subjects[subjectIndex]}
                                refreshSubjects={refreshSubjects}
                            />
                        </Grid>
                    ) : null;
                })}
            </Grid>
        </div>
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
                setSubjects(sortSubjects(activeSubjects));
                setIsLoading(false);
                return true;
            }
            setIsLoading(false); // Update state when no subjects are found
            return false;
        } catch (error) {
            console.error("Error loading subjects from IndexedDB:", error);
            setIsLoading(false);
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
        <div className="view-container">
            <TopBar />
            <button className="fab" onClick={onOpen}>
                +
            </button>
            {isOpen &&
                <AddSubjectForm
                    isOpen={isOpen}
                    onClose={onClose}
                    refreshSubjects={handleSubject}
                />
            }
            <h1 style={{ color: '#907474' }}>{user?.name}'s Current Subjects</h1>
            <div className="subjects-grid">
                <SubjectFilterBar
                    filterCriteria={filterCriteria}
                    setFilterCriteria={setFilterCriteria}
                    clearFilters={clearFilters}
                />
                {isLoading ? (
                    <Grid container alignItems="center" justifyContent="center" direction="column" style={{ minHeight: '150px' }}>
                        <CircularProgress />
                        <p>Loading subjects...</p>
                    </Grid>
                ) : filteredSubjects.length === 0 ? (
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
                                margin: '2rem 0',
                                width: '90%'
                            }}
                        >
                            <EmojiObjectsIcon sx={{ fontSize: 50, color: '#ffc107', marginBottom: '1rem' }} />
                            <Typography variant="h6" color="textSecondary">
                                No subjects found!
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                It looks like you haven't added any subjects yet. Click the + button to add your first subject!
                            </Typography>
                        </Paper>
                    </Grid>
                ) : (
                    <List
                        height={600}
                        itemCount={totalRows}
                        itemSize={rowHeight}
                        width="100%"
                    >
                        {({ index, style }) => (
                            <Row
                                index={index}
                                style={style}
                                subjects={filteredSubjects}
                                refreshSubjects={handleSubject}
                                itemsPerRow={itemsPerRow}
                            />
                        )}
                    </List>
                )}
            </div>
        </div>
    );
};

export default SubjectsDashboard;