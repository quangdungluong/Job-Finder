'use client';

import { useState, useEffect } from 'react';
import { BsSun, BsMoon, BsLaptop } from 'react-icons/bs';

export default function ThemeToggle() {
    const [theme, setTheme] = useState('system');

    useEffect(() => {
        // Get saved theme from localStorage or default to system
        const savedTheme = localStorage.getItem('theme') || 'system';
        setTheme(savedTheme);
        applyTheme(savedTheme);
    }, []);

    const applyTheme = (newTheme) => {
        const root = window.document.documentElement;

        // Remove any existing theme classes
        root.classList.remove('light', 'dark');

        if (newTheme === 'system') {
            // Check system preference
            const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemPreference);
        } else {
            // Apply selected theme
            root.classList.add(newTheme);
        }
    };

    const cycleTheme = () => {
        const themeOrder = ['light', 'dark', 'system'];
        const currentIndex = themeOrder.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themeOrder.length;
        const nextTheme = themeOrder[nextIndex];

        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
        applyTheme(nextTheme);
    };

    const getThemeIcon = () => {
        switch (theme) {
            case 'light':
                return <BsSun className="w-5 h-5" />;
            case 'dark':
                return <BsMoon className="w-5 h-5" />;
            case 'system':
                return <BsLaptop className="w-5 h-5" />;
            default:
                return <BsSun className="w-5 h-5" />;
        }
    };

    const getThemeLabel = () => {
        switch (theme) {
            case 'light':
                return 'Light';
            case 'dark':
                return 'Dark';
            case 'system':
                return 'System';
            default:
                return 'Light';
        }
    };

    return (
        <button
            onClick={cycleTheme}
            className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Light Mode' : theme === 'dark' ? 'Dark Mode' : 'System Theme'}
        >
            {getThemeIcon()}
        </button>
    );
}
