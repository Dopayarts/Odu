import React from 'react';
import { useAppMode } from '../context/AppModeContext';

interface ContributionStatsProps {
  totalCount: number;
  unsyncedCount: number;
  syncStatus: 'idle' | 'syncing' | 'error';
  onExport: () => void;
  onSync: () => void;
}

const ContributionStats: React.FC<ContributionStatsProps> = ({ totalCount, unsyncedCount, syncStatus, onExport, onSync }) => {
  const { isDarkMode } = useAppMode();

  return (
    <div className={`flex items-center gap-3 px-6 py-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-emerald-50'}`}>
        <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contributions</span>
        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[11px] font-black min-w-[24px] text-center">{totalCount}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' :
          syncStatus === 'error' ? 'bg-red-400' :
          unsyncedCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'
        }`} />
        <span className={`text-[9px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {syncStatus === 'syncing' ? 'Syncing...' :
           unsyncedCount > 0 ? `${unsyncedCount} pending` : 'All synced'}
        </span>
      </div>

      <div className="ml-auto flex gap-2">
        {unsyncedCount > 0 && (
          <button
            onClick={onSync}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Sync Now
          </button>
        )}
        {totalCount > 0 && (
          <button
            onClick={onExport}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            Export CSV
          </button>
        )}
      </div>
    </div>
  );
};

export default ContributionStats;
