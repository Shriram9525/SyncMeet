import './App.css';
import React, { useContext } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeContextProvider, ThemeContext } from './contexts/ThemeContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import withAuth from './utils/withAuth';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const AuthHistory = withAuth(History);
const AuthVideoMeet = withAuth(VideoMeetComponent);

function AppContent() {
  const { themeMode } = useContext(ThemeContext);

  const theme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#0E71EB', // Zoom blue
      },
      secondary: {
        main: themeMode === 'dark' ? '#F5F5F7' : '#1D1D1F',
      },
      background: {
        default: themeMode === 'dark' ? '#0B0B0E' : '#F5F5F7',
        paper: themeMode === 'dark' ? '#16161D' : '#FFFFFF',
      },
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: {
      borderRadius: 12,
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path='/' element={<LandingPage />} />
            <Route path='/auth' element={<Authentication />} />
            <Route path='/home' element={<HomeComponent />} />
            <Route path='/history' element={<AuthHistory />} />
            <Route path='/:url' element={<AuthVideoMeet />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeContextProvider>
      <AppContent />
    </ThemeContextProvider>
  );
}

export default App;
