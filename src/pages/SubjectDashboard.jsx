<<<<<<< Updated upstream
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import { fetchSubjects, logoutUser } from '/src/LearnLeaf_Functions.jsx';
import { AddSubjectForm } from '/src/Components/SubjectView/AddSubjectForm.jsx';
import SubjectWidget from '/src/Components/SubjectView/SubjectWidget.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import SubjectFilterBar from './SubjectFilterBar';
import { Grid, useMediaQuery, useTheme } from '@mui/material';
import { FixedSizeList as List } from 'react-window'; // List component from react-window
import '/src/Components/PageFormat.css';
import '/src/Components/FilterBar.css';


// Memoized Row component for rendering tasks
const Row = React.memo(({ index, style, subjects, refreshSubjects, itemsPerRow }) => {
    const startIndex = index * itemsPerRow; // Each row starts with itemsPerRow number of subjects

    return (
        <div style={style}>
            <Grid container spacing={3} className="task-widgets">
                {Array(itemsPerRow).fill(null).map((_, i) => {
                    const subjectIndex = startIndex + i;
                    return subjectIndex < subjects.length ? (
                        <Grid item xs={12} sm={6} md={4} lg={4} xl={3} key={subjects[subjectIndex].id}>
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
    const [isOpen, setIsOpen] = useState(false); // Renamed to isOpen for clarity
    const [subjects, setSubjects] = useState([]);
    const { user } = useUser();
    const navigate = useNavigate();
    const [filterCriteria, setFilterCriteria] = useState({
        searchSubject: '',
        searchSemester: ''
    });
    
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
        if (user?.id) {
            fetchSubjects(user.id)
                .then(fetchedSubjects => setSubjects(fetchedSubjects))
                .catch(error => console.error("Error fetching subjects:", error));

            console.log(subjects);
        }
    }, [user?.id]);

    const onClose = () => setIsOpen(false); // Function to close the modal
    const onOpen = () => setIsOpen(true); // Function to open the modal

    const refreshSubjects = async () => {
        console.log("Refreshing subjects...");
        const updatedSubjects = await fetchSubjects(user.id);
        console.log("Successfully refreshed subjects");
        setSubjects(updatedSubjects);
    };

    const getFilteredSubjects = (subjects, filterCriteria) => {
        return subjects.filter((subject) => {
            const matchesSearchSubject = filterCriteria.searchSubject === '' || subject.subjectName.toLowerCase().includes(filterCriteria.searchSubject.toLowerCase());
            const matchesSearchSemester = filterCriteria.searchSemester === '' || subject.semester.toLowerCase().includes(filterCriteria.searchSemester.toLowerCase())

            return matchesSearchSubject && matchesSearchSemester;
        });
    };

    const clearFilters = () => {
        setFilterCriteria({
            searchSubject: '',
            searchSemester: ''
        });
    };

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 200; // Approximate height of each widget
    const filteredSubjects = getFilteredSubjects(subjects, filterCriteria);
    console.log(filteredSubjects.length);
    const totalRows = Math.ceil(filteredSubjects.length / itemsPerRow);

    return (
        <div className="view-container">
            <TopBar />
            <button className="fab" onClick={onOpen}>
                +
            </button>
            {isOpen && <AddSubjectForm isOpen={isOpen} onClose={onClose} refreshSubjects={refreshSubjects} />}
            <h1 style={{ color: '#907474' }}>{user?.name}'s Current Subjects</h1>
            <div className="subjects-grid">
                <SubjectFilterBar
                    filterCriteria={filterCriteria}
                    setFilterCriteria={setFilterCriteria}
                    clearFilters={clearFilters}
                />
                <List
                    height={600} // Adjust the height to the desired value
                    itemCount={totalRows} // Number of rows needed to display subjects
                    itemSize={rowHeight} // Adjust the row height to fit the content
                    width="100%"
                >
                    {({ index, style }) => (
                        <Row
                            index={index}
                            style={style}
                            subjects={filteredSubjects}
                            refreshSubjects={refreshSubjects}
                            itemsPerRow={itemsPerRow}
                        />
                    )}
                </List>
            </div>
        </div>
    );
};

export default SubjectsDashboard;
=======
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import { fetchSubjects, logoutUser } from '/src/LearnLeaf_Functions.jsx';
import { AddSubjectForm } from '/src/Components/SubjectView/AddSubjectForm.jsx';
import SubjectWidget from '/src/Components/SubjectView/SubjectWidget.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { Grid, useMediaQuery, useTheme } from '@mui/material';
import { FixedSizeList as List } from 'react-window'; // List component from react-window
import '/src/Components/PageFormat.css';

// Memoized Row component for rendering tasks
const Row = React.memo(({ index, style, subjects, refreshSubjects, itemsPerRow }) => {
    const startIndex = index * itemsPerRow; // Each row starts with itemsPerRow number of subjects

    return (
        <div style={style}>
            <Grid container spacing={3} className="task-widgets">
                {Array(itemsPerRow).fill(null).map((_, i) => {
                    const subjectIndex = startIndex + i;
                    return subjectIndex < subjects.length ? (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={subjects[subjectIndex].id}>
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
    const [isOpen, setIsOpen] = useState(false); // Renamed to isOpen for clarity
    const [subjects, setSubjects] = useState([]);
    const { user } = useUser();
    const navigate = useNavigate();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg')); // Large screen detection

    // Adjust the number of items per row based on screen size
    const getItemsPerRow = useCallback(() => {
        if (isSmallScreen) return 1;
        if (isMediumScreen) return 2;
        if (isLargeScreen) return 4; // 4 items per row for large screens
        return 3; // Default to 3 items per row
    }, [isSmallScreen, isMediumScreen, isLargeScreen]);

    useEffect(() => {
        if (user?.id) {
            fetchSubjects(user.id)
                .then(fetchedSubjects => setSubjects(fetchedSubjects))
                .catch(error => console.error("Error fetching subjects:", error));
        }
    }, [user?.id]);

    const onClose = () => setIsOpen(false); // Function to close the modal
    const onOpen = () => setIsOpen(true); // Function to open the modal

    const refreshSubjects = async () => {
        console.log("Refreshing subjects...");
        const updatedSubjects = await fetchSubjects(user.id);
        console.log("Successfully refreshed subjects");
        setSubjects(updatedSubjects);
    };

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 200; // Approximate height of each widget
    const totalRows = Math.ceil(subjects.length / itemsPerRow);

    return (
        <div className="view-container">
            <TopBar />
            <button className="fab" onClick={onOpen}>
                +
            </button>
            {isOpen && <AddSubjectForm isOpen={isOpen} onClose={onClose} refreshSubjects={refreshSubjects} />}
            <div className="subjects-grid">
                <List
                    height={600} // Adjust the height to the desired value
                    itemCount={totalRows} // Number of rows needed to display subjects
                    itemSize={rowHeight} // Adjust the row height to fit the content
                    width="100%"
                >
                    {({ index, style }) => (
                        <Row
                            index={index}
                            style={style}
                            subjects={subjects}
                            refreshSubjects={refreshSubjects}
                            itemsPerRow={itemsPerRow}
                        />
                    )}
                </List>
            </div>
        </div>
    );
};

export default SubjectsDashboard;
>>>>>>> Stashed changes
