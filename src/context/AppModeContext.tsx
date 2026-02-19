import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppMode } from '../../types';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  username: string;
  setUsername: (name: string) => void;
  savedUsernames: string[];
  addUsername: (name: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const AppModeContext = createContext<AppModeContextType | null>(null);

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>(() => {
    return (localStorage.getItem('odu-mode') as AppMode) || 'simple';
  });

  const [username, setUsernameState] = useState(() => {
    return localStorage.getItem('odu-username') || '';
  });

  const [savedUsernames, setSavedUsernames] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('odu-usernames') || '[]');
    } catch { return []; }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('yoruba-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => { localStorage.setItem('odu-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('odu-username', username); }, [username]);
  useEffect(() => { localStorage.setItem('odu-usernames', JSON.stringify(savedUsernames)); }, [savedUsernames]);
  useEffect(() => { localStorage.setItem('yoruba-theme', isDarkMode ? 'dark' : 'light'); }, [isDarkMode]);

  const setMode = useCallback((m: AppMode) => setModeState(m), []);
  const setUsername = useCallback((name: string) => setUsernameState(name), []);

  const addUsername = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUsernameState(trimmed);
    setSavedUsernames(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  }, []);

  return (
    <AppModeContext.Provider value={{ mode, setMode, username, setUsername, savedUsernames, addUsername, isDarkMode, setIsDarkMode }}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
};
