// LMSConnectPopup.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  IconButton,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CanvasParse from '/src/Components/LMSHandling/CanvasParse'; // Static import of CanvasParse
import { updateUserDetails } from '/src/LearnLeaf_Functions.jsx';

const LMSConnectPopup = ({ isOpen, onClose }) => {
  const [selectedLMS, setSelectedLMS] = useState('Canvas');
  const [icalLink, setIcalLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [existingURLs, setExistingURLs] = useState([]);
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [entryName, setEntryName] = useState('');

  const instructions = {
    Canvas: `To get your iCal link from Canvas:\n
      1. Go to your Canvas Calendar.\n
      2. Click on "Calendar Feed" at the bottom of the page.\n
      3. Copy the iCal URL provided.`,
  };

  useEffect(() => {
    // Retrieve user data from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
      // Extract existing iCal URLs for the selected LMS
      setExistingURLs(storedUser.icsURLs?.[selectedLMS] ? Object.entries(storedUser.icsURLs[selectedLMS]) : []);
    }
  }, [selectedLMS]);

  const handleLMSChange = (event) => {
    setSelectedLMS(event.target.value);
    setError(null);
    setIsNewEntry(false);
    setExistingURLs(user?.icsURLs?.[event.target.value] ? Object.entries(user.icsURLs[event.target.value]) : []);
  };

  const handleNewEntry = () => {
    setIsNewEntry(true);
    // setIcalLink(''); // Ensure the iCal link is empty until the user inputs one
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null); // Reset any previous error

    // Ensure user selects an existing URL or enters a new one
    if (!isNewEntry && !icalLink) {
      setError('Please select an existing URL or add a new one.');
      setLoading(false);
      return;
    }

    // Regex for basic URL validation with common domains (e.g., .com, .org, etc.)
    const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z.]{2,6})(\/[\w.-]*)*\/?.ics$/i;

    if (isNewEntry && (!urlPattern.test(icalLink) || !entryName.trim())) {
      setError('Invalid entry. Ensure name and a valid iCal URL ending in .ics are provided.');
      setLoading(false);
      return;
    }
    else if ((!urlPattern.test(icalLink))) {
      setError('Invalid URL. Please enter a valid iCal URL ending in .ics');
      setLoading(false);
      return;
    }

    // Prepare updated iCal URLs by merging new data
    const updatedICSURLs = {
      ...user.icsURLs,
      [selectedLMS]: {
        ...user.icsURLs?.[selectedLMS],
        ...(isNewEntry ? { [entryName]: icalLink } : {}),
      },
    };

    try {
      await updateUserDetails(user.id, { icsURLs: updatedICSURLs });
      setUser({ ...user, icsURLs: updatedICSURLs });
      localStorage.setItem('user', JSON.stringify({ ...user, icsURLs: updatedICSURLs }));
      if (selectedLMS === "Canvas") {
        await CanvasParse({ icalUrl: icalLink });
      }
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Operation failed:', error);
      setError('An error occurred while saving or parsing the iCal link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#8E5B9F',
          fontWeight: 'bold',
          fontSize: '1.5rem',
        }}
      >
        Connect LMS Calendar
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'grey.600' }}
          disabled={loading} // Prevent closing the dialog while loading
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <TextField
          select
          label="Select LMS"
          value={selectedLMS}
          onChange={handleLMSChange}
          fullWidth
          margin="normal"
        >
          <MenuItem value="Canvas">Canvas</MenuItem>
          {/* Add more LMS options here */}
        </TextField>

        <Typography variant="body1" color="textSecondary" sx={{ mt: 2, mb: 2 }}>
          {instructions[selectedLMS]
            .split('\n')
            .map((line, index) => (
              <React.Fragment key={index}>
                {line}
                <br />
              </React.Fragment>
            ))}
        </Typography>

        <TextField
          select
          label="Select an existing iCal URL or add new"
          value={isNewEntry ? 'new' : icalLink}
          onChange={(e) => {
            if (e.target.value === 'new') {
              handleNewEntry();
            } else {
              setIsNewEntry(false);
              setIcalLink(e.target.value);
            }
          }}
          fullWidth margin="normal"
        >
          {existingURLs.map(([key, url]) => (
            <MenuItem key={key} value={url}>{key}</MenuItem>
          ))}
          <MenuItem
            value="new"
          >
            Add New
          </MenuItem>
        </TextField>

        {isNewEntry && (
          <>
            <TextField
              label="Name"
              value={entryName}
              onChange={(e) => setEntryName(e.target.value)}
              placeholder='e.g., UTA Canvas'
              fullWidth
              margin="normal"
              required />
            <TextField
              label="Paste your iCal link here"
              value={icalLink}
              onChange={(e) => {
                const newUrl = e.target.value;
                setIcalLink(newUrl);
                if (existingURLs.some(([_, url]) => url === newUrl)) {
                  setError('This iCal link has already been added.');
                } else {
                  setError(null);
                }
              }} 
              placeholder="https://your-calendar-link.ics"
              fullWidth margin="normal"
              required
            />
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Show loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress color="secondary" />
            <Typography sx={{ ml: 2 }}>Loading data...</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button
            onClick={onClose}
            sx={{
              color: '#F3161E',
              '&:hover': {
                backgroundColor: '#F3161E',
                color: '#fff',
                transform: 'scale(1.03)',
              },
              mt: 1,
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFormSubmit}
            variant="contained"
            sx={{
              backgroundColor: '#B6CDC8',
              color: '#355147',
              '&:hover': {
                backgroundColor: '#8E5B9F',
                color: '#fff',
                transform: 'scale(1.03)',
              },
              mt: 1,
            }}
            disabled={loading || !icalLink || error} // Prevent submission if loading or no link is provided
          >
            Submit
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default LMSConnectPopup;
