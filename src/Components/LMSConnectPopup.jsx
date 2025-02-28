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
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Dialog as ConfirmationDialog,
  DialogContentText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { updateUserDetails } from '/src/LearnLeaf_Functions.jsx';
import { getFunctions, httpsCallable } from "firebase/functions";

const LMSConnectPopup = ({ isOpen, onClose }) => {
  const [selectedLMS, setSelectedLMS] = useState('Canvas');
  const [icalLink, setIcalLink] = useState('');
  const [entryName, setEntryName] = useState('');
  const [newEntryName, setNewEntryName] = useState('');
  const [newIcalLink, setNewIcalLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [existingURLs, setExistingURLs] = useState([]);
  const [manageCalendarsOpen, setManageCalendarsOpen] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [refreshing, setRefreshing] = useState({});

  const instructions = {
    Canvas: `To get your iCal link from Canvas:\n
      1. Go to your Canvas Calendar.\n
      2. Click on "Calendar Feed" at the bottom of the page.\n
      3. Copy the iCal URL provided.`,
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
      setExistingURLs(Object.entries(storedUser.icsURLs?.[selectedLMS] || {}));
    }
  }, [selectedLMS]);

  const validateURL = (url) => {
    return /^(https?:\/\/)?([\w.-]+)\.([a-z.]{2,6})(\/[\w.-]*)*\/?.ics$/i.test(url);
  };

  const handleNewAccountSubmit = async () => {
    if (!newEntryName.trim() || !validateURL(newIcalLink)) {
      setError('Invalid name or URL. Ensure it ends in .ics.');
      return;
    }

    setLoading(true);
    setError(null);

    const updatedICSURLs = {
      ...user.icsURLs,
      [selectedLMS]: {
        ...user.icsURLs?.[selectedLMS],
        [newEntryName]: newIcalLink,
      },
    };

    try {
      await updateUserDetails(user.id, { icsURLs: updatedICSURLs });
      setUser({ ...user, icsURLs: updatedICSURLs });
      localStorage.setItem('user', JSON.stringify({ ...user, icsURLs: updatedICSURLs }));
      setExistingURLs(Object.entries(updatedICSURLs[selectedLMS]));

      const functions = getFunctions();
      const processICalFromPopup = httpsCallable(functions, "processICalFromPopup");
      await processICalFromPopup({ userId: user.id, icalUrl: newIcalLink });

      setNewEntryName('');
      setNewIcalLink('');
    } catch (error) {
      console.error('Failed to update:', error);
      setError('Error saving the iCal link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async (oldName, newName, newUrl) => {
    if (!newName.trim() || !validateURL(newUrl)) {
      setError('Invalid name or URL. Ensure it ends in .ics.');
      return;
    }

    setLoading(true);
    const updatedICSURLs = { ...user.icsURLs };
    delete updatedICSURLs[selectedLMS][oldName];
    updatedICSURLs[selectedLMS][newName] = newUrl;

    try {
      await updateUserDetails(user.id, { icsURLs: updatedICSURLs });
      setUser({ ...user, icsURLs: updatedICSURLs });
      localStorage.setItem('user', JSON.stringify({ ...user, icsURLs: updatedICSURLs }));
      setExistingURLs(Object.entries(updatedICSURLs[selectedLMS]));
      setEditMode(null);
    } catch (error) {
      console.error('Failed to update:', error);
      setError('Error saving changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (name, url) => {
    setRefreshing((prev) => ({ ...prev, [name]: true }));

    try {
      const functions = getFunctions();
      const processICalFromPopup = httpsCallable(functions, "processICalFromPopup");
      await processICalFromPopup({ userId: user.id, icalUrl: url });
    } catch (error) {
      console.error('Failed to refresh:', error);
      setError('Error refreshing the calendar.');
    } finally {
      setRefreshing((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    const updatedICSURLs = { ...user.icsURLs };
    delete updatedICSURLs[selectedLMS][deleteTarget];

    try {
      await updateUserDetails(user.id, { icsURLs: updatedICSURLs });
      setUser({ ...user, icsURLs: updatedICSURLs });
      localStorage.setItem('user', JSON.stringify({ ...user, icsURLs: updatedICSURLs }));
      setExistingURLs(Object.entries(updatedICSURLs[selectedLMS]));
    } catch (error) {
      console.error('Deletion failed:', error);
      setError('Error deleting the iCal link.');
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <DialogTitle sx={{ color: "#8E5B9F", fontWeight: 'bold' }}>
        Connect LMS Calendar
        <IconButton onClick={onClose} disabled={loading} sx={{ float: 'right' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <TextField select label="Select LMS" value={selectedLMS} onChange={(e) => setSelectedLMS(e.target.value)} fullWidth margin="normal">
          <MenuItem value="Canvas">Canvas</MenuItem>
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

        <TextField label="Name" value={newEntryName} onChange={(e) => setNewEntryName(e.target.value)} fullWidth margin="normal" required />
        <TextField label="iCal URL" value={newIcalLink} onChange={(e) => setNewIcalLink(e.target.value)} fullWidth margin="normal" required />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Button variant="contained" fullWidth sx={{
          mt: 2, backgroundColor: '#B6CDC8',
          color: '#355147',
          '&:hover': {
            backgroundColor: '#B6CDC8',
            transform: 'scale(1.03)',
          },
        }} onClick={handleNewAccountSubmit}>
          Connect Account
        </Button>

        <Button fullWidth onClick={() => setManageCalendarsOpen(!manageCalendarsOpen)} sx={{ mt: 2, color: '#355147' }}>
          {manageCalendarsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />} Manage Calendars
        </Button>

        <Collapse in={manageCalendarsOpen}>
          <List>
            {existingURLs.length > 0 ? (
              existingURLs.map(([name, url]) => (
                <ListItem key={name}>
                  {editMode === name ? (
                    <>
                      <TextField
                        value={entryName}
                        onChange={(e) => setEntryName(e.target.value)}
                        margin="normal"
                      />
                      <TextField
                        value={icalLink}
                        onChange={(e) => setIcalLink(e.target.value)}
                        margin="normal"
                      />
                      <IconButton onClick={() => handleEditSave(name, entryName, icalLink)}>
                        <SaveIcon />
                      </IconButton>
                      <IconButton onClick={() => setEditMode(null)}>
                        <CancelIcon />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <ListItemText
                        primary={name}
                        secondary={
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '80%',
                              display: 'block'
                            }}
                          >
                            {url}
                          </Typography>
                        }
                      />

                      <ListItemSecondaryAction>
                        <Tooltip title="Refresh">
                          <IconButton onClick={() => handleRefresh(name, url)} disabled={refreshing[name]}>
                            {refreshing[name] ? <CircularProgress size={20} /> : <RefreshIcon  color='secondary'/>}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => { setEditMode(name); setEntryName(name); setIcalLink(url); }}>
                            <EditIcon color='9F6C5B'/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton onClick={() => setDeleteTarget(name)}>
                            <DeleteIcon color="error" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
              ))
            ) : (
              <Typography sx={{ p: 2, textAlign: 'center' }}>No calendars added yet.</Typography>
            )}
          </List>
        </Collapse>
      </DialogContent>
      {/* Delete Confirmation */}
      <ConfirmationDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete "{deleteTarget}"?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </ConfirmationDialog>
    </Dialog>
  );
};

export default LMSConnectPopup;
