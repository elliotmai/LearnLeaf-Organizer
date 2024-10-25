import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState, useEffect } from 'react';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import TasksTable from '/src/Components/ArchivePage/ArchivedTaskTable.jsx';
import ArchivedSubjectWidget from '/src/Components/ArchivePage/ArchivedSubjectWidget.jsx';
import ArchivedProjectWidget from '/src/Components/ArchivePage/ArchivedProjectWidget.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import { getAllFromStore } from '/src/db.js'; // Use your IndexedDB functions
import '/src/Components/ArchivePage/ArchiveDashboard.css';

const ArchivedItemsPage = () => {
    const { user, updateUser } = useUser();
    const navigate = useNavigate();
    const [archivedTasks, setArchivedTasks] = useState([]);
    const [archivedSubjects, setArchivedSubjects] = useState([]);
    const [archivedProjects, setArchivedProjects] = useState([]);
    const [showTasks, setShowTasks] = useState(false);
    const [showSubjects, setShowSubjects] = useState(false);
    const [showProjects, setShowProjects] = useState(false);

    const toggleSection = (section) => {
        if (section === 'tasks-content') {
            setShowTasks(!showTasks);
        } else if (section === 'subjects-content') {
            setShowSubjects(!showSubjects);
        } else if (section === 'projects-content') {
            setShowProjects(!showProjects);
        }
    };

    // Fetch archived tasks from IndexedDB where taskStatus is 'Completed'
    useEffect(() => {
        const loadArchivedTasks = async () => {
            const tasks = await getAllFromStore('tasks'); // Get tasks from IndexedDB
            const completedTasks = tasks.filter(task => task.taskStatus === 'Completed');
            setArchivedTasks(completedTasks);
        };

        if (user?.id) {
            loadArchivedTasks();
        }
    }, [user?.id]);

    // Refresh archived tasks
    const refreshTasks = async () => {
        const tasks = await getAllFromStore('tasks');
        const completedTasks = tasks.filter(task => task.taskStatus === 'Completed');
        setArchivedTasks(completedTasks);
    };

    // Fetch archived subjects from IndexedDB where subjectStatus is 'Archived'
    useEffect(() => {
        const loadArchivedSubjects = async () => {
            const subjects = await getAllFromStore('subjects'); // Get subjects from IndexedDB
            const archivedSubjects = subjects.filter(subject => subject.subjectStatus === 'Archived');
            setArchivedSubjects(archivedSubjects);
        };

        if (user?.id) {
            loadArchivedSubjects();
        }
    }, [user?.id]);

    // Refresh archived subjects
    const refreshSubjects = async () => {
        const subjects = await getAllFromStore('subjects');
        const archivedSubjects = subjects.filter(subject => subject.subjectStatus === 'Archived');
        setArchivedSubjects(archivedSubjects);
    };

    // Fetch archived projects from IndexedDB where projectStatus is 'Archived'
    useEffect(() => {
        const loadArchivedProjects = async () => {
            const projects = await getAllFromStore('projects'); // Get projects from IndexedDB
            const archivedProjects = projects.filter(project => project.projectStatus === 'Archived');
            setArchivedProjects(archivedProjects);
        };

        if (user?.id) {
            loadArchivedProjects();
        }
    }, [user?.id]);

    // Refresh archived projects
    const refreshProjects = async () => {
        const projects = await getAllFromStore('projects');
        const archivedProjects = projects.filter(project => project.projectStatus === 'Archived');
        setArchivedProjects(archivedProjects);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            updateUser(null);
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <>
            <div className="content-container">
                <TopBar />
                <h1 className="label">{user.name}'s Archives</h1>
                <div className="section">
                    <div className="section-header" onClick={() => toggleSection('tasks-content')}>Tasks</div>
                    <div id="tasks-content" className="section-content" style={{ display: showTasks ? 'block' : 'none' }}>
                        <TasksTable tasks={archivedTasks} refreshTasks={refreshTasks} />
                    </div>
                </div>
                <div className="section">
                    <h2 className="section-header" onClick={() => toggleSection('subjects-content')}>Subjects</h2>
                    <div id="subjects-grid" className="section-content" style={{ display: showSubjects ? 'grid' : 'none' }}>
                        {archivedSubjects.map(subject => (
                            <ArchivedSubjectWidget key={subject.subjectId} subject={subject} reactivateSubject={refreshSubjects} />
                        ))}
                    </div>
                </div>
                <div className="section">
                    <h2 className="section-header" onClick={() => toggleSection('projects-content')}>Projects</h2>
                    <div id="projects-grid" className="section-content" style={{ display: showProjects ? 'grid' : 'none' }}>
                        {archivedProjects.map(project => (
                            <ArchivedProjectWidget key={project.projectId} project={project} reactivateProject={refreshProjects} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ArchivedItemsPage;
