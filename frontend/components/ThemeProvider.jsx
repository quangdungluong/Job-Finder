'use client';

import { createContext, useContext, useEffect } from 'react';

// Create context for theme-related functions
export const ThemeContext = createContext(null);

export default function ThemeProvider({ children }) {
    // Set up a listener for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Function to handle changes to system theme
        const handleSystemThemeChange = () => {
            const savedTheme = localStorage.getItem('theme') || 'system';

            if (savedTheme === 'system') {
                // Update theme based on system preference
                const isDarkMode = mediaQuery.matches;
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(isDarkMode ? 'dark' : 'light');
            }
        };

        // Add event listener for system theme changes
        mediaQuery.addEventListener('change', handleSystemThemeChange);

        // Cleanup function
        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, []);

    return <>{children}</>;
}
