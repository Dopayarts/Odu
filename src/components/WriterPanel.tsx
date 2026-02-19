import React, { useState, useRef, useEffect, useCallback } from 'react';
import Keyboard from './Keyboard';
import { YORUBA_VOWELS } from '../constants';
import { useAppMode } from '../context/AppModeContext';

interface WriterPanelProps {
  onSaveContribution?: (yoruba: string, english: string) => void;
}

const WriterPanel: React.FC<WriterPanelProps> = ({ onSaveContribution }) => {
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

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const effectiveShift = isShiftToggled || isShiftPressed;

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
  }, [activeVowel, diacriticIndex, confirmDiacritic, toneModeActive]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editorText);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      <div className="p-3 sm:p-4 md:p-6">
        {mode === 'contribute' && onSaveContribution ? (
          <div className="flex flex-col gap-2 sm:gap-3">
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
              <textarea
                ref={editorRef}
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                placeholder="Type Yoruba here — double-press SHIFT for Tones..."
                className={`w-full min-h-[5.5rem] max-h-52 p-3 sm:p-5 text-xl sm:text-2xl font-medium leading-relaxed rounded-2xl border-2 outline-none transition-all resize-y shadow-inner ${
                  toneModeActive
                    ? 'border-emerald-500 bg-emerald-50/5 ring-4 ring-emerald-500/5'
                    : isDarkMode ? 'bg-slate-950 border-amber-800/50 text-slate-100 focus:border-emerald-600' : 'bg-white border-amber-200 text-slate-900 focus:border-emerald-600'
                }`}
              />
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
            <textarea
              ref={editorRef}
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              placeholder="Start typing or double-press SHIFT for Tones (Do-Re-Mi)..."
              className={`w-full min-h-[10rem] max-h-[24rem] p-4 sm:p-8 text-xl sm:text-2xl font-medium leading-relaxed rounded-3xl border-2 outline-none transition-all resize-y shadow-inner ${
                toneModeActive
                  ? 'border-emerald-500 bg-emerald-50/5 ring-4 ring-emerald-500/5'
                  : isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-600' : 'bg-white border-slate-100 text-slate-900 focus:border-emerald-600'
              }`}
            />
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
