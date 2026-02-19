import { useState, useCallback } from 'react';
import { Contribution } from '../../types';

const STORAGE_KEY = 'odu-contributions';

function loadContributions(): Contribution[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveContributions(items: Contribution[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useContributions() {
  const [contributions, setContributions] = useState<Contribution[]>(loadContributions);

  const addContribution = useCallback((entry: Omit<Contribution, 'id' | 'timestamp' | 'synced'>) => {
    const item: Contribution = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      synced: false,
    };
    setContributions(prev => {
      const next = [...prev, item];
      saveContributions(next);
      return next;
    });
    return item;
  }, []);

  const markSynced = useCallback((ids: string[]) => {
    setContributions(prev => {
      const next = prev.map(c => ids.includes(c.id) ? { ...c, synced: true } : c);
      saveContributions(next);
      return next;
    });
  }, []);

  const exportCSV = useCallback(() => {
    const BOM = '\uFEFF';
    const header = 'ID,English,Yoruba,Username,Mode,Category,Timestamp,Synced';
    const rows = contributions.map(c =>
      [c.id, csvEscape(c.english), csvEscape(c.yoruba), csvEscape(c.username), c.mode, c.category || '', new Date(c.timestamp).toISOString(), c.synced].join(',')
    );
    const csv = BOM + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `odu-contributions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [contributions]);

  const unsyncedCount = contributions.filter(c => !c.synced).length;

  return { contributions, addContribution, markSynced, exportCSV, unsyncedCount };
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}
