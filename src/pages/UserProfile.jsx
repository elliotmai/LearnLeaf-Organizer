import React, { useState, useEffect } from 'react';
import { useUser } from '/src/UserState.jsx';
import { useNavigate } from 'react-router-dom';
import { logoutUser, updateUserDetails, deleteUser } from '/src/LearnLeaf_Functions.jsx';
import TopBar from '/src/pages/TopBar.jsx';
import '/src/Components/FormUI.css';
import '/src/Components/UserProfile/UserProfile.css';

const UserProfile = () => {
    const { user, updateUser } = useUser();
    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [timeFormat, setTimeFormat] = useState(user.timeFormat || '12-Hour');
    const [dateFormat, setDateFormat] = useState(user.dateFormat || 'MM/DD/YYYY');
    const [notificationsEnabled, setNotificationsEnabled] = useState(user.notifications || false);
    const [notificationsFrequency, setNotificationFrequencies] = useState(user.notificationsFrequency || [true, false, false, false]);
    const navigate = useNavigate();

    useEffect(() => {
        console.log("User object in UserProfile:", user); // Log the user object
        setName(user.name || '');
        setEmail(user.email || '');
        setTimeFormat(user.timeFormat || '12h');
        setDateFormat(user.dateFormat || 'MM/DD/YYYY');
        setNotificationsEnabled(user.notifications || false);
        setNotificationFrequencies(user.notificationsFrequency || [true, false, false, false]);
    }, [user]);

    const handleNotificationChange = (event) => {
        const enabled = event.target.checked;
        setNotificationsEnabled(enabled);
        if (!enabled) {
            setNotificationFrequencies([true, false, false, false]);
        } else {
            setNotificationFrequencies([false, ...notificationsFrequency.slice(1)]);
        }
    };

    const handleFrequencyChange = (index) => {
        const newFrequencies = notificationsFrequency.map((freq, idx) =>
            idx === index ? !freq : freq
        );
        setNotificationFrequencies(newFrequencies);
    };

    const handleUpdateProfile = async () => {
        const userDetails = {
            id: user.id,
            name,
            email,
            timeFormat,
            dateFormat,
            notifications: notificationsEnabled,
            notificationsFrequency: notificationsFrequency
        };
        try {
            await updateUserDetails(user.id, userDetails);
            await updateUser (userDetails);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile.');
        }
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

    const handleDeleteClick = async () => {
        const confirmation = window.confirm("Are you sure you want to delete your account? This action is not reversible.");
        if (confirmation) {
            try {
                await deleteUser(user.id);
                console.log("User account and all related data deleted successfully");
                updateUser(null);
                navigate('/');
            } catch (error) {
                console.error('Account Deletion failed:', error);
            }
        }
    };

    return (
        <div className="view-container">
            <div className="user-profile">
                <TopBar />
                <div className="account-info">
                    <h3>Account Information</h3>
                    <div>
                        <label htmlFor="name">Name:</label>
                        <input type="text" id="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input type="text" id="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                </div>
                <div className="preferences">
                    <h3>Preferences</h3>
                    <div>
                        <label htmlFor="timeFormat">Time Format:</label>
                        <select id="timeFormat" value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)}>
                            <option value="12h">12-Hour</option>
                            <option value="24h">24-Hour</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="dateFormat">Date Format:</label>
                        <select id="dateFormat" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="notifications">Enable Notifications:</label>
                        <input type="checkbox" id="notifications" checked={notificationsEnabled} onChange={handleNotificationChange} />
                    </div>
                    {notificationsEnabled && (
                        <div className="notification-preferences">
                            <div className="preference-selection">
                                <label htmlFor="weekly" title="Receive updates once a week.">Weekly:</label>
                                <input type="checkbox" id="weekly" name="weekly" checked={notificationsFrequency[1]} onChange={() => handleFrequencyChange(1)} />
                            </div>
                            <div className="preference-selection">
                                <label htmlFor="daily" title="Receive updates once a day.">Daily:</label>
                                <input type="checkbox" id="daily" name="daily" checked={notificationsFrequency[2]} onChange={() => handleFrequencyChange(2)} />
                            </div>
                            <div className="preference-selection">
                                <label htmlFor="urgent" title="Receive updates of tasks due today.">Urgent:</label>
                                <input type="checkbox" id="urgent" name="urgent" checked={notificationsFrequency[3]} onChange={() => handleFrequencyChange(3)} />
                            </div>
                        </div>
                    )}
                    <button className="update" onClick={handleUpdateProfile}>Update Preferences</button>
                </div>

                <button className="deleteAcc-button" onClick={handleDeleteClick}>Delete Account</button>
            </div>
        </div>
    );
}

export default UserProfile;
