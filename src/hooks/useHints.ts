import { useState, useEffect, useCallback } from 'react';

const HINTS_KEY = 'odu-hints';

interface HintState {
  sessionCount: number;
  dismissedHints: string[];
  lastShown: number;
}

const HINTS = [
  { id: 'contribute', text: 'Help train the ODU AI — switch to Contribute mode', target: 'contribute' as const },
  { id: 'learn', text: 'Learn Yoruba with guided practice — try Learn mode', target: 'learn' as const },
];

function loadHintState(): HintState {
  try { return JSON.parse(localStorage.getItem(HINTS_KEY) || '{}') as HintState; }
  catch { return { sessionCount: 0, dismissedHints: [], lastShown: 0 }; }
}

function saveHintState(state: HintState) {
  localStorage.setItem(HINTS_KEY, JSON.stringify(state));
}

export function useHints(currentMode: string) {
  const [hintState, setHintState] = useState<HintState>(() => {
    const state = loadHintState();
    state.sessionCount = (state.sessionCount || 0) + 1;
    if (!state.dismissedHints) state.dismissedHints = [];
    if (!state.lastShown) state.lastShown = 0;
    saveHintState(state);
    return state;
  });

  const [activeHint, setActiveHint] = useState<typeof HINTS[0] | null>(null);

  useEffect(() => {
    if (currentMode !== 'simple') {
      setActiveHint(null);
      return;
    }

    const isEvery3rd = hintState.sessionCount % 3 === 0;
    const available = HINTS.filter(h => !hintState.dismissedHints.includes(h.id));
    if (available.length === 0) return;

    // Show after 60 seconds on first visit, or every 3rd session
    const delay = isEvery3rd ? 5000 : 60000;
    const timer = setTimeout(() => {
      const pick = available[Math.floor(Math.random() * available.length)];
      setActiveHint(pick);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentMode, hintState]);

  const dismissHint = useCallback((hintId: string) => {
    setActiveHint(null);
    setHintState(prev => {
      const next = {
        ...prev,
        dismissedHints: [...prev.dismissedHints, hintId],
        lastShown: Date.now(),
      };
      saveHintState(next);
      return next;
    });
  }, []);

  return { activeHint, dismissHint };
}
