import React, { useContext, useState, useEffect } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { 
    Button, 
    IconButton, 
    TextField, 
    Tabs, 
    Tab, 
    Box, 
    Typography, 
    Avatar, 
    Grid, 
    Card, 
    CardContent, 
    Divider, 
    Snackbar, 
    Alert, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions 
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EventIcon from '@mui/icons-material/Event';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SecurityIcon from '@mui/icons-material/Security';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';

const AVATARS = ["🦊", "🦁", "🐼", "🐨", "🦄", "🐱", "🐶", "🐸"];

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function HomeComponent() {
    let navigate = useNavigate();
    const { 
        addToUserHistory, 
        getHistoryOfUser, 
        getProfile, 
        updateProfile, 
        changePassword, 
        logoutAll, 
        scheduleMeeting, 
        getScheduledMeetings,
        deleteFromHistory,
        clearHistory
    } = useContext(AuthContext);
    const { themeMode, toggleTheme } = useContext(ThemeContext);

    const [activeTab, setActiveTab] = useState(0);
    const [meetingCode, setMeetingCode] = useState("");
    const [historyList, setHistoryList] = useState([]);
    const [scheduledList, setScheduledList] = useState([]);
    
    // Profile State
    const [profile, setProfile] = useState({ name: "", username: "", displayName: "", profilePicture: "" });
    const [nameInput, setNameInput] = useState("");
    const [displayNameInput, setDisplayNameInput] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState("");
    
    // Password State
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Scheduling State
    const [schedCode, setSchedCode] = useState("");
    const [schedTime, setSchedTime] = useState("");
    const [scheduleOpen, setScheduleOpen] = useState(false);

    // Alerts
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        fetchProfile();
        fetchHistory();
        fetchScheduled();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await getProfile();
            setProfile(data);
            setNameInput(data.name || "");
            setDisplayNameInput(data.displayName || "");
            setSelectedAvatar(data.profilePicture || AVATARS[0]);
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    };

    const fetchHistory = async () => {
        try {
            const history = await getHistoryOfUser();
            setHistoryList(history || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchScheduled = async () => {
        try {
            const list = await getScheduledMeetings();
            setScheduledList(list || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        if (newValue === 1) fetchScheduled();
        if (newValue === 2) fetchHistory();
        if (newValue === 3) fetchProfile();
    };

    const handleJoinVideoCall = async () => {
        if (!meetingCode.trim()) {
            showToast("Please enter a meeting code", "warning");
            return;
        }
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    };

    const handleCreateInstantMeeting = async () => {
        const generatedCode = Math.random().toString(36).substr(2, 9);
        await addToUserHistory(generatedCode);
        navigate(`/${generatedCode}`);
    };

    const handleSaveProfile = async () => {
        try {
            const res = await updateProfile(nameInput, displayNameInput, selectedAvatar);
            setProfile(res.user);
            showToast("Profile updated successfully!");
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to update profile", "error");
        }
    };

    const handleChangePasswordSubmit = async () => {
        if (newPassword !== confirmPassword) {
            showToast("Passwords do not match!", "error");
            return;
        }
        try {
            await changePassword(oldPassword, newPassword);
            showToast("Password updated successfully!");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e) {
            showToast(e.response?.data?.message || "Failed to change password", "error");
        }
    };

    const handleLogoutAllDevices = async () => {
        try {
            await logoutAll();
            showToast("Logged out from all devices");
            navigate("/auth");
        } catch (e) {
            showToast("Failed to perform logout", "error");
        }
    };

    const handleScheduleSubmit = async () => {
        if (!schedCode.trim() || !schedTime) {
            showToast("Please fill all scheduling fields", "warning");
            return;
        }
        try {
            await scheduleMeeting(schedCode, schedTime);
            showToast("Meeting scheduled successfully!");
            setSchedCode("");
            setSchedTime("");
            setScheduleOpen(false);
            fetchScheduled();
        } catch (e) {
            showToast("Failed to schedule meeting", "error");
        }
    };

    const handleDeleteHistoryItem = async (meetingId) => {
        try {
            await deleteFromHistory(meetingId);
            showToast("Meeting removed from history");
            fetchHistory();
        } catch (e) {
            showToast("Failed to remove meeting", "error");
        }
    };

    const handleClearAllHistory = async () => {
        try {
            await clearHistory();
            showToast("All call history cleared");
            fetchHistory();
        } catch (e) {
            showToast("Failed to clear history", "error");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast("Meeting code copied to clipboard!");
    };

    const showToast = (message, severity = "success") => {
        setToast({ open: true, message, severity });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            {/* Nav Bar */}
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                px: 3, 
                py: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 'bold' }}>A</Avatar>
                    <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold' }}>
                        Apna Video Call
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 0 }}>
                        <Tab icon={<VideoCallIcon />} label="Dashboard" />
                        <Tab icon={<EventIcon />} label="Schedules" />
                        <Tab icon={<RestoreIcon />} label="History" />
                        <Tab icon={<AccountCircleIcon />} label="Profile" />
                    </Tabs>

                    <IconButton onClick={toggleTheme} color="inherit">
                        {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>

                    <Button 
                        variant="outlined" 
                        color="error" 
                        startIcon={<LogoutIcon />}
                        onClick={() => {
                            localStorage.removeItem("token");
                            navigate("/auth");
                        }}
                    >
                        Logout
                    </Button>
                </Box>
            </Box>

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', p: 4 }}>
                <Card sx={{ width: '100%', maxWidth: 1000, minHeight: '60vh', boxShadow: 3, borderRadius: 3 }}>
                    <CardContent sx={{ p: 0 }}>
                        
                        {/* Tab 1: Dashboard */}
                        <TabPanel value={activeTab} index={0}>
                            <Grid container spacing={4} alignItems="center">
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, color: 'text.primary' }}>
                                        Providing Quality Video Call
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" paragraph>
                                        Connect with your peers instantly or schedule a future meeting room. Simple, secure, and robust.
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', gap: 2, mt: 4, mb: 3 }}>
                                        <TextField 
                                            fullWidth
                                            onChange={e => setMeetingCode(e.target.value)} 
                                            value={meetingCode}
                                            label="Enter Meeting Code" 
                                            variant="outlined" 
                                        />
                                        <Button onClick={handleJoinVideoCall} variant='contained' size="large" sx={{ px: 4 }}>
                                            Join
                                        </Button>
                                    </Box>

                                    <Divider sx={{ my: 3 }} />

                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Button 
                                            onClick={handleCreateInstantMeeting} 
                                            variant='outlined' 
                                            color="primary"
                                            size="large"
                                            fullWidth
                                            startIcon={<VideoCallIcon />}
                                        >
                                            New Meeting
                                        </Button>
                                        <Button 
                                            onClick={() => setScheduleOpen(true)} 
                                            variant='outlined' 
                                            color="secondary"
                                            size="large"
                                            fullWidth
                                            startIcon={<EventIcon />}
                                        >
                                            Schedule
                                        </Button>
                                    </Box>
                                </Grid>
                                
                                <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Box 
                                        component="img"
                                        src="/logo3.png"
                                        alt="illustration"
                                        sx={{ 
                                            maxWidth: '90%', 
                                            height: 'auto', 
                                            borderRadius: 3,
                                            boxShadow: 2 
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        {/* Tab 2: Schedules */}
                        <TabPanel value={activeTab} index={1}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                                Scheduled Meetings
                            </Typography>
                            {scheduledList.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 5 }}>
                                    <EventIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                    <Typography color="text.secondary">No scheduled meetings yet. Set one up from the dashboard!</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                                    {scheduledList.map((meet, i) => (
                                        <Grid item xs={12} key={i}>
                                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                                                    <Box>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                                            Code: {meet.meetingCode}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Time: {formatDate(meet.scheduledTime)}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <IconButton onClick={() => copyToClipboard(meet.meetingCode)}>
                                                            <ContentCopyIcon fontSize="small" />
                                                        </IconButton>
                                                        <Button 
                                                            variant="contained" 
                                                            onClick={() => navigate(`/${meet.meetingCode}`)}
                                                            size="small"
                                                        >
                                                            Start Call
                                                        </Button>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </TabPanel>

                        {/* Tab 3: History */}
                        <TabPanel value={activeTab} index={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                    Meeting History
                                </Typography>
                                {historyList.length > 0 && (
                                    <Button 
                                        variant="outlined" 
                                        color="error" 
                                        startIcon={<DeleteIcon />} 
                                        onClick={handleClearAllHistory}
                                        size="small"
                                    >
                                        Clear All
                                    </Button>
                                )}
                            </Box>
                            {historyList.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 5 }}>
                                    <RestoreIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                    <Typography color="text.secondary">No past meetings found.</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                                    {historyList.map((meet, i) => (
                                        <Grid item xs={12} sm={6} md={4} key={i}>
                                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                                            Code: {meet.meetingCode}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Date: {formatDate(meet.date)}
                                                        </Typography>
                                                    </Box>
                                                    <IconButton 
                                                        color="error" 
                                                        onClick={() => handleDeleteHistoryItem(meet._id)}
                                                        title="Delete from history"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </TabPanel>

                        {/* Tab 4: Profile Settings */}
                        <TabPanel value={activeTab} index={3}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 4 }}>
                                Account Settings
                            </Typography>
                            
                            <Grid container spacing={4}>
                                {/* Edit Profile Details */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>Profile Details</Typography>
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                            <Avatar sx={{ width: 60, height: 60, fontSize: '32px', bgcolor: 'primary.light' }}>
                                                {selectedAvatar}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Choose an Avatar
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    {AVATARS.map(av => (
                                                        <span 
                                                            key={av} 
                                                            onClick={() => setSelectedAvatar(av)}
                                                            style={{ 
                                                                fontSize: '24px', 
                                                                cursor: 'pointer',
                                                                padding: '2px',
                                                                border: selectedAvatar === av ? '2px solid #0E71EB' : '2px solid transparent',
                                                                borderRadius: '4px'
                                                            }}
                                                        >
                                                            {av}
                                                        </span>
                                                    ))}
                                                </Box>
                                            </Box>
                                        </Box>

                                        <TextField 
                                            fullWidth 
                                            label="Username (Read-only)" 
                                            value={profile.username || ""} 
                                            disabled 
                                        />
                                        <TextField 
                                            fullWidth 
                                            label="Full Name" 
                                            value={nameInput} 
                                            onChange={e => setNameInput(e.target.value)} 
                                        />
                                        <TextField 
                                            fullWidth 
                                            label="Display Name" 
                                            value={displayNameInput} 
                                            onChange={e => setDisplayNameInput(e.target.value)} 
                                        />
                                        
                                        <Button variant="contained" onClick={handleSaveProfile} sx={{ mt: 1 }}>
                                            Save Details
                                        </Button>
                                    </Box>
                                </Grid>

                                {/* Security / Change Password */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SecurityIcon /> Password & Session
                                        </Typography>

                                        <TextField 
                                            fullWidth 
                                            type="password" 
                                            label="Current Password" 
                                            value={oldPassword} 
                                            onChange={e => setOldPassword(e.target.value)} 
                                        />
                                        <TextField 
                                            fullWidth 
                                            type="password" 
                                            label="New Password" 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                        />
                                        <TextField 
                                            fullWidth 
                                            type="password" 
                                            label="Confirm New Password" 
                                            value={confirmPassword} 
                                            onChange={e => setConfirmPassword(e.target.value)} 
                                        />
                                        
                                        <Button variant="outlined" color="primary" onClick={handleChangePasswordSubmit}>
                                            Update Password
                                        </Button>

                                        <Divider sx={{ my: 1.5 }} />

                                        <Button variant="outlined" color="error" onClick={handleLogoutAllDevices}>
                                            Logout From All Devices
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </TabPanel>

                    </CardContent>
                </Card>
            </Box>

            {/* Schedule Meeting Dialog */}
            <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 'bold' }}>Schedule Future Call</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
                        <TextField 
                            label="Meeting Room Code" 
                            fullWidth 
                            value={schedCode} 
                            onChange={e => setSchedCode(e.target.value)} 
                            placeholder="e.g. team-standup"
                        />
                        <TextField 
                            type="datetime-local" 
                            fullWidth 
                            value={schedTime} 
                            onChange={e => setSchedTime(e.target.value)} 
                            InputLabelProps={{ shrink: true }}
                            label="Schedule Date & Time"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setScheduleOpen(false)}>Cancel</Button>
                    <Button onClick={handleScheduleSubmit} variant="contained">Schedule</Button>
                </DialogActions>
            </Dialog>

            {/* Notification Toast */}
            <Snackbar 
                open={toast.open} 
                autoHideDuration={4000} 
                onClose={() => setToast({ ...toast, open: false })}
            >
                <Alert severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    )
}

export default withAuth(HomeComponent)