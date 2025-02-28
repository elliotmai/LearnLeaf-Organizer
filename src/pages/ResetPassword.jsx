import logo from '/src/LearnLeaf_Name_Logo_Wide.png';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword } from '/src/LearnLeaf_Functions.jsx';
import { useMediaQuery, useTheme } from '@mui/material';

function ResetPassword() {
    // State for each input field
    const [email, setEmail] = useState('');
    const navigate = useNavigate(); // Create the navigation function

    // Function to handle form submission
    const handleSubmit = (event) => {
        event.preventDefault(); // Prevent the default form submission behavior

        resetPassword(email)
            .then(() => {
                // Show a popup to inform the user
                alert('A reset password link has been sent to your email. Please check your inbox.');

                // Navigate to the login page after showing the alert
                navigate('/');
            })
            .catch((error) => {
                // Handle the error, possibly by showing a message to the user
                console.error('Error resetting password:', error);
                alert('Failed to send the reset password link. Please try again.');
            });

        // Clear the input field
        setEmail('');
    };

    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('lg'));
    const logoStyle = {
        width: isSmallScreen ? '50%' : '30%',
        display: 'block',
        margin: 'auto',
    };

    return (
        <div className="login-form-container">
            <div className="top-bar">
                <img src={logo} alt="LearnLeaf_name_logo" style={logoStyle}/>
            </div>
            <h2 style={{ color: '#907474' }}>Reset Password</h2>
            <form className="form-group" onSubmit={handleSubmit}>
                <div className="form-inputs">
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Reset</button>
            </form>
        </div>
    );
}

export default ResetPassword;