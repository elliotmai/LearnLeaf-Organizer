// LMSConnectPopup.jsx
import React, { useState } from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const LMSConnectPopup = ({ isOpen, onClose }) => {
  const [selectedLMS, setSelectedLMS] = useState('Canvas');
  const [icalLink, setIcalLink] = useState('');
  const [loading, setLoading] = useState(false);

  const instructions = {
    Canvas: `To get your iCal link from Canvas:\n
      1. Go to your Canvas Calendar.\n
      2. Click on "Calendar Feed" at the bottom of the page.\n
      3. Copy the iCal URL provided.`,
  };

  const handleLMSChange = (event) => {
    setSelectedLMS(event.target.value);
  };

  const handleLinkChange = (event) => {
    setIcalLink(event.target.value);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    if (selectedLMS === 'Canvas') {
      const { default: CanvasParse } = await import('/src/Components/LMSHandling/CanvasParse');
      try {
        await CanvasParse({ icalUrl: icalLink });
      } catch (error) {
        console.error("Parsing failed:", error);
      } finally {
        setLoading(false);
        onClose();
        // window.location.reload();
      }
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
          sx={{
            color: 'grey.600',
          }}
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
          {/* Additional LMS options can be added here */}
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
          label="Paste your iCal link here"
          value={icalLink}
          onChange={handleLinkChange}
          placeholder="https://your-calendar-link.ics"
          fullWidth
          margin="normal"
          required
        />

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
            disabled={loading || !icalLink} // Prevent submission if loading or no link is provided
          >
            Submit
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default LMSConnectPopup;
