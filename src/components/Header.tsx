import React, { useState, useEffect } from 'react';
import { useAppMode } from '../context/AppModeContext';
import type { UpdateStatus } from '../hooks/useAppUpdate';
import platform from '../utils/platform';

interface HeaderProps {
  toneModeActive: boolean;
  autoCopy: boolean;
  setAutoCopy: (val: boolean) => void;
  onShowHelp: () => void;
  onShowLeaderboard: () => void;
  updateStatus?: UpdateStatus;
  updateVersion?: string | null;
  updateProgress?: number;
  onDownloadUpdate?: () => void;
  onInstallUpdate?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toneModeActive, autoCopy, setAutoCopy, onShowHelp, onShowLeaderboard, updateStatus, updateVersion, updateProgress, onDownloadUpdate, onInstallUpdate }) => {
  const { mode, isDarkMode, setIsDarkMode, username, togglePinMode } = useAppMode();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  // Auto-open install dialog when download completes
  useEffect(() => {
    if (updateStatus === 'downloaded') {
      setShowUpdateDialog(true);
    }
  }, [updateStatus]);

  return (
    <header className={`px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2 border-b ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-base sm:text-lg shadow-xl transition-all duration-300 ${toneModeActive ? 'bg-emerald-500 scale-110 rotate-3' : 'bg-emerald-600'} text-white`}>À</div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-black tracking-tight leading-none truncate">ODÙ Yorùbá Writer</h1>
          <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1 truncate ${toneModeActive ? 'text-emerald-500' : 'text-slate-500'}`}>
            {toneModeActive ? 'Scale Mode Active' : mode === 'contribute' && username ? `Contributor: ${username}` : mode === 'learn' ? 'Learning Mode' : platform.isCapacitor ? 'Mobile App' : 'Native Desktop App'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {platform.isElectron && updateStatus === 'available' && (
          <button
            onClick={() => setShowUpdateDialog(true)}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm bg-amber-500 text-white animate-pulse hover:bg-amber-600 hover:animate-none"
          >
            Update
          </button>
        )}
        {platform.isElectron && updateStatus === 'downloading' && (
          <button
            disabled
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm bg-blue-500 text-white cursor-wait"
          >
            {updateProgress}%
          </button>
        )}
        {platform.isElectron && updateStatus === 'downloaded' && (
          <button
            onClick={() => setShowUpdateDialog(true)}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm bg-emerald-500 text-white animate-pulse hover:bg-emerald-600 hover:animate-none"
          >
            Restart to Update
          </button>
        )}
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
        {platform.isElectron && (
          <button
            onClick={togglePinMode}
            title="Pin Mode — compact floating keyboard"
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:text-emerald-400' : 'bg-white text-slate-600 hover:text-emerald-600 shadow-sm'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          </button>
        )}
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-all active:rotate-45 ${isDarkMode ? 'bg-slate-700 text-amber-400' : 'bg-white text-emerald-600 shadow-sm'}`}>
          {isDarkMode ? '☀' : '🌙'}
        </button>
      </div>

      {platform.isElectron && showUpdateDialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`max-w-sm w-full rounded-2xl p-6 shadow-2xl border-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="text-lg font-black mb-2">
              {updateStatus === 'downloaded' ? 'Ready to Install' : `Update to v${updateVersion}`}
            </h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {updateStatus === 'downloaded'
                ? 'The update has been downloaded. Restart now to install it?'
                : `A new version (v${updateVersion}) is available. Would you like to download and install it?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpdateDialog(false)}
                className={`flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUpdateDialog(false);
                  if (updateStatus === 'downloaded') {
                    onInstallUpdate?.();
                  } else {
                    onDownloadUpdate?.();
                  }
                }}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition-all"
              >
                {updateStatus === 'downloaded' ? 'Restart' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
