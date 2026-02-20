import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppMode } from '../../types';
import { useAuth } from '../hooks/useAuth';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  username: string;
  setUsername: (name: string) => void;
  savedUsernames: string[];
  addUsername: (name: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  isPinMode: boolean;
  togglePinMode: () => void;
  // Firebase auth
  isLoggedIn: boolean;
  userEmail: string;
  authLoading: boolean;
  authError: string;
  setAuthError: (msg: string) => void;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AppModeContext = createContext<AppModeContextType | null>(null);

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authHook = useAuth();

  const [mode, setModeState] = useState<AppMode>(() => {
    return (localStorage.getItem('odu-mode') as AppMode) || 'simple';
  });

  // Username comes from Firebase auth when logged in
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

  const [isPinMode, setIsPinMode] = useState(false);

  const togglePinMode = useCallback(() => {
    const next = !isPinMode;
    setIsPinMode(next);
    const pin = (window as any).electronPin;
    if (pin) {
      if (next) pin.enterPinMode();
      else pin.exitPinMode();
    }
  }, [isPinMode]);

  // Sync username from Firebase auth
  useEffect(() => {
    if (authHook.isLoggedIn && authHook.username) {
      setUsernameState(authHook.username);
      localStorage.setItem('odu-username', authHook.username);
    }
  }, [authHook.isLoggedIn, authHook.username]);

  // Clear username on logout
  useEffect(() => {
    if (!authHook.isLoggedIn && !authHook.loading) {
      setUsernameState('');
      localStorage.removeItem('odu-username');
    }
  }, [authHook.isLoggedIn, authHook.loading]);

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
    <AppModeContext.Provider value={{
      mode, setMode, username, setUsername, savedUsernames, addUsername, isDarkMode, setIsDarkMode, isPinMode, togglePinMode,
      isLoggedIn: authHook.isLoggedIn,
      userEmail: authHook.user?.email || '',
      authLoading: authHook.loading,
      authError: authHook.error,
      setAuthError: authHook.setError,
      register: authHook.register,
      login: authHook.login,
      logout: authHook.logout,
    }}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
};
