import { useState, useEffect, useCallback } from 'react';

const MAX_HEARTS = 3;
const REFILL_MS = 5 * 60 * 60 * 1000; // 5 hours
const CONTRIBUTIONS_PER_HEART = 5;

interface HeartsState {
  hearts: number;
  depletedAt: number | null;   // timestamp when hearts first hit 0 (for 5hr timer)
  contribProgress: number;     // 0-4 contributions toward next free heart
}

function getKey(username: string) {
  return `odu-hearts-${username}`;
}

function load(username: string): HeartsState {
  try {
    const raw = localStorage.getItem(getKey(username));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { hearts: MAX_HEARTS, depletedAt: null, contribProgress: 0 };
}

function save(username: string, state: HeartsState) {
  localStorage.setItem(getKey(username), JSON.stringify(state));
}

export function useHearts(username: string) {
  const [state, setState] = useState<HeartsState>(() => load(username));

  // Reload when username changes (different user)
  useEffect(() => {
    setState(load(username));
  }, [username]);

  // Persist on every change
  useEffect(() => {
    if (username) save(username, state);
  }, [username, state]);

  // Auto-refill: every second, check if 5 hours have passed since depletion
  useEffect(() => {
    const tick = setInterval(() => {
      setState(prev => {
        if (prev.hearts >= MAX_HEARTS || !prev.depletedAt) return prev;
        const elapsed = Date.now() - prev.depletedAt;
        if (elapsed >= REFILL_MS) {
          const next = { ...prev, hearts: Math.min(prev.hearts + 1, MAX_HEARTS), depletedAt: null };
          if (username) save(username, next);
          return next;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [username]);

  // Deduct one heart when a round starts
  const useHeart = useCallback(() => {
    setState(prev => {
      if (prev.hearts <= 0) return prev;
      const hearts = prev.hearts - 1;
      const depletedAt = hearts === 0 ? Date.now() : prev.depletedAt;
      return { ...prev, hearts, depletedAt };
    });
  }, []);

  // Called each time a contribution is saved; every 5 contributions grants +1 heart
  const onContributionSaved = useCallback(() => {
    setState(prev => {
      const next = prev.contribProgress + 1;
      if (next >= CONTRIBUTIONS_PER_HEART) {
        // Award a heart
        const hearts = Math.min(prev.hearts + 1, MAX_HEARTS);
        return { ...prev, hearts, contribProgress: 0, depletedAt: hearts > 0 ? null : prev.depletedAt };
      }
      return { ...prev, contribProgress: next };
    });
  }, []);

  // ms remaining until next auto-refill heart (null if not waiting)
  const msUntilRefill: number | null =
    state.hearts < MAX_HEARTS && state.depletedAt
      ? Math.max(0, REFILL_MS - (Date.now() - state.depletedAt))
      : null;

  return {
    hearts: state.hearts,
    maxHearts: MAX_HEARTS,
    hasHearts: state.hearts > 0,
    contribProgress: state.contribProgress,
    contributionsNeeded: CONTRIBUTIONS_PER_HEART,
    msUntilRefill,
    useHeart,
    onContributionSaved,
  };
}
