import React from 'react';
import { useAppMode } from '../context/AppModeContext';
import { AppMode } from '../../types';

interface ModeSwitcherProps {
  glowTarget?: 'learn' | 'contribute' | null;
}

const MODES: { id: AppMode; label: string; desc: string }[] = [
  { id: 'simple', label: 'Simple', desc: 'Just type' },
  { id: 'learn', label: 'Learn', desc: 'Practice' },
  { id: 'contribute', label: 'Contribute', desc: 'Train AI' },
];

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ glowTarget }) => {
  const { mode, setMode, isDarkMode } = useAppMode();

  return (
    <div className={`flex justify-center gap-2 px-6 py-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
      {MODES.map(m => {
        const isActive = mode === m.id;
        const isGlowing = glowTarget === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              isActive
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 scale-105'
                : isDarkMode
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            } ${isGlowing && !isActive ? 'glow-pulse ring-2 ring-emerald-400/50' : ''}`}
          >
            <span className="block">{m.label}</span>
            <span className={`block text-[8px] font-medium mt-0.5 ${isActive ? 'text-emerald-100' : 'opacity-50'}`}>{m.desc}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ModeSwitcher;
