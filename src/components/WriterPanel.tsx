import React, { useState, useRef, useEffect, useCallback } from 'react';
import Keyboard from './Keyboard';
import { YORUBA_VOWELS } from '../constants';
import { useAppMode } from '../context/AppModeContext';
import platform from '../utils/platform';
import type { WordSuggestionsReturn, WordEntry } from '../hooks/useWordSuggestions';

// Map plain vowels to their diacritic forms for bracket shortcuts
const VOWEL_GRAVE: Record<string, string> = {};
const VOWEL_ACUTE: Record<string, string> = {};
for (const [, val] of Object.entries(YORUBA_VOWELS)) {
  VOWEL_GRAVE[val.base.toLowerCase()] = val.low.toLowerCase();
  VOWEL_ACUTE[val.base.toLowerCase()] = val.high.toLowerCase();
  VOWEL_GRAVE[val.base.toUpperCase()] = val.low.toUpperCase();
  VOWEL_ACUTE[val.base.toUpperCase()] = val.high.toUpperCase();
}

// Reverse map: any vowel form (base/high/low, upper/lower) → key in YORUBA_VOWELS
const CHAR_TO_VOWEL_KEY: Record<string, string> = {};
for (const [key, val] of Object.entries(YORUBA_VOWELS)) {
  [val.base, val.high, val.low].forEach(c => {
    CHAR_TO_VOWEL_KEY[c] = key;
    CHAR_TO_VOWEL_KEY[c.toUpperCase()] = key;
  });
}

// Sub-character expansions: e→ẹ (eh), o→ọ (or), s→ṣ (sh, no tones)
const VOWEL_SUBCHAR: Record<string, { key: string; label: string; hasTones: boolean }> = {
  'e': { key: 'ẹ', label: 'eh', hasTones: true },
  'o': { key: 'ọ', label: 'or', hasTones: true },
  's': { key: 'ṣ', label: 'sh', hasTones: false },
};

const TONE_FREQS = [261.63, 293.66, 329.63]; // Do (C4), Re (D4), Mi (E4)
function playMobileTone(index: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(TONE_FREQS[index], ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (_) {}
}

interface WriterPanelProps {
  onSaveContribution?: (yoruba: string, english: string) => void;
  wordSuggestions?: WordSuggestionsReturn;
  onAdminMode?: () => void;
}

function getWordAtCursor(text: string, cursorPos: number): { word: string; start: number; end: number } | null {
  if (!text || cursorPos === 0) return null;
  const before = text.substring(0, cursorPos);
  const match = before.match(/(\S+)$/);
  if (!match) return null;
  const word = match[1];
  const start = cursorPos - word.length;
  // Find end of current word
  const afterCursor = text.substring(cursorPos);
  const endMatch = afterCursor.match(/^(\S*)/);
  const end = cursorPos + (endMatch ? endMatch[1].length : 0);
  return { word, start, end };
}

const WriterPanel: React.FC<WriterPanelProps> = ({ onSaveContribution, wordSuggestions, onAdminMode }) => {
  const { isDarkMode, mode } = useAppMode();
  const [editorText, setEditorText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [autoCopy, setAutoCopy] = useState(true);

  const [isShiftToggled, setIsShiftToggled] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [toneModeActive, setToneModeActive] = useState(false);
  const lastShiftPressRef = useRef<number>(0);

  const [activeVowel, setActiveVowel] = useState<string | null>(null);
  const [diacriticIndex, setDiacriticIndex] = useState(0);

  const [activeSuggestions, setActiveSuggestions] = useState<WordEntry[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorWord, setCursorWord] = useState<{ word: string; start: number; end: number } | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const savedCursorRef = useRef<number>(0);
  const effectiveShift = isShiftToggled || isShiftPressed;

  // Mobile tone picker state
  const [mobileToneVowel, setMobileToneVowel] = useState<string | null>(null);
  const [mobileIsUpper, setMobileIsUpper] = useState(false);
  const [mobileReplaceLen, setMobileReplaceLen] = useState(1);
  const [mobileSOnly, setMobileSOnly] = useState(false); // true for s→ṣ (no tones)

  // Update suggestions when editor text or cursor changes
  const updateSuggestions = useCallback(() => {
    if (!wordSuggestions) {
      setActiveSuggestions([]);
      return;
    }
    const cursorPos = editorRef.current?.selectionStart || 0;
    const wordInfo = getWordAtCursor(editorText, cursorPos);
    setCursorWord(wordInfo);

    if (wordInfo && wordInfo.word.length >= 2) {
      const matches = wordSuggestions.getSuggestions(wordInfo.word);
      setActiveSuggestions(matches);
      setSelectedSuggestionIndex(0);
    } else {
      setActiveSuggestions([]);
    }
  }, [editorText, wordSuggestions]);

  useEffect(() => {
    updateSuggestions();
  }, [updateSuggestions]);

  // Detect admin passphrase
  useEffect(() => {
    if (editorText.includes('DopayMasterMode')) {
      setEditorText('');
      onAdminMode?.();
    }
  }, [editorText, onAdminMode]);

  const acceptSuggestion = useCallback((entry: WordEntry) => {
    if (!cursorWord || !editorRef.current) return;
    const before = editorText.substring(0, cursorWord.start);
    const after = editorText.substring(cursorWord.end);
    const newText = before + entry.yoruba + after;
    setEditorText(newText);
    setActiveSuggestions([]);

    const newCursorPos = cursorWord.start + entry.yoruba.length;
    if (autoCopy) navigator.clipboard.writeText(newText).catch(() => {});
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = newCursorPos;
        editorRef.current.focus();
      }
    }, 0);
  }, [editorText, cursorWord, autoCopy]);

  const handleInput = useCallback((char: string) => {
    const start = editorRef.current?.selectionStart || 0;
    const end = editorRef.current?.selectionEnd || 0;
    const newText = editorText.substring(0, start) + char + editorText.substring(end);
    setEditorText(newText);

    if (autoCopy) {
      navigator.clipboard.writeText(newText).catch(() => {});
    }

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = start + char.length;
        editorRef.current.focus();
      }
    }, 0);
  }, [editorText, autoCopy]);

  const handleBackspace = useCallback(() => {
    const start = editorRef.current?.selectionStart || 0;
    const end = editorRef.current?.selectionEnd || 0;
    if (start === 0 && end === 0) return;
    let newText: string;
    let newPos: number;
    if (start !== end) {
      newText = editorText.substring(0, start) + editorText.substring(end);
      newPos = start;
    } else {
      newText = editorText.substring(0, start - 1) + editorText.substring(end);
      newPos = start - 1;
    }
    setEditorText(newText);
    if (autoCopy) navigator.clipboard.writeText(newText).catch(() => {});
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = newPos;
        editorRef.current.focus();
      }
    }, 0);
  }, [editorText, autoCopy]);

  const handleSpace = useCallback(() => handleInput(' '), [handleInput]);

  const confirmDiacritic = useCallback((vowel: string, index: number) => {
    const data = YORUBA_VOWELS[vowel];
    if (!data) return;

    let char = '';
    if (index === 0) char = data.low;
    else if (index === 1) char = data.base;
    else char = data.high;

    const output = effectiveShift ? char.toUpperCase() : char.toLowerCase();
    handleInput(output);
    setActiveVowel(null);
    setDiacriticIndex(0);
    setToneModeActive(false);
  }, [effectiveShift, handleInput]);

  // Mobile tone picker — reads cursor directly at call time (fixes unreliable button)
  const openTonePicker = useCallback((cursorPos?: number) => {
    const pos = cursorPos ?? savedCursorRef.current;
    if (pos === 0) return;

    const char2 = editorText.substring(pos - 2, pos);
    const char1 = editorText.substring(pos - 1, pos);
    const char1Lower = char1.toLowerCase();

    // s / S → ṣ only (no tones)
    if (char1Lower === 's') {
      setMobileToneVowel(null);
      setMobileIsUpper(char1 !== char1Lower);
      setMobileReplaceLen(1);
      setMobileSOnly(true);
      return;
    }

    // Try 2-char match first (e.g. ẹ́ = ẹ + combining accent)
    let foundKey: string | null = null;
    let replaceLen = 1;
    let isUpper = false;

    if (char2.length === 2 && CHAR_TO_VOWEL_KEY[char2]) {
      foundKey = CHAR_TO_VOWEL_KEY[char2];
      replaceLen = 2;
      isUpper = char2[0] !== char2[0].toLowerCase();
    } else if (CHAR_TO_VOWEL_KEY[char1]) {
      foundKey = CHAR_TO_VOWEL_KEY[char1];
      replaceLen = 1;
      isUpper = char1 !== char1.toLowerCase();
    }

    if (!foundKey) return;
    setMobileToneVowel(foundKey);
    setMobileIsUpper(isUpper);
    setMobileReplaceLen(replaceLen);
    setMobileSOnly(false);
  }, [editorText]);

  const closeMobilePicker = useCallback(() => {
    setMobileToneVowel(null);
    setMobileSOnly(false);
  }, []);

  // Replace char before cursor with the given string, play tone, refocus
  const applyMobileChar = useCallback((char: string, toneIndex: number | null) => {
    const pos = savedCursorRef.current;
    const newText = editorText.substring(0, pos - mobileReplaceLen) + char + editorText.substring(pos);
    setEditorText(newText);
    if (autoCopy) navigator.clipboard.writeText(newText).catch(() => {});
    if (toneIndex !== null) playMobileTone(toneIndex);
    const newPos = pos - mobileReplaceLen + char.length;
    savedCursorRef.current = newPos;
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = newPos;
        editorRef.current.focus();
      }
    }, 50);
    setMobileToneVowel(null);
    setMobileSOnly(false);
  }, [editorText, mobileReplaceLen, autoCopy]);

  const applyMobileTone = useCallback((toneIndex: number) => {
    if (!mobileToneVowel) return;
    const data = YORUBA_VOWELS[mobileToneVowel];
    if (!data) return;
    const raw = [data.low, data.base, data.high][toneIndex];
    const char = mobileIsUpper ? raw.toUpperCase() : raw;
    applyMobileChar(char, toneIndex);
  }, [mobileToneVowel, mobileIsUpper, applyMobileChar]);

  // Drill into sub-char (e→ẹ, o→ọ) — keeps replaceLen so we still replace original char
  const drillIntoSubChar = useCallback((subKey: string) => {
    setMobileToneVowel(subKey);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Suggestion keyboard navigation
      if (activeSuggestions.length > 0 && document.activeElement === editorRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => Math.min(prev + 1, activeSuggestions.length - 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
          return;
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          acceptSuggestion(activeSuggestions[selectedSuggestionIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setActiveSuggestions([]);
          return;
        }
      }

      if (e.key === 'Shift') {
        const now = Date.now();
        const diff = now - lastShiftPressRef.current;
        if (diff > 20 && diff < 350) {
          setToneModeActive(prev => !prev);
        }
        lastShiftPressRef.current = now;
        setIsShiftPressed(true);
      }

      if (activeVowel) {
        if (e.key === 'ArrowRight') { e.preventDefault(); setDiacriticIndex(prev => (prev + 1) % 3); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setDiacriticIndex(prev => (prev - 1 + 3) % 3); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmDiacritic(activeVowel, diacriticIndex); return; }
        if (e.key === 'Escape') { e.preventDefault(); setActiveVowel(null); setToneModeActive(false); return; }
        if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); confirmDiacritic(activeVowel, parseInt(e.key) - 1); return; }
      }

      // Bracket shortcuts: [ for grave (low), ] for acute (high)
      if ((e.key === '[' || e.key === ']') && document.activeElement === editorRef.current) {
        const pos = editorRef.current?.selectionStart || 0;
        if (pos > 0) {
          const lastChar = editorText[pos - 1];
          const map = e.key === '[' ? VOWEL_GRAVE : VOWEL_ACUTE;
          const replacement = map[lastChar];
          if (replacement) {
            e.preventDefault();
            const newText = editorText.substring(0, pos - 1) + replacement + editorText.substring(pos);
            setEditorText(newText);
            if (autoCopy) navigator.clipboard.writeText(newText).catch(() => {});
            setTimeout(() => {
              if (editorRef.current) {
                const newPos = pos - 1 + replacement.length;
                editorRef.current.selectionStart = editorRef.current.selectionEnd = newPos;
              }
            }, 0);
            return;
          }
        }
      }

      if (document.activeElement === editorRef.current || !activeVowel) {
        const key = e.key.toLowerCase();
        if (YORUBA_VOWELS[key] && toneModeActive) {
          e.preventDefault();
          setActiveVowel(key);
          setDiacriticIndex(0);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeVowel, diacriticIndex, confirmDiacritic, toneModeActive, activeSuggestions, selectedSuggestionIndex, acceptSuggestion, editorText, autoCopy]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editorText);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const suggestionDropdown = activeSuggestions.length > 0 && (
    <div
      ref={suggestionsRef}
      className={`absolute left-3 right-3 z-50 rounded-2xl shadow-xl border-2 overflow-hidden transition-all ${
        isDarkMode
          ? 'bg-slate-900 border-slate-700 shadow-black/40'
          : 'bg-white border-slate-200 shadow-slate-300/40'
      }`}
      style={{ top: '100%', marginTop: '4px' }}
    >
      {activeSuggestions.map((entry, i) => (
        <button
          key={`${entry.yoruba}-${i}`}
          onMouseDown={(e) => { e.preventDefault(); acceptSuggestion(entry); }}
          className={`w-full text-left px-4 py-2.5 flex items-baseline gap-3 transition-colors ${
            i === selectedSuggestionIndex
              ? isDarkMode
                ? 'bg-amber-900/40 text-amber-200'
                : 'bg-amber-50 text-amber-900'
              : isDarkMode
                ? 'hover:bg-slate-800 text-slate-200'
                : 'hover:bg-slate-50 text-slate-800'
          } ${i > 0 ? (isDarkMode ? 'border-t border-slate-800' : 'border-t border-slate-100') : ''}`}
        >
          <span className="font-bold text-base">{entry.yoruba}</span>
          <span className={`text-sm italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {entry.english}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      <div className="p-3 sm:p-4 md:p-6">
        {mode === 'contribute' && onSaveContribution ? (
          <div className="flex flex-col gap-2 sm:gap-3">
            {/* Community guidelines reminder */}
            <div className={`rounded-2xl px-4 py-3 border-2 ${isDarkMode ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                Contribute Responsibly
              </p>
              <p className={`text-xs leading-snug ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Please submit <strong>factual, accurate Yoruba sentences</strong> only. Spamming or incorrect content violates our community guidelines and may result in a ban. Your contributions will be celebrated in our exhibition — make them count! ✊
              </p>
            </div>
            {/* English input */}
            <div className="relative">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                English (translation)
              </label>
              <textarea
                value={englishText}
                onChange={(e) => setEnglishText(e.target.value)}
                placeholder="Type the English meaning here..."
                className={`w-full min-h-[4.5rem] max-h-40 p-3 sm:p-5 text-base sm:text-lg font-medium leading-relaxed rounded-2xl border-2 outline-none transition-all resize-y shadow-inner ${
                  isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-600' : 'bg-white border-slate-100 text-slate-900 focus:border-emerald-600'
                }`}
              />
            </div>
            {/* Yoruba input */}
            <div className="relative group">
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  Yoruba (with tones)
                </label>
                {platform.isMobile && (
                  <button
                    onPointerDown={(e) => { e.preventDefault(); const pos = editorRef.current?.selectionStart ?? savedCursorRef.current; savedCursorRef.current = pos; openTonePicker(pos); }}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
                  >
                    <span>♪</span><span>Tone</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <textarea
                  ref={editorRef}
                  value={editorText}
                  onChange={(e) => { setEditorText(e.target.value); savedCursorRef.current = e.target.selectionStart ?? 0; }}
                  onSelect={() => { updateSuggestions(); savedCursorRef.current = editorRef.current?.selectionStart ?? 0; }}
                  onClick={() => { updateSuggestions(); savedCursorRef.current = editorRef.current?.selectionStart ?? 0; }}
                  onBlur={() => { savedCursorRef.current = editorRef.current?.selectionStart ?? savedCursorRef.current; }}
                  placeholder="Type Yoruba here — use the ♪ Tone button for tonal marks..."
                  className={`w-full min-h-[5.5rem] max-h-52 p-3 sm:p-5 text-xl sm:text-2xl font-medium leading-relaxed rounded-2xl border-2 outline-none transition-all resize-y shadow-inner ${
                    toneModeActive
                      ? 'border-emerald-500 bg-emerald-50/5 ring-4 ring-emerald-500/5'
                      : isDarkMode ? 'bg-slate-950 border-amber-800/50 text-slate-100 focus:border-emerald-600' : 'bg-white border-amber-200 text-slate-900 focus:border-emerald-600'
                  }`}
                />
                {suggestionDropdown}
              </div>
              {toneModeActive && (
                <div className="absolute top-10 right-4 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-xl animate-pulse-slow">
                  Scale Active: Press a Vowel
                </div>
              )}
              <div className="absolute bottom-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setEditorText(''); setEnglishText(''); }} className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-red-900 hover:text-white transition-all">Clear</button>
                <button onClick={copyToClipboard} className="px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xl shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all">Copy</button>
                {editorText.trim() && englishText.trim() && (
                  <button onClick={() => { onSaveContribution(editorText.trim(), englishText.trim()); setEditorText(''); setEnglishText(''); }} className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xl shadow-amber-900/40 hover:scale-105 active:scale-95 transition-all">
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group">
            {platform.isMobile && (
              <div className="flex justify-end mb-2">
                <button
                  onPointerDown={(e) => { e.preventDefault(); const pos = editorRef.current?.selectionStart ?? savedCursorRef.current; savedCursorRef.current = pos; openTonePicker(pos); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
                >
                  <span>♪</span><span>Tone</span>
                </button>
              </div>
            )}
            <div className="relative">
              <textarea
                ref={editorRef}
                value={editorText}
                onChange={(e) => { setEditorText(e.target.value); savedCursorRef.current = e.target.selectionStart ?? 0; }}
                onSelect={() => { updateSuggestions(); savedCursorRef.current = editorRef.current?.selectionStart ?? 0; }}
                onClick={() => { updateSuggestions(); savedCursorRef.current = editorRef.current?.selectionStart ?? 0; }}
                onBlur={() => { savedCursorRef.current = editorRef.current?.selectionStart ?? savedCursorRef.current; }}
                placeholder="Start typing — use the ♪ Tone button for tonal marks..."
                className={`w-full min-h-[10rem] max-h-[24rem] p-4 sm:p-8 text-xl sm:text-2xl font-medium leading-relaxed rounded-3xl border-2 outline-none transition-all resize-y shadow-inner ${
                  toneModeActive
                    ? 'border-emerald-500 bg-emerald-50/5 ring-4 ring-emerald-500/5'
                    : isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-600' : 'bg-white border-slate-100 text-slate-900 focus:border-emerald-600'
                }`}
              />
              {suggestionDropdown}
            </div>
            {toneModeActive && (
              <div className="absolute top-4 right-6 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-xl animate-pulse-slow">
                Scale Active: Press a Vowel
              </div>
            )}
            <div className="absolute bottom-6 right-6 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
              <button onClick={() => setEditorText('')} className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-red-900 hover:text-white transition-all">Clear</button>
              <button onClick={copyToClipboard} className="px-5 sm:px-8 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xl shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all">Copy to Clipboard</button>
            </div>
          </div>
        )}
      </div>

      {!platform.isMobile && (
        <div className={`p-3 sm:p-6 border-t transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <Keyboard
            onInput={handleInput}
            onBackspace={handleBackspace}
            onSpace={handleSpace}
            isShiftToggled={isShiftToggled}
            setIsShiftToggled={setIsShiftToggled}
            isShiftPressed={isShiftPressed}
            toneModeActive={toneModeActive}
            setToneModeActive={setToneModeActive}
            activeVowel={activeVowel}
            setActiveVowel={setActiveVowel}
            diacriticIndex={diacriticIndex}
            onDiacriticSelect={confirmDiacritic}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* ── Mobile tone picker modal ──────────────────────────────────────── */}
      {(mobileToneVowel || mobileSOnly) && (() => {
        const isSOnly = mobileSOnly && !mobileToneVowel;
        const data = mobileToneVowel ? YORUBA_VOWELS[mobileToneVowel] : null;
        const baseKey = mobileToneVowel?.toLowerCase() ?? '';
        const subInfo = VOWEL_SUBCHAR[baseKey];

        return (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={closeMobilePicker}
          >
            <div
              className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border-2 ${isDarkMode ? 'bg-slate-900 border-orange-500/30' : 'bg-white border-orange-300'}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-base font-black">♪</span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">
                      {isSOnly ? 'Sub-character' : 'Tonal Mark'}
                    </p>
                    <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {isSOnly
                        ? 'Insert sub-character'
                        : <>Choose tone for <span className="text-orange-400 font-black">{mobileIsUpper ? (data?.base.toUpperCase() ?? '') : (data?.base ?? '')}</span></>
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeMobilePicker}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
                >✕</button>
              </div>

              {isSOnly ? (
                /* s → just show ṣ / sh */
                <button
                  onClick={() => applyMobileChar(mobileIsUpper ? 'Ṣ' : 'ṣ', null)}
                  className={`w-full flex flex-col items-center gap-1 py-5 rounded-2xl border-2 transition-all active:scale-95 ${
                    isDarkMode ? 'bg-orange-950/40 border-orange-500/40' : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <span className="text-4xl font-black text-orange-400">{mobileIsUpper ? 'Ṣ' : 'ṣ'}</span>
                  <span className="text-sm font-black text-orange-500">sh</span>
                </button>
              ) : (
                <>
                  {/* 3 tone options */}
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { raw: data!.low,  label: 'Do', sublabel: 'Low',  freq: 0 },
                      { raw: data!.base, label: 'Re', sublabel: 'Mid',  freq: 1 },
                      { raw: data!.high, label: 'Mi', sublabel: 'High', freq: 2 },
                    ] as const).map(({ raw, label, sublabel, freq }) => {
                      const char = mobileIsUpper ? raw.toUpperCase() : raw;
                      return (
                        <button
                          key={label}
                          onClick={() => applyMobileTone(freq)}
                          className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 transition-all active:scale-95 ${
                            isDarkMode
                              ? 'bg-orange-950/40 border-orange-500/40 hover:bg-orange-500/20'
                              : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                          }`}
                        >
                          <span className="text-3xl font-black text-orange-400">{char}</span>
                          <span className="text-[11px] font-black text-orange-500">{label}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{sublabel}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-character option (eh / or) */}
                  {subInfo && subInfo.hasTones && (
                    <button
                      onClick={() => drillIntoSubChar(subInfo.key)}
                      className={`mt-3 w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-600 hover:border-orange-500/60'
                          : 'bg-slate-50 border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {mobileIsUpper ? subInfo.key.toUpperCase() : subInfo.key}
                        </span>
                        <span className="text-xs font-black text-orange-400 uppercase tracking-wider">{subInfo.label}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>tap for tones →</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {showToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700 font-black text-sm z-[100] animate-in fade-in slide-in-from-bottom-8">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">✓</span>
            Copied to Clipboard!
          </div>
        </div>
      )}
    </div>
  );
};

export default WriterPanel;
