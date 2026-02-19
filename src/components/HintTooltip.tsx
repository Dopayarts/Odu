import React from 'react';
import { useAppMode } from '../context/AppModeContext';

interface HintTooltipProps {
  text: string;
  onDismiss: () => void;
}

const HintTooltip: React.FC<HintTooltipProps> = ({ text, onDismiss }) => {
  const { isDarkMode } = useAppMode();

  return (
    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2.5 rounded-2xl shadow-xl border-2 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-xs text-center ${
      isDarkMode ? 'bg-slate-800 border-emerald-500/30 text-slate-200' : 'bg-white border-emerald-500/20 text-slate-700'
    }`}>
      <p className="text-xs font-bold">{text}</p>
      <button
        onClick={onDismiss}
        className={`mt-1 text-[9px] font-black uppercase ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
      >
        Got it
      </button>
      <div className={`absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 -mt-1.5 border-r-2 border-b-2 ${
        isDarkMode ? 'bg-slate-800 border-emerald-500/30' : 'bg-white border-emerald-500/20'
      }`} />
    </div>
  );
};

export default HintTooltip;
