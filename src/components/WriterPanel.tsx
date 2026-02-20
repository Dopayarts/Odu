import React, { useState, useRef, useEffect, useCallback } from 'react';
import Keyboard from './Keyboard';
import { YORUBA_VOWELS } from '../constants';
import { useAppMode } from '../context/AppModeContext';
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
  const effectiveShift = isShiftToggled || isShiftPressed;

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
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                Yoruba (with tones)
              </label>
              <div className="relative">
                <textarea
                  ref={editorRef}
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  onSelect={updateSuggestions}
                  onClick={updateSuggestions}
                  placeholder="Type Yoruba here — double-press SHIFT for Tones..."
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
            <div className="relative">
              <textarea
                ref={editorRef}
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                onSelect={updateSuggestions}
                onClick={updateSuggestions}
                placeholder="Start typing or double-press SHIFT for Tones (Do-Re-Mi)..."
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
