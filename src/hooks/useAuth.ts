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
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    username: '',
    loading: true,
  });
  const [error, setError] = useState('');

  // Listen to auth state changes (auto-restore session)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch username from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const username = userDoc.exists() ? userDoc.data().username || '' : '';
          setState({ user, username, loading: false });
        } catch {
          setState({ user, username: '', loading: false });
        }
      } else {
        setState({ user: null, username: '', loading: false });
      }
    });
    return unsubscribe;
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
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
        createdAt: new Date().toISOString(),
      });

      setState({ user: cred.user, username: username.trim(), loading: false });
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

      // Fetch username from Firestore
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      const username = userDoc.exists() ? userDoc.data().username || '' : '';

      setState({ user: cred.user, username, loading: false });
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
    setState({ user: null, username: '', loading: false });
  }, []);

  return {
    user: state.user,
    username: state.username,
    isLoggedIn: !!state.user,
    loading: state.loading,
    error,
    setError,
    register,
    login,
    logout,
  };
}
