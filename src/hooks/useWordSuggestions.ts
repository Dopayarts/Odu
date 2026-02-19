import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GOOGLE_SHEET_CSV_URL, SUGGESTIONS_CACHE_KEY } from '../constants';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface WordEntry {
  yoruba: string;
  english: string;
  sentence: string;
  frequency: number;
}

interface CachedData {
  words: Record<string, WordEntry>;
  lastUpdated: number;
}

export interface WordSuggestionsReturn {
  getSuggestions: (prefix: string) => WordEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

function loadCache(): CachedData | null {
  try {
    const raw = localStorage.getItem(SUGGESTIONS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(data: CachedData) {
  try {
    localStorage.setItem(SUGGESTIONS_CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function buildWordDictionary(csvText: string): Record<string, WordEntry> {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return {};

  const header = parseCSVRow(lines[0]).map(h => h.toLowerCase().replace(/"/g, ''));

  const yorubaIdx = header.findIndex(h => h.includes('yoruba_text') || h.includes('yoruba'));
  const englishIdx = header.findIndex(h => h.includes('english_text') || h.includes('english'));
  const validatedIdx = header.findIndex(h => h.includes('validated'));

  if (yorubaIdx === -1 || englishIdx === -1 || validatedIdx === -1) return {};

  const words: Record<string, WordEntry> = {};

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (!row[validatedIdx]) continue;

    const validated = row[validatedIdx].replace(/"/g, '').trim().toUpperCase();
    if (validated !== 'TRUE') continue;

    const yorubaText = row[yorubaIdx]?.replace(/"/g, '').trim();
    const englishText = row[englishIdx]?.replace(/"/g, '').trim();
    if (!yorubaText || !englishText) continue;

    // Split yoruba text into individual words
    const yorubaWords = yorubaText.split(/\s+/).filter(w => w.length > 0);

    for (const word of yorubaWords) {
      const key = word.toLowerCase();
      if (words[key]) {
        words[key].frequency++;
      } else {
        words[key] = {
          yoruba: word,
          english: englishText,
          sentence: yorubaText,
          frequency: 1,
        };
      }
    }
  }

  return words;
}

export function useWordSuggestions(): WordSuggestionsReturn {
  const cached = loadCache();
  const [wordDict, setWordDict] = useState<Record<string, WordEntry>>(cached?.words || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(cached?.lastUpdated || null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAndBuild = useCallback(async () => {
    if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL.includes('PLACEHOLDER')) {
      setError('CSV URL not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(GOOGLE_SHEET_CSV_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const dict = buildWordDictionary(text);
      const now = Date.now();
      setWordDict(dict);
      setLastUpdated(now);
      saveCache({ words: dict, lastUpdated: now });
    } catch {
      setError('Could not load suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndBuild();
  }, [fetchAndBuild]);

  useEffect(() => {
    intervalRef.current = setInterval(fetchAndBuild, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAndBuild]);

  const getSuggestions = useCallback((prefix: string): WordEntry[] => {
    if (!prefix || prefix.length < 2) return [];
    const lowerPrefix = prefix.toLowerCase();
    const matches: WordEntry[] = [];

    for (const [key, entry] of Object.entries(wordDict)) {
      if (key.startsWith(lowerPrefix)) {
        matches.push(entry);
      }
    }

    // Sort by frequency descending, then alphabetically
    matches.sort((a, b) => b.frequency - a.frequency || a.yoruba.localeCompare(b.yoruba));
    return matches.slice(0, 6);
  }, [wordDict]);

  return useMemo(() => ({
    getSuggestions,
    loading,
    error,
    lastUpdated,
  }), [getSuggestions, loading, error, lastUpdated]);
}
