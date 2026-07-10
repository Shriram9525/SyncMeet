import * as React from 'react';
import { 
    Avatar, 
    Button, 
    CssBaseline, 
    TextField, 
    Paper, 
    Box, 
    Grid, 
    Typography,
    Snackbar,
    Tabs,
    Tab,
    Alert
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';

export default function Authentication() {
    const { themeMode } = React.useContext(ThemeContext);

    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [formState, setFormState] = React.useState(0); // 0 = Login, 1 = Register
    const [open, setOpen] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    const handleAuth = async (e) => {
        if (e) e.preventDefault();
        setError("");
        
        if (!username || !password || (formState === 1 && !name)) {
            setError("All fields are required");
            return;
        }

        try {
            if (formState === 0) {
                await handleLogin(username, password);
            }
            if (formState === 1) {
                const result = await handleRegister(name, username, password);
                setMessage(result || "Registration successful! Please sign in.");
                setOpen(true);
                setFormState(0);
                setPassword("");
            }
        } catch (err) {
            console.log(err);
            const msg = err.response?.data?.message || err.message || "Something went wrong";
            setError(msg);
        }
    };

    return (
        <Grid container component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <CssBaseline />
            
            {/* Left side: Premium brand showcase */}
            <Grid
                item
                xs={false}
                sm={4}
                md={7}
                sx={{
                    position: 'relative',
                    background: 'radial-gradient(circle at 10% 20%, rgb(0, 0, 0) 0%, rgb(8, 12, 28) 90%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 6,
                    color: 'white',
                    overflow: 'hidden'
                }}
            >
                {/* Glowing neon background circles */}
                <Box sx={{
                    position: 'absolute',
                    width: '350px',
                    height: '350px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(14, 113, 235, 0.2) 0%, transparent 75%)',
                    filter: 'blur(30px)',
                    top: '10%',
                    left: '5%',
                    zIndex: 1
                }} />
                <Box sx={{
                    position: 'absolute',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255, 152, 57, 0.15) 0%, transparent 75%)',
                    filter: 'blur(30px)',
                    bottom: '10%',
                    right: '5%',
                    zIndex: 1
                }} />

                <Box sx={{ zIndex: 10, maxWidth: 500, textAlign: 'left', width: '100%' }}>
                    <Typography 
                        variant="h3" 
                        sx={{ 
                            fontWeight: 800, 
                            mb: 2, 
                            background: 'linear-gradient(to right, #FF9839, #FF5722)', 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-1px'
                        }}
                    >
                        SyncMeet
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 500, mb: 3, opacity: 0.9 }}>
                        Connect with your friends, family, and team from anywhere.
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.7, lineHeight: 1.6 }}>
                        Join meetings instantly as a guest, schedule calls for later, customize your avatar profile, and participate with crystal-clear audio, dynamic speaker grid highlights, and live reaction tools.
                    </Typography>
                </Box>
            </Grid>

            {/* Right side: Modern login/register form */}
            <Grid 
                item 
                xs={12} 
                sm={8} 
                md={5} 
                component={Paper} 
                elevation={0} 
                square
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    bgcolor: 'background.paper',
                    p: 4
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: 400,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar sx={{ m: 1.5, bgcolor: 'primary.main', width: 45, height: 45 }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    
                    <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                        {formState === 0 ? "Welcome Back" : "Create Account"}
                    </Typography>

                    {/* Tab Switcher */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%', mb: 4 }}>
                        <Tabs 
                            value={formState} 
                            onChange={(e, val) => { setFormState(val); setError(""); }}
                            variant="fullWidth"
                            textColor="primary"
                            indicatorColor="primary"
                        >
                            <Tab label="Sign In" sx={{ fontWeight: 'bold' }} />
                            <Tab label="Sign Up" sx={{ fontWeight: 'bold' }} />
                        </Tabs>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleAuth} noValidate sx={{ width: '100%' }}>
                        {formState === 1 && (
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Full Name"
                                name="name"
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                                InputProps={{ sx: { borderRadius: 2 } }}
                                sx={{ mb: 2.5 }}
                            />
                        )}

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Username"
                            name="username"
                            value={username}
                            autoFocus={formState === 0}
                            onChange={(e) => setUsername(e.target.value)}
                            InputProps={{ sx: { borderRadius: 2 } }}
                            sx={{ mb: 2.5 }}
                        />
                        
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            value={password}
                            type="password"
                            onChange={(e) => setPassword(e.target.value)}
                            InputProps={{ sx: { borderRadius: 2 } }}
                            sx={{ mb: 4 }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{ 
                                py: 1.5, 
                                borderRadius: '30px', 
                                fontWeight: 'bold', 
                                fontSize: '1rem',
                                textTransform: 'none',
                                boxShadow: '0 8px 20px rgba(14, 113, 235, 0.3)',
                                '&:hover': {
                                    boxShadow: '0 12px 25px rgba(14, 113, 235, 0.5)'
                                }
                            }}
                        >
                            {formState === 0 ? "Login" : "Register"}
                        </Button>
                    </Box>
                </Box>
            </Grid>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
            >
                <Alert severity="success" sx={{ width: '100%' }}>
                    {message}
                </Alert>
            </Snackbar>
        </Grid>
    );
}