// TopBar.jsx
import React, { useState } from 'react';
import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import { useMediaQuery, useTheme, Menu, MenuItem, IconButton, Box, Typography, Grid } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '/src/LearnLeaf_Functions.jsx';
import '/src/Components/PageFormat.css';
import '/src/App.css';

const TopBar = () => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const handleLogout = async () => {
        try {
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
            <Grid 
                container 
                alignItems="center" 
                justifyContent="center" 
                sx={{ position: 'relative' }} >
                {/* Menu Icon positioned absolutely to the left */}
                <IconButton
                    color="inherit"
                    aria-label="menu"
                    onClick={handleMenuOpen}
                    sx={{
                        color: '#9F6C5B',
                        position: 'absolute',
                        left: '5%',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: '50%' },
                    }}
                >
                    <MenuIcon sx={{ fontSize: 40 }} />
                </IconButton>

                {/* Centered Logo */}
                <Grid item>
                    <a href="/tasks">
                        <img src={logo} alt="LearnLeaf_name_logo" style={logoStyle} />
                    </a>
                </Grid>
            </Grid>

            {/* Dropdown Menu */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: { sx: { width: 200, padding: 1, ml: 2 } },
                }}
            >
                <MenuItem onClick={() => { navigate('/tasks'); handleMenuClose(); }}>Tasks</MenuItem>
                {!isSmallScreen && <MenuItem onClick={() => { navigate('/calendar'); handleMenuClose(); }}>Calendar</MenuItem>}
                <MenuItem onClick={() => { navigate('/subjects'); handleMenuClose(); }}>Subjects</MenuItem>
                <MenuItem onClick={() => { navigate('/projects'); handleMenuClose(); }}>Projects</MenuItem>
                {!isSmallScreen && <MenuItem onClick={() => { navigate('/archives'); handleMenuClose(); }}>Archives</MenuItem>}
                <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>User Profile</MenuItem>
                <MenuItem onClick={handleLogout} sx={{ color: '#F3161E', fontWeight: 'bold' }}>Logout</MenuItem>
            </Menu>
        </Box>
    );
};

export default TopBar;