import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'orbit') {
      return savedTheme;
    }
    return 'orbit'; // Orbit is default
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'orbit');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'orbit') {
      root.classList.add('orbit');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleDarkMode = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : prev === 'dark' ? 'orbit' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDarkMode: theme !== 'light', toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
