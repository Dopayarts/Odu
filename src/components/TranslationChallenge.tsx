import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Keyboard from './Keyboard';
import { YORUBA_VOWELS } from '../constants';
import { SENTENCES, CATEGORIES } from '../data/sentences';
import { useAppMode } from '../context/AppModeContext';
import { ChallengeSentence } from '../../types';

interface TranslationChallengeProps {
  onSubmit: (english: string, yoruba: string, category: string) => void;
}

const TranslationChallenge: React.FC<TranslationChallengeProps> = ({ onSubmit }) => {
  const { isDarkMode } = useAppMode();
  const [selectedCategory, setSelectedCategory] = useState<string>('greeting');
  const [currentSentence, setCurrentSentence] = useState<ChallengeSentence | null>(null);
  const [yorubaText, setYorubaText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [isShiftToggled, setIsShiftToggled] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [toneModeActive, setToneModeActive] = useState(false);
  const lastShiftPressRef = useRef<number>(0);
  const [activeVowel, setActiveVowel] = useState<string | null>(null);
  const [diacriticIndex, setDiacriticIndex] = useState(0);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const effectiveShift = isShiftToggled || isShiftPressed;

  const filteredSentences = useMemo(
    () => SENTENCES.filter(s => s.category === selectedCategory),
    [selectedCategory]
  );

  const pickRandom = useCallback(() => {
    if (filteredSentences.length === 0) return;
    const idx = Math.floor(Math.random() * filteredSentences.length);
    setCurrentSentence(filteredSentences[idx]);
    setYorubaText('');
    setSubmitted(false);
  }, [filteredSentences]);

  useEffect(() => { pickRandom(); }, [selectedCategory, pickRandom]);

  const handleInput = useCallback((char: string) => {
    const start = editorRef.current?.selectionStart || 0;
    const end = editorRef.current?.selectionEnd || 0;
    const newText = yorubaText.substring(0, start) + char + yorubaText.substring(end);
    setYorubaText(newText);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = start + char.length;
        editorRef.current.focus();
      }
    }, 0);
  }, [yorubaText]);

  const handleBackspace = useCallback(() => {
    const start = editorRef.current?.selectionStart || 0;
    const end = editorRef.current?.selectionEnd || 0;
    if (start === 0 && end === 0) return;
    let newText: string;
    let newPos: number;
    if (start !== end) {
      newText = yorubaText.substring(0, start) + yorubaText.substring(end);
      newPos = start;
    } else {
      newText = yorubaText.substring(0, start - 1) + yorubaText.substring(end);
      newPos = start - 1;
    }
    setYorubaText(newText);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = newPos;
        editorRef.current.focus();
      }
    }, 0);
  }, [yorubaText]);

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
        if (diff > 20 && diff < 350) setToneModeActive(prev => !prev);
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
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [activeVowel, diacriticIndex, confirmDiacritic, toneModeActive]);

  const handleSubmit = () => {
    if (!currentSentence || !yorubaText.trim()) return;
    onSubmit(currentSentence.english, yorubaText.trim(), currentSentence.category);
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Category selector */}
      <div className="flex flex-wrap gap-2 px-6 pt-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-md'
                : isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Challenge card */}
      <div className="px-6">
        {currentSentence ? (
          <div className={`rounded-2xl p-6 border-2 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              Translate to Yoruba
            </p>
            <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              {currentSentence.english}
            </p>
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
              currentSentence.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
              currentSentence.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {currentSentence.difficulty}
            </span>
          </div>
        ) : (
          <div className={`rounded-2xl p-6 text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
            <p className="text-sm text-slate-500">No sentences in this category yet</p>
          </div>
        )}
      </div>

      {/* Yoruba input */}
      <div className="px-6">
        <textarea
          ref={editorRef}
          value={yorubaText}
          onChange={e => setYorubaText(e.target.value)}
          placeholder="Type your Yoruba translation here..."
          className={`w-full h-32 p-6 text-xl font-medium leading-relaxed rounded-2xl border-2 outline-none transition-all resize-none ${
            toneModeActive
              ? 'border-emerald-500 bg-emerald-50/5 ring-4 ring-emerald-500/5'
              : isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-600' : 'bg-white border-slate-100 text-slate-900 focus:border-emerald-600'
          }`}
        />
        <div className="flex gap-2 mt-2">
          {submitted ? (
            <button onClick={pickRandom} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">
              Next Challenge
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!yorubaText.trim()}
              className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-lg disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
            >
              Submit Translation
            </button>
          )}
          <button onClick={pickRandom} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            Skip
          </button>
          {submitted && (
            <span className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
              <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px]">✓</span>
              Saved!
            </span>
          )}
        </div>
      </div>

      {/* Keyboard */}
      <div className={`p-6 border-t transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
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
    </div>
  );
};

export default TranslationChallenge;
