import React from 'react';
import { useAppMode } from '../context/AppModeContext';
import { LeaderboardEntry } from '../hooks/useLeaderboard';

interface LeaderboardProps {
  rankings: LeaderboardEntry[];
  myRank: number | null;
  myCount: number;
  totalContributions: number;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  currentUsername?: string;
  onRefresh: () => void;
  onClose: () => void;
}

const medalColors: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-slate-300',
  3: 'text-amber-600',
};

const medalBg: Record<number, string> = {
  1: 'bg-amber-400/20 border-amber-400/40',
  2: 'bg-slate-300/20 border-slate-300/40',
  3: 'bg-amber-600/20 border-amber-600/40',
};

const Leaderboard: React.FC<LeaderboardProps> = ({
  rankings,
  myRank,
  myCount,
  totalContributions,
  loading,
  error,
  lastUpdated,
  currentUsername,
  onRefresh,
  onClose,
}) => {
  const { isDarkMode } = useAppMode();
  const maxCount = rankings.length > 0 ? rankings[0].count : 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`max-w-xl w-full max-h-[85vh] rounded-[2.5rem] shadow-2xl border-2 flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
        {/* Header */}
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
            <span className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-lg">🏆</span>
            Global Leaderboard
          </h2>

          {/* Summary bar */}
          <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {rankings.length > 0
              ? `${rankings.length} contributor${rankings.length !== 1 ? 's' : ''} worldwide · ${totalContributions} total translations`
              : 'No contributions yet'}
          </p>

          {/* Current user callout */}
          {myRank !== null && (
            <div className="mt-3 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">Your rank</span>
              <span className="text-emerald-400 font-black text-lg">#{myRank} <span className="text-xs font-bold opacity-70">({myCount} translations)</span></span>
            </div>
          )}
        </div>

        {/* Rankings list */}
        <div className="flex-1 overflow-y-auto px-8 pb-2">
          {loading && rankings.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className={`ml-3 text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading leaderboard...</span>
            </div>
          )}

          {error && rankings.length === 0 && (
            <div className="text-center py-12">
              <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {error.includes('not configured')
                  ? 'Leaderboard will be available once the Google Sheet is published.'
                  : 'Could not load leaderboard. Check your connection and try again.'}
              </p>
            </div>
          )}

          {rankings.map((entry) => {
            const isMe = currentUsername && entry.username.toLowerCase() === currentUsername.toLowerCase();
            const barWidth = Math.max(8, (entry.count / maxCount) * 100);

            return (
              <div
                key={entry.username}
                className={`flex items-center gap-3 py-2.5 px-3 mb-1.5 rounded-2xl transition-colors ${
                  isMe
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : entry.rank <= 3
                    ? `${medalBg[entry.rank]} border`
                    : isDarkMode
                    ? 'hover:bg-slate-800/50'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Rank */}
                <span className={`w-8 text-center font-black text-sm ${
                  entry.rank <= 3 ? medalColors[entry.rank] : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {entry.rank <= 3 ? ['', '🥇', '🥈', '🥉'][entry.rank] : `#${entry.rank}`}
                </span>

                {/* Username + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-black truncate ${
                      isMe ? 'text-emerald-400' : isDarkMode ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                      {entry.username}{isMe ? ' (you)' : ''}
                    </span>
                    <span className={`text-xs font-bold ml-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {entry.count}
                    </span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isMe ? 'bg-emerald-500' : entry.rank === 1 ? 'bg-amber-400' : entry.rank === 2 ? 'bg-slate-300' : entry.rank === 3 ? 'bg-amber-600' : 'bg-emerald-600/60'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-8 pt-4 space-y-3">
          {lastUpdated && lastUpdated > 0 && (
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
              <button
                onClick={onRefresh}
                disabled={loading}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${
                  loading
                    ? 'opacity-50 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-900/40 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
