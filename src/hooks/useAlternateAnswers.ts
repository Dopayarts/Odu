import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const CACHE_KEY = 'odu-alternates-cache';
const CACHE_TTL_MS = 10 * 60 * 1000; // refresh every 10 minutes

interface CacheEntry {
  data: Record<string, string[]>;
  fetchedAt: number;
}

function loadCache(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry.data;
  } catch { /* ignore */ }
  return {};
}

function saveCache(data: Record<string, string[]>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: Date.now() }));
  } catch { /* ignore */ }
}

// Returns a map of questionId → approved alternate answers
export function useAlternateAnswers() {
  const [alternates, setAlternates] = useState<Record<string, string[]>>(loadCache);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'alternates'));
        if (cancelled) return;
        const map: Record<string, string[]> = {};
        snap.docs.forEach(d => {
          const answers: string[] = d.data().answers || [];
          if (answers.length > 0) map[d.id] = answers;
        });
        setAlternates(map);
        saveCache(map);
      } catch { /* ignore — use cached data */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return alternates;
}
