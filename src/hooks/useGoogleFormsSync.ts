import { useCallback, useEffect, useState } from 'react';
import { Contribution } from '../../types';
import { GOOGLE_FORMS_CONFIG } from '../constants';

const QUEUE_KEY = 'odu-sync-queue';

function loadQueue(): Contribution[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function saveQueue(q: Contribution[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function useGoogleFormsSync(markSynced: (ids: string[]) => void) {
  const [queue, setQueue] = useState<Contribution[]>(loadQueue);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  const enqueue = useCallback((item: Contribution) => {
    setQueue(prev => {
      const next = [...prev, item];
      saveQueue(next);
      return next;
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (!GOOGLE_FORMS_CONFIG.formUrl || GOOGLE_FORMS_CONFIG.formUrl.includes('PLACEHOLDER')) return;
    const current = loadQueue();
    if (current.length === 0) return;

    setSyncStatus('syncing');
    const syncedIds: string[] = [];

    for (const item of current) {
      try {
        const formData = new URLSearchParams();
        formData.append(GOOGLE_FORMS_CONFIG.fields.english, item.english);
        formData.append(GOOGLE_FORMS_CONFIG.fields.yoruba, item.yoruba);
        formData.append(GOOGLE_FORMS_CONFIG.fields.username, item.username);
        // Always send email — fixes missing email in Google Sheet
        formData.append(GOOGLE_FORMS_CONFIG.fields.email, item.email || '');
        formData.append(GOOGLE_FORMS_CONFIG.fields.mode, item.category ? `${item.mode}:${item.category}` : item.mode);
        formData.append(GOOGLE_FORMS_CONFIG.fields.timestamp, new Date(item.timestamp).toISOString());
        // Send location if the form field entry ID has been configured
        if (GOOGLE_FORMS_CONFIG.fields.location && !GOOGLE_FORMS_CONFIG.fields.location.includes('LOCATION_ENTRY_ID')) {
          formData.append(GOOGLE_FORMS_CONFIG.fields.location, item.location || '');
        }

        await fetch(GOOGLE_FORMS_CONFIG.formUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        syncedIds.push(item.id);
      } catch {
        // Will retry next cycle
      }
    }

    if (syncedIds.length > 0) {
      markSynced(syncedIds);
      const remaining = current.filter(c => !syncedIds.includes(c.id));
      saveQueue(remaining);
      setQueue(remaining);
    }

    setSyncStatus(syncedIds.length === current.length ? 'idle' : 'error');
  }, [markSynced]);

  // Auto-sync every 30 seconds
  useEffect(() => {
    const interval = setInterval(processQueue, 30000);
    return () => clearInterval(interval);
  }, [processQueue]);

  // Sync when items are added
  useEffect(() => {
    if (queue.length > 0) {
      const timeout = setTimeout(processQueue, 2000);
      return () => clearTimeout(timeout);
    }
  }, [queue.length, processQueue]);

  return { enqueue, syncStatus, queueLength: queue.length, processQueue };
}
