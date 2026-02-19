import { useState, useEffect, useCallback, useRef } from 'react';
import { GOOGLE_SHEET_CSV_URL } from '../constants';

const CACHE_KEY = 'odu-leaderboard-cache';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface LeaderboardEntry {
  username: string;
  count: number;
  rank: number;
}

interface LeaderboardData {
  rankings: LeaderboardEntry[];
  totalContributions: number;
  lastUpdated: number;
}

interface UseLeaderboardReturn {
  rankings: LeaderboardEntry[];
  myRank: number | null;
  myCount: number;
  totalContributions: number;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => void;
}

function loadCache(): LeaderboardData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(data: LeaderboardData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

function parseCSV(text: string): LeaderboardData {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { rankings: [], totalContributions: 0, lastUpdated: Date.now() };
  }

  // Parse header to find username column
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const usernameIdx = header.findIndex(h =>
    h.includes('username') || h.includes('user') || h.includes('name')
  );

  if (usernameIdx === -1) {
    return { rankings: [], totalContributions: 0, lastUpdated: Date.now() };
  }

  // Count contributions per username
  const counts: Record<string, number> = {};
  let total = 0;

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parse (handles quoted fields)
    const row = lines[i].match(/(".*?"|[^,]+)/g);
    if (!row || !row[usernameIdx]) continue;

    const username = row[usernameIdx].trim().replace(/^"|"$/g, '');
    if (!username || username === 'anonymous') continue;

    counts[username] = (counts[username] || 0) + 1;
    total++;
  }

  // Sort by count descending
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([username, count], i) => ({
      username,
      count,
      rank: i + 1,
    }));

  return { rankings: sorted, totalContributions: total, lastUpdated: Date.now() };
}

export function useLeaderboard(currentUsername?: string): UseLeaderboardReturn {
  const cached = loadCache();
  const [data, setData] = useState<LeaderboardData>(
    cached || { rankings: [], totalContributions: 0, lastUpdated: 0 }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL.includes('PLACEHOLDER')) {
      setError('Leaderboard not configured yet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(GOOGLE_SHEET_CSV_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseCSV(text);
      setData(parsed);
      saveCache(parsed);
    } catch (e) {
      setError('Could not load leaderboard');
      // Keep showing cached data
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    intervalRef.current = setInterval(fetchLeaderboard, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLeaderboard]);

  // Find current user's rank
  const myEntry = currentUsername
    ? data.rankings.find(r => r.username.toLowerCase() === currentUsername.toLowerCase())
    : null;

  return {
    rankings: data.rankings,
    myRank: myEntry?.rank ?? null,
    myCount: myEntry?.count ?? 0,
    totalContributions: data.totalContributions,
    loading,
    error,
    lastUpdated: data.lastUpdated || null,
    refresh: fetchLeaderboard,
  };
}
