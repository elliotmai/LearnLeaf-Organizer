import React, { useState } from 'react';
import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import { useMediaQuery, useTheme, MenuItem, IconButton, Box, Typography, Grid, Popover, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '/src/LearnLeaf_Functions.jsx';
import TaskImportPopup from '/src/Components/TaskView/TaskImportPopup';
import LMSConnectPopup from '/src/Components/LMSConnectPopup';
import SplashScreen from '../SplashScreen';

const TopBar = () => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [showSplashScreen, setShowSplashScreen] = useState(false);

    const [menuOpen, setMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [isTaskImportOpen, setIsTaskImportOpen] = useState(false);
    const [isLMSConnectOpen, setIsLMSConnectOpen] = useState(false);

    const handleMenuToggle = (event) => {
        if (menuOpen) {
            setAnchorEl(null);
        } else {
            setAnchorEl(event.currentTarget);
        }
        setMenuOpen(!menuOpen);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuOpen(false);
    };

    const handleLogout = async () => {
        try {
            setShowSplashScreen(true);
            await logoutUser();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            handleMenuClose();
        }
    };

    const logoStyle = {
        width: isSmallScreen ? '40%' : '40%',
        display: 'block',
        margin: 'auto',
    };

    return (
        <Box sx={{ width: '100%', backgroundColor: '#B6CDC8', paddingY: '8px', textAlign: 'center' }}>
            {/* {showSplashScreen && <SplashScreen />} */}

            <Grid container alignItems="center" justifyContent="center" sx={{ position: 'relative' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        position: 'absolute',
                        left: '5%',
                    }}
                    onClick={handleMenuToggle}

                >
                    {/* Menu Icon */}
                    <IconButton
                        color="inherit"
                        aria-label="menu"
                        sx={{
                            color: '#9F6C5B',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: '50%' },
                        }}
                    >
                        <MenuIcon sx={{ fontSize: 40 }} />
                    </IconButton>

                    {/* Popover Menu */}
                    <Popover
                        open={menuOpen}
                        anchorEl={anchorEl}
                        onClose={handleMenuClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    >
                        <Box onMouseLeave={handleMenuClose} sx={{ width: 200, padding: 1, ml: 2 }}>
                            <MenuItem onClick={() => { navigate('/tasks'); handleMenuClose(); }}>
                                Tasks
                            </MenuItem>

                            {/* Indented Task Import Button */}
                            {!isSmallScreen &&
                                <Button
                                    onClick={() => { setIsTaskImportOpen(true); handleMenuClose(); }}
                                    sx={{
                                        color: 'text.primary',
                                        textTransform: 'none',
                                        fontSize: '0.875rem',
                                        textAlign: 'left',
                                        pl: 4, // Indentation effect
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                        backgroundColor: 'transparent',
                                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
                                    }}
                                >
                                    Import Tasks
                                </Button>
                            }

                            {!isSmallScreen &&
                                <Button
                                    onClick={() => { setIsLMSConnectOpen(true); handleMenuClose(); }}
                                    sx={{
                                        color: 'text.primary',
                                        textTransform: 'none',
                                        fontSize: '0.875rem',
                                        textAlign: 'left',
                                        pl: 4, // Indentation effect
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                        backgroundColor: 'transparent',
                                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
                                    }}
                                >
                                    Connect Account
                                </Button>
                            }

                            {!isSmallScreen && <MenuItem onClick={() => { navigate('/calendar'); handleMenuClose(); }}>Calendar</MenuItem>}
                            <MenuItem onClick={() => { navigate('/subjects'); handleMenuClose(); }}>Subjects</MenuItem>
                            <MenuItem onClick={() => { navigate('/projects'); handleMenuClose(); }}>Projects</MenuItem>
                            {!isSmallScreen && <MenuItem onClick={() => { navigate('/archives'); handleMenuClose(); }}>Archives</MenuItem>}
                            <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>User Profile</MenuItem>
                            <MenuItem onClick={handleLogout} sx={{ color: '#F3161E', fontWeight: 'bold' }}>Logout</MenuItem>
                        </Box>
                    </Popover>
                </Box>

                {/* Centered Logo */}
                <Grid item>
                    <a href="/tasks">
                        <img src={logo} alt="LearnLeaf_name_logo" style={logoStyle} />
                    </a>
                </Grid>
            </Grid>

            {/* Task Import Popup */}
            {isTaskImportOpen && <TaskImportPopup isOpen={isTaskImportOpen} onClose={() => setIsTaskImportOpen(false)} />}

            {/* LMS Connect Popup */}
            {isLMSConnectOpen && <LMSConnectPopup isOpen={isLMSConnectOpen} onClose={() => setIsLMSConnectOpen(false)} />}
        </Box>
    );
};

export default TopBar;