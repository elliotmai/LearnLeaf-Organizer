// @flow
import React, { useState, useEffect } from 'react';
import { deleteTask, formatDateDisplay, formatTimeDisplay } from '/src/LearnLeaf_Functions.jsx';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore, deleteFromStore } from '/src/db.js'; // Use your IndexedDB functions
import './ArchiveDashboard.css';
import { TaskEditForm } from '/src/Components/TaskView/EditForm.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import format from 'date-fns/format';

const CustomIconButton = styled(IconButton)({
    border: '1px solid rgba(0, 0, 0, 0.23)',
    '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
});

function formatFormDate(date) {
    if (!date) return '';
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth() + 1;
    const utcDay = date.getUTCDate();
    return `${utcYear}-${String(utcMonth).padStart(2, '0')}-${String(utcDay).padStart(2, '0')}`;
}

function formatFormTime(date) {
    if (!date) return '';
    return format(date, 'HH:mm');
}

const TasksTable = ({ refreshTasks }) => {
    const { user } = useUser();
    const [tasks, setTasks] = useState([]);
    const [editedTask, setEditedTask] = useState({});
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [filterCriteria, setFilterCriteria] = useState({
        assignmentQuery: '',
        subjectQuery: '',
        projectQuery: '',
        dueDate: '',
        dueDateComparison: '',
    });

    useEffect(() => {
        const loadCompletedTasks = async () => {
            const allTasks = await getAllFromStore('tasks');
            const completedTasks = allTasks.filter(task => task.taskStatus === 'Completed');
            setTasks(completedTasks);
        };

        if (user?.id) {
            loadCompletedTasks();
        }
    }, [user?.id]);

    const filterByDate = (taskDateStr, filterDateStr, comparisonType) => {
        let taskDate = new Date(taskDateStr);
        taskDate = new Date(taskDate.getTime() - taskDate.getTimezoneOffset() * 60000).setHours(0, 0, 0, 0);

        let filterDate = new Date(filterDateStr);
        filterDate = new Date(filterDate.getTime() - filterDate.getTimezoneOffset() * 60000).setHours(0, 0, 0, 0);

        switch (comparisonType) {
            case 'before':
                return taskDate < filterDate;
            case 'before-equal':
                return taskDate <= filterDate;
            case 'equal':
                return taskDate === filterDate;
            case 'after':
                return taskDate > filterDate;
            case 'after-equal':
                return taskDate >= filterDate;
            default:
                return true;
        }
    };

    const getFilteredTasks = (tasks, filterCriteria) => {
        const filteredTasks = tasks.filter((task) => {
            const matchesAssignmentQuery = filterCriteria.assignmentQuery === '' || task.taskName.toLowerCase().includes(filterCriteria.assignmentQuery.toLowerCase());
            const matchesSubjectQuery = filterCriteria.subjectQuery === '' || task.taskSubject.subjectName.toLowerCase().includes(filterCriteria.subjectQuery.toLowerCase());
            const matchesProjectQuery = filterCriteria.projectQuery === '' || task.taskProject.projectName.toLowerCase().includes(filterCriteria.projectQuery.toLowerCase());

            let matchesDueDate = true;
            if (filterCriteria.dueDateComparison === "none") {
                matchesDueDate = !task.taskDueDate;
            } else if (filterCriteria.dueDate) {
                matchesDueDate = filterByDate(task.taskDueDate, filterCriteria.dueDate, filterCriteria.dueDateComparison);
            }

            return matchesAssignmentQuery && matchesSubjectQuery && matchesProjectQuery && matchesDueDate;
        });

        return filteredTasks;
    };

    const clearFilters = () => {
        setFilterCriteria({
            assignmentQuery: '',
            subjectQuery: '',
            projectQuery: '',
            dueDate: '',
            dueDateComparison: '',
        });
    };

    const handleEditClick = (task) => {
        const formattedDueDate = task.taskDueDate ? formatFormDate(new Date(task.taskDueDate)) : '';
        const formattedDueTime = task.taskDueTime ? formatFormTime(new Date(task.taskDueTime)) : '';
        const formattedStartDate = task.taskStartDate ? formatFormDate(new Date(task.taskStartDate)) : '';

        setEditedTask({
            ...task,
            taskDueDate: formattedDueDate,
            taskDueTime: formattedDueTime,
            taskStartDate: formattedStartDate,
        });

        setEditModalOpen(true);
    };

    const handleDeleteClick = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            try {
                await deleteTask(taskId);
                await deleteFromStore('tasks', taskId);
                refreshTasks();
            } catch (error) {
                console.error("Error deleting task:", error);
            }
        }
    };

    return (
        <>
            <div className="filter-bar">
                <div className="filter-item">
                    <label htmlFor="searchTask">Search by Name:</label>
                    <input
                        id="searchTask"
                        type="text"
                        placeholder="Search..."
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, assignmentQuery: e.target.value })}
                    />
                </div>
                <div className="filter-item">
                    <label htmlFor="searchSubject">Search by Subject:</label>
                    <input
                        id="searchSubject"
                        type="text"
                        placeholder="Search..."
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, subjectQuery: e.target.value })}
                    />
                </div>
                <div className="filter-item">
                    <label htmlFor="searchProject">Search by Project:</label>
                    <input
                        id="searchProject"
                        type="text"
                        placeholder="Search..."
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, projectQuery: e.target.value })}
                    />
                </div>
                <div className="filter-item">
                    <label htmlFor="dueDateFilter">Due Date:</label>
                    <select
                        id="dueDateFilter"
                        value={filterCriteria.dueDateComparison}
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, dueDateComparison: e.target.value })}
                    >
                        <option value="">Show All</option>
                        <option value="before">Before</option>
                        <option value="before-equal">Before or Equal to</option>
                        <option value="equal">Equal to</option>
                        <option value="after">After</option>
                        <option value="after-equal">After or Equal to</option>
                        <option value="none">None Set</option>
                    </select>
                    <input
                        type="date"
                        value={filterCriteria.dueDate}
                        onChange={(e) => setFilterCriteria({ ...filterCriteria, dueDate: e.target.value })}
                    />
                </div>

                <button onClick={clearFilters}>Clear Filters</button>
            </div>

            <TaskEditForm
                key={editedTask.taskId}
                task={editedTask}
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={(updatedTask) => {
                    const updatedTasks = tasks.map((task) =>
                        task.taskId === updatedTask.taskId ? updatedTask : task
                    );
                    setTasks(updatedTasks);
                    setEditModalOpen(false);
                    refreshTasks();
                }}
            />

            <table id="tasksTable">
                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>Name</th>
                        <th>Due Date</th>
                        <th>Due Time</th>
                        <th>Project</th>
                        <th>Edit</th>
                        <th>Delete</th>
                    </tr>
                </thead>
                <tbody>
                    {getFilteredTasks(tasks, filterCriteria).map((task, index) => (
                        <tr key={task.taskId || index}>
                            <td>{task.taskSubject.subjectName}</td>
                            <td>{task.taskName}</td>
                            <td>{task.taskDueDate ? formatDateDisplay(task.dueDate) : ''}</td>
                            <td>{task.taskDueTime ? formatTimeDisplay(task.dueTime) : ''}</td>
                            <td>{task.taskProject.projectName}</td>
                            <td>
                                <CustomIconButton aria-label="edit" onClick={() => handleEditClick(task, index)}>
                                    <EditIcon />
                                </CustomIconButton>
                            </td>
                            <td>
                                <IconButton aria-label="delete" onClick={() => handleDeleteClick(task.taskId)}>
                                    <DeleteIcon />
                                </IconButton>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

export default TasksTable;
