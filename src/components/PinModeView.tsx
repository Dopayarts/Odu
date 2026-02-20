import React, { useState, useRef, useEffect, useCallback } from 'react';
import Keyboard from './Keyboard';
import { YORUBA_VOWELS } from '../constants';
import { useAppMode } from '../context/AppModeContext';

// Map plain vowels to their diacritic forms for bracket shortcuts
const VOWEL_GRAVE: Record<string, string> = {};
const VOWEL_ACUTE: Record<string, string> = {};

// Build lookup maps from YORUBA_VOWELS
for (const [key, val] of Object.entries(YORUBA_VOWELS)) {
  // lowercase
  VOWEL_GRAVE[val.base.toLowerCase()] = val.low.toLowerCase();
  VOWEL_ACUTE[val.base.toLowerCase()] = val.high.toLowerCase();
  // uppercase
  VOWEL_GRAVE[val.base.toUpperCase()] = val.low.toUpperCase();
  VOWEL_ACUTE[val.base.toUpperCase()] = val.high.toUpperCase();
}

const PinModeView: React.FC = () => {
  const { isDarkMode, togglePinMode } = useAppMode();
  const [text, setText] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [isShiftToggled, setIsShiftToggled] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [toneModeActive, setToneModeActive] = useState(false);
  const lastShiftPressRef = useRef<number>(0);

  const [activeVowel, setActiveVowel] = useState<string | null>(null);
  const [diacriticIndex, setDiacriticIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const effectiveShift = isShiftToggled || isShiftPressed;

  // Listen for global double-shift from main process (when typing in external apps)
  useEffect(() => {
    const pin = (window as any).electronPin;
    if (pin?.onGlobalDoubleShift) {
      pin.onGlobalDoubleShift(() => {
        setToneModeActive(prev => !prev);
      });
    }
  }, []);

  const handleInput = useCallback((char: string) => {
    const start = textareaRef.current?.selectionStart || 0;
    const end = textareaRef.current?.selectionEnd || 0;
    const newText = text.substring(0, start) + char + text.substring(end);
    setText(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + char.length;
        textareaRef.current.focus();
      }
    }, 0);
  }, [text]);

  const handleBackspace = useCallback(() => {
    const start = textareaRef.current?.selectionStart || 0;
    const end = textareaRef.current?.selectionEnd || 0;
    if (start === 0 && end === 0) return;
    let newText: string;
    let newPos: number;
    if (start !== end) {
      newText = text.substring(0, start) + text.substring(end);
      newPos = start;
    } else {
      newText = text.substring(0, start - 1) + text.substring(end);
      newPos = start - 1;
    }
    setText(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [text]);

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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  // Keyboard event handler: double-shift, diacritic nav, bracket shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      if ((e.key === '[' || e.key === ']') && document.activeElement === textareaRef.current) {
        const pos = textareaRef.current?.selectionStart || 0;
        if (pos > 0) {
          const lastChar = text[pos - 1];
          const map = e.key === '[' ? VOWEL_GRAVE : VOWEL_ACUTE;
          const replacement = map[lastChar];
          if (replacement) {
            e.preventDefault();
            const newText = text.substring(0, pos - 1) + replacement + text.substring(pos);
            setText(newText);
            setTimeout(() => {
              if (textareaRef.current) {
                const newPos = pos - 1 + replacement.length;
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
              }
            }, 0);
            return;
          }
        }
      }

      if (document.activeElement === textareaRef.current || !activeVowel) {
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
  }, [activeVowel, diacriticIndex, confirmDiacritic, toneModeActive, text]);

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Draggable title bar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">A</div>
          <span className="text-[10px] font-black tracking-tight uppercase">ODU Pin</span>
          {toneModeActive && (
            <span className="text-[8px] font-black uppercase text-emerald-500 animate-pulse">Scale</span>
          )}
        </div>
        <button
          onClick={togglePinMode}
          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          Unpin
        </button>
      </div>

      {/* Mini textarea + copy */}
      <div className={`px-2 py-1.5 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex gap-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type here..."
            rows={2}
            className={`flex-1 resize-none text-sm p-2 rounded-lg border outline-none transition-colors ${
              toneModeActive
                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                : isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-600' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-600'
            }`}
          />
          <div className="flex flex-col gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={copyToClipboard}
              className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase hover:bg-emerald-500 transition-all"
            >
              Copy
            </button>
            <button
              onClick={() => setText('')}
              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${isDarkMode ? 'bg-slate-700 text-slate-400 hover:bg-red-900 hover:text-white' : 'bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-600'}`}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Compact keyboard */}
      <div className={`flex-1 overflow-auto px-2 py-2 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
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
          compact
        />
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xl text-xs font-bold z-50">
          Copied!
        </div>
      )}
    </div>
  );
};

export default PinModeView;
