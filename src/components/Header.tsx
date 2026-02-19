import React from 'react';
import { useAppMode } from '../context/AppModeContext';

interface HeaderProps {
  toneModeActive: boolean;
  autoCopy: boolean;
  setAutoCopy: (val: boolean) => void;
  onShowHelp: () => void;
  onShowLeaderboard: () => void;
}

const Header: React.FC<HeaderProps> = ({ toneModeActive, autoCopy, setAutoCopy, onShowHelp, onShowLeaderboard }) => {
  const { mode, isDarkMode, setIsDarkMode, username } = useAppMode();

  return (
    <header className={`px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2 border-b ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-base sm:text-lg shadow-xl transition-all duration-300 ${toneModeActive ? 'bg-emerald-500 scale-110 rotate-3' : 'bg-emerald-600'} text-white`}>À</div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-black tracking-tight leading-none truncate">ODÙ Yorùbá Writer</h1>
          <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1 truncate ${toneModeActive ? 'text-emerald-500' : 'text-slate-500'}`}>
            {toneModeActive ? 'Scale Mode Active' : mode === 'contribute' && username ? `Contributor: ${username}` : mode === 'learn' ? 'Learning Mode' : 'Native Desktop App'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {mode !== 'simple' && (
          <button
            onClick={onShowHelp}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Guide
          </button>
        )}
        {mode === 'simple' && (
          <button
            onClick={onShowHelp}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Guide
          </button>
        )}
        <button
          onClick={onShowLeaderboard}
          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${isDarkMode ? 'bg-slate-700 text-amber-400' : 'bg-white text-amber-600 border border-slate-200'}`}
          title="Global Leaderboard"
        >
          🏆
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
  );
};

export default Header;
