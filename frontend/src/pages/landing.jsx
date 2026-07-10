import React, { useEffect } from 'react'
import "../App.css"
import { useNavigate } from 'react-router-dom'
import { Button, Box, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

export default function LandingPage() {
    const router = useNavigate();

    useEffect(() => {
        // Clean up guest tokens if any exist when landing on this page
        const token = localStorage.getItem("token");
        if (token && token.startsWith("guest_")) {
            localStorage.removeItem("token");
        }
    }, []);

    const handleJoinAsGuest = () => {
        const guestRoomCode = Math.random().toString(36).substr(2, 9);
        localStorage.setItem("token", "guest_" + Math.random().toString(36).substr(2, 9));
        router(`/${guestRoomCode}`);
    };

    return (
        <div className='landingPageContainer'>
            <nav className='landingNav'>
                <div className='navHeader'>
                    <h2>SyncMeet</h2>
                </div>
                <div className='navlist'>
                    <Button 
                        variant="text" 
                        color="inherit" 
                        onClick={handleJoinAsGuest}
                        sx={{ fontWeight: 600, fontSize: '15px' }}
                    >
                        Join as Guest
                    </Button>
                    <Button 
                        variant="text" 
                        color="inherit" 
                        onClick={() => router("/auth")}
                        sx={{ fontWeight: 600, fontSize: '15px' }}
                    >
                        Register
                    </Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={() => router("/auth")}
                        sx={{ borderRadius: 4, px: 3, fontWeight: 600 }}
                    >
                        Login
                    </Button>
                </div>
            </nav>

            <div className="landingMainContainer">
                <Box sx={{ maxWidth: '550px' }}>
                    <Typography 
                        variant="h1" 
                        sx={{ 
                            fontSize: '3.6rem', 
                            fontWeight: 800, 
                            lineHeight: 1.2, 
                            mb: 2, 
                            background: 'linear-gradient(to right, #FF9839, #FF5722)', 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent' 
                        }}
                    >
                        Connect instantly.
                    </Typography>
                    <Typography 
                        variant="h2" 
                        sx={{ fontSize: '2.5rem', fontWeight: 600, mb: 3, color: 'white' }}
                    >
                        With your loved ones anywhere.
                    </Typography>
                    
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', mb: 5 }}>
                        Experience crystal clear video quality, instant screen sharing, real-time reactive emoji bursts, and unified hand raising control. Cover distances effortlessly with SyncMeet.
                    </Typography>

                    <Button 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => router("/auth")}
                        sx={{ 
                            borderRadius: '30px', 
                            px: 5, 
                            py: 1.8, 
                            fontSize: '1.1rem', 
                            fontWeight: 'bold',
                            boxShadow: '0 8px 25px rgba(14, 113, 235, 0.4)',
                            transition: 'all 0.2s',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 12px 30px rgba(14, 113, 235, 0.6)'
                            }
                        }}
                    >
                        Get Started
                    </Button>
                </Box>
                
                <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    {/* Glowing neon sphere background */}
                    <Box sx={{
                        position: 'absolute',
                        width: '400px',
                        height: '400px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(14, 113, 235, 0.25) 0%, transparent 70%)',
                        filter: 'blur(30px)',
                        zIndex: -1
                    }} />
                    <Box 
                        component="img" 
                        src="/mobile.png" 
                        alt="mockup" 
                        sx={{ 
                            height: '65vh', 
                            width: 'auto',
                            transform: 'rotate(-5deg)',
                            transition: 'transform 0.5s ease-in-out',
                            '&:hover': {
                                transform: 'rotate(0deg) scale(1.02)'
                            }
                        }}
                    />
                </Box>
            </div>
        </div>
    )
}
