
import React, { useEffect } from 'react';
import { KEYBOARD_LAYOUT, YORUBA_VOWELS } from '../constants';

interface KeyboardProps {
  onInput: (char: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
  isShiftToggled: boolean;
  setIsShiftToggled: (val: boolean) => void;
  isShiftPressed: boolean;
  toneModeActive: boolean;
  setToneModeActive: (val: boolean) => void;
  activeVowel: string | null;
  setActiveVowel: (val: string | null) => void;
  diacriticIndex: number;
  onDiacriticSelect: (vowel: string, index: number) => void;
  isDarkMode: boolean;
}

// Frequency mapping for Do (C4), Re (D4), Mi (E4)
const TONE_FREQUENCIES = [261.63, 293.66, 329.63];

const playTone = (index: number) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(TONE_FREQUENCIES[index], audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn("Audio Context blocked or unsupported");
  }
};

const Keyboard: React.FC<KeyboardProps> = ({ 
  onInput, 
  onBackspace, 
  onSpace, 
  isShiftToggled, 
  setIsShiftToggled,
  isShiftPressed,
  toneModeActive,
  setToneModeActive,
  activeVowel,
  setActiveVowel,
  diacriticIndex,
  onDiacriticSelect,
  isDarkMode
}) => {

  const effectiveShift = isShiftToggled || isShiftPressed;

  // Play tone whenever diacritic index changes
  useEffect(() => {
    if (activeVowel !== null) {
      playTone(diacriticIndex);
    }
  }, [diacriticIndex, activeVowel]);

  const handleKeyPress = (key: string) => {
    if (key === 'Shift') {
      setIsShiftToggled(!isShiftToggled);
      return;
    }
    if (key === 'Fn') {
      setToneModeActive(!toneModeActive);
      return;
    }
    if (key === 'Backspace') {
      onBackspace();
      return;
    }
    if (key === 'Space') {
      onSpace();
      return;
    }

    const lowerKey = key.toLowerCase();
    const char = effectiveShift ? key.toUpperCase() : key.toLowerCase();

    if (toneModeActive && YORUBA_VOWELS[lowerKey]) {
      setActiveVowel(lowerKey);
    } else {
      onInput(char);
      if (toneModeActive) setToneModeActive(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto select-none">
      {/* Diacritic Picker Popup */}
      {activeVowel && (
        <div className={`flex gap-2 sm:gap-3 justify-center mb-4 sm:mb-8 p-3 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-200 border-4 ${
          isDarkMode ? 'bg-slate-800 border-emerald-500/30' : 'bg-white border-emerald-500/20'
        }`}>
          <div className={`flex flex-col justify-center px-3 sm:px-6 border-r-2 mr-1 sm:mr-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <span className="text-[9px] sm:text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Scale</span>
            <span className={`text-2xl sm:text-3xl font-black uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{activeVowel}</span>
          </div>

          {[
            { label: 'Low (Do)', val: YORUBA_VOWELS[activeVowel].low },
            { label: 'Mid (Re)', val: YORUBA_VOWELS[activeVowel].base },
            { label: 'High (Mi)', val: YORUBA_VOWELS[activeVowel].high }
          ].map((item, idx) => (
            <button
              key={idx}
              onMouseEnter={() => {}}
              onClick={() => onDiacriticSelect(activeVowel, idx)}
              className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-bold flex flex-col items-center justify-center transition-all shadow-xl border-b-[4px] sm:border-b-[6px] relative ${
                diacriticIndex === idx 
                  ? 'bg-emerald-600 text-white border-emerald-800 scale-110 ring-8 ring-emerald-500/10 z-10' 
                  : isDarkMode 
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-900' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className={`text-[10px] font-black uppercase mb-1 ${diacriticIndex === idx ? 'text-emerald-100' : 'opacity-40'}`}>
                {item.label}
              </span>
              {effectiveShift ? item.val.toUpperCase() : item.val.toLowerCase()}
              {diacriticIndex === idx && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-4 border-emerald-600 animate-pulse shadow-md" />
              )}
            </button>
          ))}

          <div className="flex flex-col justify-center ml-4 gap-2">
            <button onClick={() => onDiacriticSelect(activeVowel, diacriticIndex)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20">Confirm</button>
            <button onClick={() => { setActiveVowel(null); setToneModeActive(false); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>Cancel</button>
          </div>
        </div>
      )}

      {/* Keyboard Layout */}
      <div className="space-y-2">
        {KEYBOARD_LAYOUT.map((row, idx) => (
          <div key={idx} className="flex justify-center gap-1.5">
            {row.map((key) => {
              const isSpecial = ['Shift', 'Fn', 'Backspace', 'Space'].includes(key);
              const isDot = ['ẹ', 'ọ', 'ṣ'].includes(key);
              const isKeyShiftActive = (key === 'Shift' && effectiveShift);
              const isKeyToneActive = (isSpecial && key === 'Fn' && toneModeActive);

              let keyClass = `flex items-center justify-center rounded-xl sm:rounded-2xl font-bold transition-all active:translate-y-1 active:shadow-none border-b-4 ${key === 'Space' ? 'w-32 sm:w-56' : isSpecial ? 'px-3 sm:px-5' : 'w-8 h-10 sm:w-12 sm:h-14'} `;

              if (isKeyShiftActive) {
                keyClass += 'bg-amber-500 text-white border-amber-700 shadow-[0_4px_15px_rgba(245,158,11,0.5)] scale-105 z-10 ';
              } else if (isKeyToneActive) {
                keyClass += 'bg-emerald-500 text-white border-emerald-700 shadow-[0_4px_15px_rgba(16,185,129,0.5)] scale-105 z-10 ';
              } else if (isDot) {
                keyClass += 'bg-emerald-600 text-white border-emerald-800 hover:bg-emerald-500 ';
              } else if (isSpecial) {
                keyClass += isDarkMode ? 'bg-slate-700 text-slate-200 border-slate-800 hover:bg-slate-600 ' : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-100 ';
              } else {
                keyClass += isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-950 hover:bg-slate-700 ' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 ';
              }

              keyClass += (!isSpecial && !isDot ? 'text-base sm:text-xl' : 'text-[9px] sm:text-[11px] uppercase tracking-tighter');

              return (
                <button key={key} onClick={() => handleKeyPress(key)} className={keyClass}>
                  {key === 'Shift' ? 'Shift' : key === 'Fn' ? (toneModeActive ? 'Scale' : 'Fn') : key === 'Backspace' ? '⌫' : key === 'Space' ? 'Space' : effectiveShift ? key.toUpperCase() : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-center gap-8">
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${toneModeActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-slate-400 opacity-20'}`} />
            <span className={`text-[10px] font-black uppercase ${toneModeActive ? 'text-emerald-500' : 'text-slate-400 opacity-50'}`}>Scale Mode Active (Do Re Mi)</span>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isShiftPressed ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,1)]' : 'bg-slate-400 opacity-20'}`} />
            <span className={`text-[10px] font-black uppercase ${isShiftPressed ? 'text-amber-500' : 'text-slate-400 opacity-50'}`}>Shift Active</span>
        </div>
      </div>
    </div>
  );
};

export default Keyboard;
