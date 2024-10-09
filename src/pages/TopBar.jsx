<<<<<<< Updated upstream
import React from 'react';
import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import { useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '/src/LearnLeaf_Functions.jsx'; // Add any necessary imports for logoutUser
import '/src/Components/PageFormat.css';
import '/src/App.css';

const TopBar = () => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // Detect if screen size is small
    const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md')); // Detect if screen size is medium
    const isLargeScreen = useMediaQuery(theme.breakpoints.up('md')); // Detect if screen size is large
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Define the logo style based on screen size
    const logoStyle = {
        width: isSmallScreen ? '95%' : isMediumScreen ? '70%' : '55%',
    };

    return (
        <div className="top-bar">
            <a href="/tasks">
                <img src={logo} alt="LearnLeaf_name_logo" style={logoStyle} />
            </a>
            <div className="top-navigation">
                <nav className="nav-links">
                    <a href="/tasks">Tasks</a>
                    {!isSmallScreen && <a href="/calendar">Calendar</a>}
                    <a href="/subjects">Subjects</a>
                    <a href="/projects">Projects</a>
                    {!isSmallScreen && <a href="/archives">Archives</a>}
                    <a href="/profile">User Profile</a>
                </nav>
                <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>
        </div>
    );
};

export default TopBar;
=======
import React from 'react';
import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import { useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '/src/LearnLeaf_Functions.jsx'; // Add any necessary imports for logoutUser
import '/src/Components/PageFormat.css';
import '/src/App.css';

const TopBar = () => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // Detect if screen size is small
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
            // Assuming you have a method to update user context
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="top-bar">
            <a href="/tasks">
                <img src={logo} alt="LearnLeaf_name_logo" />
            </a>
            <div className="top-navigation">
                <nav className="nav-links">
                    <a href="/tasks">Tasks</a>
                    {!isSmallScreen && <a href="/calendar">Calendar</a>}
                    <a href="/subjects">Subjects</a>
                    <a href="/projects">Projects</a>
                    {!isSmallScreen && <a href="/archives">Archives</a>}
                    <a href="/profile">User Profile</a>
                </nav>
                <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>
        </div>
    );
};

export default TopBar;
>>>>>>> Stashed changes
