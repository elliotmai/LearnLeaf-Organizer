import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '/src/UserState.jsx';
import { fetchSubjects } from '/src/LearnLeaf_Functions.jsx';
import { AddSubjectForm } from '/src/Components/SubjectView/AddSubjectForm.jsx';
import SubjectWidget from '/src/Components/SubjectView/SubjectWidget.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import SubjectFilterBar from './SubjectFilterBar';
import { Grid, useMediaQuery, useTheme } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
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
    const [isOpen, setIsOpen] = useState(false); // Renamed to isOpen for clarity
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

    // Adjust the number of items per row based on screen size
    const getItemsPerRow = useCallback(() => {
        if (isSmallScreen) return 1;
        if (isMediumScreen) return 2;
        if (isLargeScreen) return 3;
        if (isXLargeScreen) return 4;
        return 3; // Default to 3 items per row
    }, [isSmallScreen, isMediumScreen, isLargeScreen, isXLargeScreen]);

    const loadFromLocalStorage = () => {
        // Parse and filter subjects, projects, and tasks from localStorage
        const activeSubjects = (JSON.parse(localStorage.getItem('subjects')) || [])
            .filter(subject => subject.subjectStatus === 'Active');

        // Check if localStorage contains the required data
        if (activeSubjects.length > 0) {
            setSubjects(activeSubjects);
            setIsLoading(false);
            console.log('Data loaded from localStorage');
            return true; // Indicate that data was loaded from localStorage
        }

        return false; // Indicate that localStorage didn't have the data
    };

    const fetchData = async () => {
        try {
            // Fetch subjects from Firestore
            const fetchedSubjects = await fetchSubjects(null, 'Active');
            setSubjects(fetchedSubjects);

            // Store fetched data in localStorage for future use
            localStorage.setItem('subjects', JSON.stringify(fetchedSubjects));

            setIsLoading(false);
            console.log('Data fetched and saved to localStorage');
        } catch (error) {
            console.error('Error fetching data:', error);
            setIsLoading(false); // Handle error and stop loading
        }
    };

    const updateState = async () => {
        setIsLoading(true);

        // Try to load data from localStorage first, if not available, fetch from Firestore
        const isLoadedFromLocalStorage = loadFromLocalStorage();
        if (!isLoadedFromLocalStorage) {
            fetchData(); // Fetch from Firestore if localStorage data is not available
        }
    }

    useEffect(() => {
        if (user?.id) {
            updateState();
        }
    }, [user?.id]);

    const onClose = () => setIsOpen(false); // Function to close the modal
    const onOpen = () => setIsOpen(true); // Function to open the modal

    const getFilteredSubjects = (subjects, filterCriteria) => {
        return subjects.filter((subject) => {
            const matchesSearchSubject = filterCriteria.searchSubject === '' || subject.subjectName.toLowerCase().includes(filterCriteria.searchSubject.toLowerCase());
            const matchesSearchSemester = filterCriteria.searchSemester === '' || subject.subjectSemester.toLowerCase().includes(filterCriteria.searchSemester.toLowerCase())
            const matchesSearchDescription = filterCriteria.searchDescription === '' || subject.subjectDescription.toLowerCase().includes(filterCriteria.searchDescription.toLowerCase())

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

    // Function to update a task and update both localStorage and state
    const handleSubject = () => {

        updateState();

        console.log("Subject updated, state and localStorage updated");
    };

    const itemsPerRow = getItemsPerRow();
    const rowHeight = 280; // Approximate height of each widget
    const filteredSubjects = getFilteredSubjects(subjects, filterCriteria);
    // console.log(filteredSubjects.length);
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
                        <p>Loading tasks...</p>
                    </Grid>
                ) : (
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
