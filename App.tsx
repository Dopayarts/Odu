
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Keyboard from './components/Keyboard';
import { YORUBA_VOWELS } from './constants';

const App: React.FC = () => {
  const [editorText, setEditorText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const [isShiftToggled, setIsShiftToggled] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [toneModeActive, setToneModeActive] = useState(false);
  const lastShiftPressRef = useRef<number>(0);

  const [activeVowel, setActiveVowel] = useState<string | null>(null);
  const [diacriticIndex, setDiacriticIndex] = useState(0); 
  const [autoCopy, setAutoCopy] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('yoruba-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const effectiveShift = isShiftToggled || isShiftPressed;

  useEffect(() => {
    localStorage.setItem('yoruba-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setDiacriticIndex(prev => (prev + 1) % 3);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setDiacriticIndex(prev => (prev - 1 + 3) % 3);
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          confirmDiacritic(activeVowel, diacriticIndex);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setActiveVowel(null);
          setToneModeActive(false);
          return;
        }
        if (['1', '2', '3'].includes(e.key)) {
          e.preventDefault();
          confirmDiacritic(activeVowel, parseInt(e.key) - 1);
          return;
        }
      }

      if ((document.activeElement === editorRef.current || !activeVowel) && !showHelp) {
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
  }, [activeVowel, diacriticIndex, confirmDiacritic, toneModeActive, showHelp]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editorText);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center p-2 md:p-6 font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-200 text-slate-900'}`}>
      <div className={`w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border-2 transition-all duration-500 ${
        toneModeActive 
          ? 'border-emerald-500 ring-8 ring-emerald-500/10' 
          : isDarkMode ? 'border-slate-800' : 'border-white'
      } ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        
        <header className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-xl transition-all duration-300 ${toneModeActive ? 'bg-emerald-500 scale-110 rotate-3' : 'bg-emerald-600'} text-white`}>À</div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none">ODÙ Yorùbá Writer</h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${toneModeActive ? 'text-emerald-500' : 'text-slate-500'}`}>
                {toneModeActive ? 'Scale Mode Active' : 'Native Desktop App'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHelp(true)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              Guide
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Auto-Sync</span>
              <button onClick={() => setAutoCopy(!autoCopy)} className={`w-8 h-4 rounded-full relative transition-colors ${autoCopy ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${autoCopy ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-all active:rotate-45 ${isDarkMode ? 'bg-slate-700 text-amber-400' : 'bg-white text-emerald-600 shadow-sm'}`}>
              {isDarkMode ? '☀' : '🌙'}
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 flex flex-col gap-4">
          <div className="relative group">
            <textarea
              ref={editorRef}
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              placeholder="Start typing or double-press SHIFT for Tones (Do-Re-Mi)..."
              className={`w-full h-80 p-8 text-2xl font-medium leading-relaxed rounded-3xl border-2 outline-none transition-all resize-none shadow-inner ${
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
              <button onClick={() => setEditorText('')} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-red-900 hover:text-white transition-all">Clear</button>
              <button onClick={copyToClipboard} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xl shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all">Copy to Clipboard</button>
            </div>
          </div>
        </div>

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

      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`max-w-xl w-full rounded-[2.5rem] p-8 shadow-2xl border-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">?</span>
              App Usage Guide
            </h2>
            <div className="space-y-6 text-sm font-medium">
              <section>
                <h3 className="text-emerald-500 font-black uppercase text-[10px] tracking-widest mb-2">Typing Tones (Do-Re-Mi)</h3>
                <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                  Quickly press <kbd className="bg-slate-800 px-1 rounded text-white mx-1">Shift</kbd> twice. The header will pulse green. Then press a vowel (e.g., <strong>A, E, I</strong>). Use <strong>Arrow Keys</strong> to hear the pitch and <strong>Enter</strong> to select.
                </p>
              </section>
              <section>
                <h3 className="text-emerald-500 font-black uppercase text-[10px] tracking-widest mb-2">MS Word Sync</h3>
                <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                  With <strong>Auto-Sync</strong> enabled, everything you type is automatically copied to your clipboard. Switch to Word/WordPress and press <kbd className="bg-slate-800 px-1 rounded text-white mx-1">Ctrl + V</kbd> to paste.
                </p>
              </section>
              <section className="bg-slate-500/5 p-4 rounded-2xl border border-slate-500/20">
                <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-2">Privacy</h3>
                <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>
                  This app runs 100% locally on your machine. No data is ever sent to the cloud.
                </p>
              </section>
            </div>
            <button 
              onClick={() => setShowHelp(false)}
              className="mt-8 w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-900/40 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

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

export default App;
