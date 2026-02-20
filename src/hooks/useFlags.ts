import { useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { QuizFlag } from '../../types';

// ── Submit a flag (user-facing) ───────────────────────────────────────────────

export function useSubmitFlag(username: string) {
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const submitFlag = useCallback(async (flag: Omit<QuizFlag, 'id' | 'status' | 'username' | 'timestamp'>) => {
    const key = flag.questionId;
    setSubmitting(prev => ({ ...prev, [key]: true }));
    try {
      await addDoc(collection(db, 'flags'), {
        ...flag,
        username,
        timestamp: Date.now(),
        status: 'pending',
      });
      setSubmitted(prev => ({ ...prev, [key]: true }));
    } catch {
      // ignore — silently fail
    } finally {
      setSubmitting(prev => ({ ...prev, [key]: false }));
    }
  }, [username]);

  return { submitFlag, submitting, submitted };
}

// ── Admin: fetch all flags ────────────────────────────────────────────────────

export function useAdminFlags() {
  const [flags, setFlags] = useState<QuizFlag[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'flags'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const list: QuizFlag[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as QuizFlag));
      setFlags(list);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Approve: mark flag approved + add answer to alternates/{questionId}
  const approveFlag = useCallback(async (flag: QuizFlag) => {
    if (!flag.id) return;
    try {
      // Update flag status
      await updateDoc(doc(db, 'flags', flag.id), { status: 'approved' });

      // Merge into alternates document for this question
      const altRef = doc(db, 'alternates', flag.questionId);
      const altSnap = await getDoc(altRef);
      if (altSnap.exists()) {
        const existing: string[] = altSnap.data().answers || [];
        if (!existing.includes(flag.userAnswer)) {
          await updateDoc(altRef, { answers: [...existing, flag.userAnswer] });
        }
      } else {
        await setDoc(altRef, { answers: [flag.userAnswer] });
      }

      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, status: 'approved' } : f));
    } catch {
      /* ignore */
    }
  }, []);

  // Reject: just mark flag rejected
  const rejectFlag = useCallback(async (flagId: string) => {
    try {
      await updateDoc(doc(db, 'flags', flagId), { status: 'rejected' });
      setFlags(prev => prev.map(f => f.id === flagId ? { ...f, status: 'rejected' } : f));
    } catch {
      /* ignore */
    }
  }, []);

  return { flags, loading, fetchFlags, approveFlag, rejectFlag };
}
