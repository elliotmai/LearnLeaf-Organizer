import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '/src/UserState.jsx';
import { getAllFromStore, getFromStore, saveToStore, deleteFromStore } from '/src/db.js'; // Import IndexedDB functions
import TasksTable from '/src/Components/TaskView/TaskTable.jsx';
import { AddTaskForm } from '/src/Components/TaskView/AddTaskForm.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';

const ProjectTasks = () => {
    const [pageProject, setPageProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isAddTaskFormOpen, setIsAddTaskFormOpen] = useState(false);
    const { user } = useUser();
    const { projectId } = useParams();

    useEffect(() => {
        const loadProjectAndTasks = async () => {
            const allSubjects = await getFromStore('subjects');
            const activeSubjects = allSubjects.filter((subject) =>
                subject.subjectStatus === 'Active');
            setSubjects(activeSubjects);

            const allProjects = await getAllFromStore('projects');
            const activeProjects = allProjects.filter((project) =>
                project.projectStatus === 'Active');
            setProjects(activeProjects);

            const storedProject = await getFromStore('projects', projectId);
            if (storedProject) {
                setPageProject(storedProject);
                const projectTasks = await getAllFromStore('tasks');
                const filteredTasks = projectTasks.filter((task) =>
                    task.taskProject === storedProject.projectName && task.taskStatus !== 'Completed'
                );
                setTasks(filteredTasks);
            } else {
                console.error(`Project with ID ${projectId} not found`);
                setProject(null);
            }
        };

        if (user?.id && projectId) {
            loadProjectAndTasks();
        }
    }, [user?.id, projectId]);

    const refreshTasks = async () => {
        const projectTasks = await getAllFromStore('tasks');
        const filteredTasks = projectTasks.filter((task) =>
            task.taskProject === pageProject.projectName && task.taskStatus !== 'Completed'
        );
        setTasks(filteredTasks);
    };

    const toggleFormVisibility = () => setIsAddTaskFormOpen(!isAddTaskFormOpen);

    const handleCloseAddTaskForm = () => setIsAddTaskFormOpen(false);

    const handleAddTask = async (newTask) => {
        await saveToStore('tasks', [newTask]);
        await refreshTasks();
    };

    const handleDeleteTask = async (taskId) => {
        const confirmation = window.confirm("Are you sure you want to delete this task?");
        if (confirmation) {
            await deleteFromStore('tasks', taskId);
            await refreshTasks();
        }
    };

    const updateTaskInState = async (updatedTask) => {
        await saveToStore('tasks', [updatedTask]);
        await refreshTasks();
    };

    return (
        <div className="view-container">
            <TopBar />
            <button className="fab" onClick={toggleFormVisibility}>+</button>
            {isAddTaskFormOpen && (
                <AddTaskForm
                    subjects={subjects}
                    isOpen={isAddTaskFormOpen}
                    onClose={handleCloseAddTaskForm}
                    onAddTask={handleAddTask}
                    initialProject={project?.projectName}
                />
            )}

            <div>
                <h1 style={{ color: '#907474' }}>
                    {project ? `Upcoming Tasks for ${pageProject.projectName}` : 'Loading project...'}
                </h1>

                {pageProject ? (
                    <TasksTable
                        tasks={tasks}
                        subjects={subjects}
                        projects={projects}
                        refreshTasks={refreshTasks}
                        onDelete={handleDeleteTask}
                        onUpdateTask={updateTaskInState}
                    />
                ) : (
                    <Grid container alignItems="center" justifyContent="center" direction="column" style={{ minHeight: '150px' }}>
                        <CircularProgress />
                        <p>Loading tasks...</p>
                    </Grid>
                )}
            </div>
        </div>
    );
};

export default ProjectTasks;