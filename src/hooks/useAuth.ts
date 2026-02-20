import { useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  collection,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthState {
  user: User | null;
  username: string;
  location: string;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    username: '',
    location: '',
    loading: true,
  });
  const [error, setError] = useState('');

  // Listen to auth state changes (auto-restore session)
  useEffect(() => {
    let resolved = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      resolved = true;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Enforce ban: sign out immediately if banned
            if (data.banned) {
              await signOut(auth);
              setState({ user: null, username: '', location: '', loading: false });
              setError('Your account has been suspended for violating community guidelines.');
              return;
            }
            setState({
              user,
              username: data.username || '',
              location: data.location || '',
              loading: false,
            });
          } else {
            setState({ user, username: '', location: '', loading: false });
          }
        } catch {
          setState({ user, username: '', location: '', loading: false });
        }
      } else {
        setState({ user: null, username: '', location: '', loading: false });
      }
    });
    // Timeout: if Firebase hasn't responded in 5s, stop loading
    const timeout = setTimeout(() => {
      if (!resolved) setState({ user: null, username: '', location: '', loading: false });
    }, 5000);
    return () => { unsubscribe(); clearTimeout(timeout); };
  }, []);

  const register = useCallback(async (email: string, username: string, password: string, location: string) => {
    setError('');
    try {
      // Check username uniqueness
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', username.trim())
      );
      const snapshot = await getDocs(usernameQuery);
      if (!snapshot.empty) {
        setError('Username is already taken. Please choose another.');
        return false;
      }

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Save user doc to Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        username: username.trim(),
        email: email.trim(),
        location: location.trim(),
        createdAt: new Date().toISOString(),
        banned: false,
        warned: false,
      });

      setState({ user: cred.user, username: username.trim(), location: location.trim(), loading: false });
      return true;
    } catch (err: any) {
      const msg = err?.code === 'auth/email-already-in-use'
        ? 'This email is already registered. Try logging in.'
        : err?.code === 'auth/weak-password'
        ? 'Password must be at least 6 characters.'
        : err?.message || 'Registration failed.';
      setError(msg);
      return false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Block banned users from logging in
        if (data.banned) {
          await signOut(auth);
          setError('Your account has been suspended for violating community guidelines.');
          return false;
        }
        setState({ user: cred.user, username: data.username || '', location: data.location || '', loading: false });
      } else {
        setState({ user: cred.user, username: '', location: '', loading: false });
      }
      return true;
    } catch (err: any) {
      const msg = err?.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err?.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : err?.message || 'Login failed.';
      setError(msg);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setState({ user: null, username: '', location: '', loading: false });
  }, []);

  return {
    user: state.user,
    username: state.username,
    location: state.location,
    isLoggedIn: !!state.user,
    loading: state.loading,
    error,
    setError,
    register,
    login,
    logout,
  };
}
