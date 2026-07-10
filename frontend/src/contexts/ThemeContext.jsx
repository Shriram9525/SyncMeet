import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext({});

export const ThemeContextProvider = ({ children }) => {
    const [themeMode, setThemeMode] = useState(() => {
        return localStorage.getItem('themeMode') || 'dark'; // default to dark mode
    });

    useEffect(() => {
        localStorage.setItem('themeMode', themeMode);
    }, [themeMode]);

    const toggleTheme = () => {
        setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
