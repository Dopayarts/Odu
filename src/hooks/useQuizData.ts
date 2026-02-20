import { useState, useEffect, useCallback } from 'react';
import { ChallengeSentence } from '../../types';
import { SENTENCES } from '../data/sentences';
import { GOOGLE_QUIZ_SHEET_CSV_URL } from '../constants';

const CACHE_KEY = 'odu-quiz-data-cache';

function parseCSV(csv: string): ChallengeSentence[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const engIdx = headers.findIndex(h => h === 'english' || h === 'english_text');
  const yorIdx = headers.findIndex(h => h === 'yoruba_answer' || h === 'yoruba');
  const catIdx = headers.findIndex(h => h === 'category');
  const difIdx = headers.findIndex(h => h === 'difficulty');
  if (engIdx === -1 || yorIdx === -1) return [];

  const results: ChallengeSentence[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const english = cols[engIdx];
    const yoruba_answer = cols[yorIdx];
    if (!english || !yoruba_answer) continue;
    const category = (catIdx >= 0 ? cols[catIdx] : 'greeting') as ChallengeSentence['category'];
    const difficulty = (difIdx >= 0 ? cols[difIdx] : 'beginner') as ChallengeSentence['difficulty'];
    results.push({
      id: `remote-${i}`,
      english,
      yoruba_answer,
      category,
      difficulty,
    });
  }
  return results;
}

export function useQuizData() {
  const [questions, setQuestions] = useState<ChallengeSentence[]>(() => {
    // Start with local sentences that have answers
    const local = SENTENCES.filter(s => s.yoruba_answer);
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const remote: ChallengeSentence[] = JSON.parse(cached);
        return mergeQuestions(local, remote);
      }
    } catch {}
    return local;
  });
  const [loading, setLoading] = useState(false);

  const fetchRemote = useCallback(async () => {
    if (!GOOGLE_QUIZ_SHEET_CSV_URL) return;
    setLoading(true);
    try {
      const res = await fetch(GOOGLE_QUIZ_SHEET_CSV_URL);
      if (!res.ok) throw new Error('Failed to fetch');
      const csv = await res.text();
      const remote = parseCSV(csv);
      if (remote.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(remote));
        const local = SENTENCES.filter(s => s.yoruba_answer);
        setQuestions(mergeQuestions(local, remote));
      }
    } catch {
      // Fall back to local data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRemote();
    const interval = setInterval(fetchRemote, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRemote]);

  return { questions, loading, refresh: fetchRemote };
}

function mergeQuestions(local: ChallengeSentence[], remote: ChallengeSentence[]): ChallengeSentence[] {
  const map = new Map<string, ChallengeSentence>();
  for (const q of local) map.set(q.english.toLowerCase(), q);
  for (const q of remote) map.set(q.english.toLowerCase(), q); // remote overrides local
  return Array.from(map.values());
}
