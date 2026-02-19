import React, { useState, useCallback } from 'react';
import { AppModeProvider, useAppMode } from './context/AppModeContext';
import Header from './components/Header';
import WriterPanel from './components/WriterPanel';
import ModeSwitcher from './components/ModeSwitcher';
import UsernamePrompt from './components/UsernamePrompt';
import TabBar from './components/TabBar';
import TranslationChallenge from './components/TranslationChallenge';
import ContributionStats from './components/ContributionStats';
import HintTooltip from './components/HintTooltip';
import { useContributions } from './hooks/useContributions';
import { useGoogleFormsSync } from './hooks/useGoogleFormsSync';
import { useHints } from './hooks/useHints';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useWordSuggestions } from './hooks/useWordSuggestions';
import { useAppUpdate } from './hooks/useAppUpdate';
import Leaderboard from './components/Leaderboard';

const AppContent: React.FC = () => {
  const { mode, isDarkMode, username } = useAppMode();
  const [showHelp, setShowHelp] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'practice'>('write');
  const [autoCopy, setAutoCopy] = useState(true);

  const { contributions, addContribution, markSynced, exportCSV, unsyncedCount } = useContributions();
  const { enqueue, syncStatus, processQueue } = useGoogleFormsSync(markSynced);
  const { activeHint, dismissHint } = useHints(mode);
  const leaderboard = useLeaderboard(username || undefined);
  const wordSuggestions = useWordSuggestions();
  const update = useAppUpdate();

  // When entering contribute mode, prompt for username if not set
  const handleModeChange = useCallback(() => {
    if (mode === 'contribute' && !username) {
      setShowUsernamePrompt(true);
    }
  }, [mode, username]);

  // Check for username when mode changes to contribute
  React.useEffect(() => {
    handleModeChange();
  }, [handleModeChange]);

  const handleSaveContribution = useCallback((yoruba: string, english: string) => {
    if (!username) {
      setShowUsernamePrompt(true);
      return;
    }
    const item = addContribution({
      english,
      yoruba,
      username,
      mode: 'freeform',
    });
    enqueue(item);
  }, [username, addContribution, enqueue]);

  const handleChallengeSubmit = useCallback((english: string, yoruba: string, category: string) => {
    const currentUsername = username || 'anonymous';
    const item = addContribution({
      english,
      yoruba,
      username: currentUsername,
      mode: 'challenge',
      category,
    });
    enqueue(item);
  }, [username, addContribution, enqueue]);

  return (
    <div className={`min-h-screen flex flex-col items-center p-2 md:p-6 font-sans transition-colors duration-300 overflow-y-auto ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-200 text-slate-900'}`}>
      <div className={`w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col border-2 transition-all duration-500 ${
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-white bg-slate-50'
      }`}>

        <Header
          toneModeActive={false}
          autoCopy={autoCopy}
          setAutoCopy={setAutoCopy}
          onShowHelp={() => setShowHelp(true)}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          updateStatus={update.status}
          updateVersion={update.version}
          updateProgress={update.progress}
          onUpdateClick={update.status === 'downloaded' ? update.installUpdate : update.downloadUpdate}
        />

        {/* Contribution stats bar — contribute mode only */}
        {mode === 'contribute' && (
          <ContributionStats
            totalCount={contributions.length}
            unsyncedCount={unsyncedCount}
            syncStatus={syncStatus}
            onExport={exportCSV}
            onSync={processQueue}
          />
        )}

        {/* Tab bar — learn and contribute modes */}
        {mode !== 'simple' && (
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        {/* Main content */}
        {(mode === 'simple' || activeTab === 'write') && (
          <WriterPanel
            onSaveContribution={mode === 'contribute' ? handleSaveContribution : undefined}
            wordSuggestions={wordSuggestions}
          />
        )}

        {mode !== 'simple' && activeTab === 'practice' && (
          <TranslationChallenge onSubmit={handleChallengeSubmit} />
        )}

        {/* Mode switcher at bottom */}
        <div className="relative">
          {activeHint && (
            <HintTooltip
              text={activeHint.text}
              onDismiss={() => dismissHint(activeHint.id)}
            />
          )}
          <ModeSwitcher glowTarget={activeHint?.target || null} />
        </div>
      </div>

      {/* Help modal */}
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
              {mode === 'contribute' && (
                <section>
                  <h3 className="text-amber-500 font-black uppercase text-[10px] tracking-widest mb-2">Contribute Mode</h3>
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                    Your translations help train the ODU AI translator for the Yoruba-speaking Griot Avatar. Contributors will be credited in the <strong>Untangler</strong> exhibition. Use the Practice tab to translate English sentences, or write freely and save contributions.
                  </p>
                </section>
              )}
              <section className="bg-slate-500/5 p-4 rounded-2xl border border-slate-500/20">
                <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-2">Privacy</h3>
                <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>
                  {mode === 'contribute'
                    ? 'In Contribute mode, your translations and username are stored locally and optionally synced to a Google Form for AI training. No other data is collected.'
                    : 'This app runs 100% locally on your machine. No data is ever sent to the cloud.'}
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

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <Leaderboard
          rankings={leaderboard.rankings}
          myRank={leaderboard.myRank}
          myCount={leaderboard.myCount}
          totalContributions={leaderboard.totalContributions}
          loading={leaderboard.loading}
          error={leaderboard.error}
          lastUpdated={leaderboard.lastUpdated}
          currentUsername={username || undefined}
          onRefresh={leaderboard.refresh}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Username prompt modal */}
      {showUsernamePrompt && (
        <UsernamePrompt onClose={() => setShowUsernamePrompt(false)} />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AppModeProvider>
    <AppContent />
  </AppModeProvider>
);

export default App;
