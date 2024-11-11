import React, { useEffect, useRef, useState } from 'react';
import { HotTable } from '@handsontable/react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, LinearProgress, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { parse, isValid } from 'date-fns';
import { addSubject, addProject, addTask, formatDate } from '/src/LearnLeaf_Functions.jsx';
import 'handsontable/dist/handsontable.full.min.css';

const TaskImportPopup = ({ isOpen, onClose }) => {
    const hotTableRef = useRef(null);
    const [data, setData] = useState([['', '', '', '', '', '', '', '', '']]);
    const [errorMessages, setErrorMessages] = useState([]);
    const [progress, setProgress] = useState(0);
    const [selectedCell, setSelectedCell] = useState([0, 0]);

    useEffect(() => {
        if (isOpen && hotTableRef.current) {
            setTimeout(() => {
                hotTableRef.current.hotInstance.selectCell(0, 0);
            }, 100);
        }
    }, [isOpen]);

    // Track last selected cell coordinates for paste functionality
    const handleSelection = (row, col) => setSelectedCell([row, col]);

    // Paste functionality with automatic formatting
    useEffect(() => {
        const handlePaste = (event) => {
            event.preventDefault();
            const clipboardData = event.clipboardData.getData('Text');
            const parsedData = clipboardData.split('\n').map(row => row.split('\t'));

            const hotInstance = hotTableRef.current?.hotInstance;
            if (hotInstance) {
                const [startRow, startCol] = selectedCell;

                parsedData.forEach((rowData, rowIndex) => {
                    rowData.forEach((cellData, colIndex) => {
                        const targetRow = startRow + rowIndex;
                        const targetCol = startCol + colIndex;

                        if (targetRow >= hotInstance.countRows()) hotInstance.alter('insert_row');
                        if (targetCol >= hotInstance.countCols()) hotInstance.alter('insert_col');

                        if (targetRow < hotInstance.countRows() && targetCol < hotInstance.countCols()) {
                            hotInstance.setDataAtCell(targetRow, targetCol, cellData);
                        }
                    });
                });
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [selectedCell]);

    const addTenRows = () => {
        setData(prevData => [...prevData, ...Array(10).fill(['', '', '', '', '', '', '', '', ''])]);
    };

    // Validation for each cell entry
    const validateData = () => {
        const messages = [];
        const dateFormats = [
            'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'dd/MM/yyyy', 'dd-MMM-yyyy', 'MMMM dd, yyyy',
            'MM.dd.yyyy', 'dd.MM.yyyy', 'yyyy/MM/dd'
        ];

        data.forEach((row, rowIndex) => {
            const isEmptyRow = row.every(cell => cell === null || cell === '');
            if (isEmptyRow) return; // Ignore empty rows

            if (!row[0]) messages.push(`Row ${rowIndex + 1}: Task Name is required.`);
            if (!row[4] || !['Not Started', 'In Progress', 'Completed'].includes(row[4].toLowerCase().replace(/\b\w/g, char => char.toUpperCase()))) {
                messages.push(`Row ${rowIndex + 1}: Invalid Status. Options are Not Started, In Progress, Completed.`);
            }
            if (!row[5] || !['High', 'Medium', 'Low'].includes(row[5].toLowerCase().replace(/\b\w/g, char => char.toUpperCase()))) {
                messages.push(`Row ${rowIndex + 1}: Invalid Priority. Options are High, Medium, Low.`);
            }

            // Validate dates only if not empty
            if (row[6] && !dateFormats.some(formatString => isValid(parse(row[6], formatString, new Date())))) {
                messages.push(`Row ${rowIndex + 1}: Start Date must be convertible to MM/DD/YYYY.`);
            }
            if (row[7] && !dateFormats.some(formatString => isValid(parse(row[7], formatString, new Date())))) {
                messages.push(`Row ${rowIndex + 1}: Due Date must be convertible to MM/DD/YYYY.`);
            }

            // Validate Due Time format only if not empty
            if (row[8]) {
                const validTime = /^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(row[8]) || /^\d{2}:\d{2}$/.test(row[8]);
                if (!validTime) messages.push(`Row ${rowIndex + 1}: Due Time must be in h:mm AM/PM or HH:mm format.`);
            }
        });

        setErrorMessages(messages);
        return messages.length === 0;
    };

    // Save data with formatted dates and times
    const handleSave = async () => {
        if (validateData()) {
            const validData = data.filter(row => !row.every(cell => cell === null || cell === ''));
            const uniqueSubjects = [...new Set(validData.map(row => row[2]).filter(Boolean))];
            const uniqueProjects = [...new Set(validData.map(row => row[3]).filter(Boolean))];
            const subjectMap = {};
            const projectMap = {};

            setProgress(0);
            const totalTasks = validData.length + uniqueSubjects.length + uniqueProjects.length;

            for (let subjectName of uniqueSubjects) {
                const newSubject = await addSubject({ subjectName, subjectDescription: '', subjectSemester: '', subjectColor: 'black' });
                if (newSubject?.subjectId) subjectMap[subjectName] = newSubject.subjectId;
                setProgress(prev => prev + (100 / totalTasks));
            }

            for (let projectName of uniqueProjects) {
                const newProject = await addProject({ projectName, projectDueDateInput: '', projectDueTimeInput: '', projectDescription: '', projectSubjects: ['None'] });
                if (newProject?.projectId) projectMap[projectName] = newProject.projectId;
                setProgress(prev => prev + (100 / totalTasks));
            }

            const processedData = validData.map(row => {
                let dueTime = row[8];
                const amPmMatch = dueTime?.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
                if (amPmMatch) {
                    let [_, hours, minutes, period] = amPmMatch;
                    hours = parseInt(hours, 10);
                    if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
                    dueTime = `${String(hours).padStart(2, '0')}:${minutes}`;
                }

                const capitalizeWords = (str) => {
                    return str
                        .toLowerCase()
                        .replace(/\b\w/g, char => char.toUpperCase());
                };

                return {
                    taskName: row[0],
                    taskDescription: row[1] || '',
                    taskSubject: subjectMap[row[2]] || 'None',
                    taskProject: projectMap[row[3]] || 'None',
                    taskStatus: capitalizeWords(row[4]) || 'Not Started',
                    taskPriority: capitalizeWords(row[5]) || 'Medium',
                    startDateInput: formatDate(row[6]) || '',
                    dueDateInput: formatDate(row[7]) || '',
                    dueTimeInput: dueTime
                };
            });

            for (let taskData of processedData) {
                await addTask(taskData);
                setProgress(prev => prev + (100 / totalTasks));
            }

            onClose();
            window.location.reload();
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth sx={{ zIndex: 1000 }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: "#8E5B9F", fontWeight: 'bold', fontSize: '1.5rem' }}>
                Import Tasks
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        color: 'grey.600',
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                    Please fill in the task details in the table below. You can paste data directly into the cells.
                    <br />
                    - <b>Status</b> options: Not Started, In Progress, Completed
                    <br />
                    - <b>Priority</b> options: High, Medium, Low
                    <br />
                    - <b>Date Format</b>: MM/DD/YYYY
                </Typography>

                <Box sx={{ overflowX: 'auto', position: 'relative', zIndex: 1100 }}>
                    <HotTable
                        ref={hotTableRef}
                        data={data}
                        colHeaders={['Task Name*', 'Description', 'Subject Name', 'Project Name', 'Status*', 'Priority*', 'Start Date', 'Due Date', 'Due Time']}
                        rowHeaders={true}
                        width="100%"
                        height="auto"
                        licenseKey="non-commercial-and-evaluation"
                        contextMenu={true}
                        manualColumnResize={true}
                        manualRowResize={true}
                        autoWrapRow={true}
                        minSpareRows={1}
                        colWidths={120}
                        copyPaste={true}
                        fillHandle={{ autoInsertRow: true }}
                        columns={[{}, {}, {}, {}, {}, {}, {}, {}, {}]}
                        afterSelection={(row, col) => handleSelection(row, col)}
                    />
                </Box>

                {progress > 0 && progress < 100 && (
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <LinearProgress variant="determinate" value={progress} />
                        <Typography variant="caption" display="block" textAlign="center">
                            {Math.round(progress)}% Complete
                        </Typography>
                    </Box>
                )}

                {errorMessages.length > 0 && (
                    <Box sx={{ maxHeight: '150px', overflowY: 'auto', marginTop: '1em', color: 'red' }}>
                        {errorMessages.map((error, index) => (
                            <Typography key={index} variant="body2">{error}</Typography>
                        ))}
                    </Box>
                )}

            </DialogContent>
            <DialogActions>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Button
                        onClick={addTenRows}
                        variant="text"
                        sx={{
                            color: '#8E5B9F',
                            '&:hover': {
                                backgroundColor: '#8E5B9F',
                                color: '#fff',
                                transform: 'scale(1.03)',
                            },
                            mt: 2,
                        }}
                    >
                        Add 10 Rows
                    </Button>
                    <Box>
                        <Button
                            onClick={onClose}
                            sx={{
                                color: '#F3161E',
                                '&:hover': {
                                    backgroundColor: '#F3161E',
                                    color: '#fff',
                                    transform: 'scale(1.03)',
                                },
                                mt: 2,
                                mr: 1,
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            sx={{
                                backgroundColor: '#B6CDC8',
                                color: '#355147',
                                '&:hover': {
                                    backgroundColor: '#B6CDC8',
                                    transform: 'scale(1.03)',
                                },
                                mt: 2,
                            }}
                        >
                            Save
                        </Button>
                    </Box>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default TaskImportPopup;
