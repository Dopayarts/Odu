import React, { useState, useEffect, useCallback } from 'react';
import { useAppMode } from '../context/AppModeContext';
import { GOOGLE_QUIZ_FORMS_CONFIG, GOOGLE_SHEET_EDIT_URL, GOOGLE_QUIZ_SHEET_EDIT_URL } from '../constants';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminPanelProps {
  onClose: () => void;
}

interface UserRecord {
  uid: string;
  username: string;
  email: string;
  location: string;
  createdAt: string;
  banned: boolean;
  warned: boolean;
  warningMessage?: string;
}

const CATEGORIES = ['greeting', 'family', 'food', 'market', 'travel', 'proverb'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

type Tab = 'quiz' | 'users';

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { isDarkMode } = useAppMode();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // ── Quiz tab state ────────────────────────────────────────────────────────────
  const [english, setEnglish] = useState('');
  const [yorubaAnswer, setYorubaAnswer] = useState('');
  const [category, setCategory] = useState('greeting');
  const [difficulty, setDifficulty] = useState('beginner');
  const [quizStatus, setQuizStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [recentEntries, setRecentEntries] = useState<{ english: string; yoruba: string }[]>([]);

  // ── Users tab state ───────────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionStatus, setActionStatus] = useState<Record<string, 'idle' | 'pending' | 'done' | 'error'>>({});
  const [warnMessage, setWarnMessage] = useState<Record<string, string>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list: UserRecord[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          uid: d.id,
          username: data.username || '(no username)',
          email: data.email || '(no email)',
          location: data.location || '—',
          createdAt: data.createdAt || '',
          banned: !!data.banned,
          warned: !!data.warned,
          warningMessage: data.warningMessage || '',
        };
      });
      list.sort((a, b) => a.username.localeCompare(b.username));
      setUsers(list);
    } catch {
      // ignore
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  const setUserStatus = async (uid: string, updates: Partial<UserRecord>) => {
    setActionStatus(prev => ({ ...prev, [uid]: 'pending' }));
    try {
      await updateDoc(doc(db, 'users', uid), updates as Record<string, unknown>);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } : u));
      setActionStatus(prev => ({ ...prev, [uid]: 'done' }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, [uid]: 'idle' })), 1500);
    } catch {
      setActionStatus(prev => ({ ...prev, [uid]: 'error' }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, [uid]: 'idle' })), 2000);
    }
  };

  const handleWarn = (uid: string) => {
    const msg = warnMessage[uid]?.trim() || 'You have received a warning for violating community guidelines.';
    setUserStatus(uid, { warned: true, warningMessage: msg });
  };

  const handleRemoveWarn = (uid: string) => {
    setUserStatus(uid, { warned: false, warningMessage: '' });
  };

  const handleBan = (uid: string) => {
    setUserStatus(uid, { banned: true });
  };

  const handleUnban = (uid: string) => {
    setUserStatus(uid, { banned: false });
  };

  // ── Quiz submit ───────────────────────────────────────────────────────────────
  const handleQuizSubmit = async () => {
    if (!english.trim() || !yorubaAnswer.trim()) return;
    if (!GOOGLE_QUIZ_FORMS_CONFIG.formUrl) { setQuizStatus('error'); return; }
    setQuizStatus('sending');
    try {
      const formData = new URLSearchParams();
      formData.append(GOOGLE_QUIZ_FORMS_CONFIG.fields.english, english.trim());
      formData.append(GOOGLE_QUIZ_FORMS_CONFIG.fields.yoruba_answer, yorubaAnswer.trim());
      formData.append(GOOGLE_QUIZ_FORMS_CONFIG.fields.category, category);
      formData.append(GOOGLE_QUIZ_FORMS_CONFIG.fields.difficulty, difficulty);
      await fetch(GOOGLE_QUIZ_FORMS_CONFIG.formUrl, { method: 'POST', mode: 'no-cors', body: formData });
      setRecentEntries(prev => [{ english: english.trim(), yoruba: yorubaAnswer.trim() }, ...prev.slice(0, 9)]);
      setEnglish(''); setYorubaAnswer('');
      setQuizStatus('success');
      setTimeout(() => setQuizStatus('idle'), 2000);
    } catch {
      setQuizStatus('error');
      setTimeout(() => setQuizStatus('idle'), 3000);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const baseBtn = `px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className={`max-w-2xl w-full rounded-[2rem] shadow-2xl border-2 max-h-[95vh] flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 flex-shrink-0">
          <span className="w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center text-sm font-black">A</span>
          <div>
            <h2 className="text-xl font-black">DopayMasterMode</h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Admin Control Panel</p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b mx-6 flex-shrink-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          {(['users', 'quiz'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors capitalize ${
                activeTab === tab
                  ? isDarkMode ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-emerald-600 border-b-2 border-emerald-600'
                  : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'users' ? `Users (${users.length})` : 'Quiz Manager'}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── USERS TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Google Sheets links */}
              <div className="flex flex-wrap gap-2">
                {GOOGLE_SHEET_EDIT_URL && (
                  <button
                    onClick={() => window.open(GOOGLE_SHEET_EDIT_URL, '_blank')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all hover:scale-[1.02] ${isDarkMode ? 'border-green-700/50 text-green-400 hover:border-green-500' : 'border-green-200 text-green-700 hover:border-green-400'}`}
                  >
                    📊 Training Data Sheet
                  </button>
                )}
                <button
                  onClick={fetchUsers}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all hover:scale-[1.02] ${isDarkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}
                >
                  ↻ Refresh
                </button>
              </div>

              {/* Search */}
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by username, email, or location…"
                className={`w-full px-4 py-2.5 rounded-xl border-2 outline-none text-sm ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600'}`}
              />

              {/* Stats row */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Total', val: users.length, color: 'text-slate-400' },
                  { label: 'Warned', val: users.filter(u => u.warned).length, color: 'text-amber-400' },
                  { label: 'Banned', val: users.filter(u => u.banned).length, color: 'text-red-400' },
                ].map(s => (
                  <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <span className={s.color}>{s.val}</span>
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* User list */}
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className={`text-xs text-center py-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No users found.</p>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(user => {
                    const status = actionStatus[user.uid] || 'idle';
                    const isExpanded = expandedUser === user.uid;
                    return (
                      <div
                        key={user.uid}
                        className={`rounded-2xl border-2 overflow-hidden transition-all ${
                          user.banned
                            ? isDarkMode ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50'
                            : user.warned
                              ? isDarkMode ? 'border-amber-800 bg-amber-900/20' : 'border-amber-200 bg-amber-50'
                              : isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        {/* User row — always visible */}
                        <button
                          onClick={() => setExpandedUser(isExpanded ? null : user.uid)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                              user.banned ? 'bg-red-600 text-white' : user.warned ? 'bg-amber-500 text-white' : 'bg-emerald-600/20 text-emerald-400'
                            }`}>
                              {user.username[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                {user.username}
                                {user.banned && <span className="ml-2 text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black uppercase">Banned</span>}
                                {user.warned && !user.banned && <span className="ml-2 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black uppercase">Warned</span>}
                              </p>
                              <p className={`text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {user.email} · {user.location}
                              </p>
                            </div>
                          </div>
                          <span className={`text-slate-400 text-xs ml-2 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                        </button>

                        {/* Expanded actions */}
                        {isExpanded && (
                          <div className={`px-4 pb-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <div className={`pt-3 text-xs space-y-1 mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              <p><span className="font-bold">Email:</span> {user.email}</p>
                              <p><span className="font-bold">Location:</span> {user.location}</p>
                              {user.createdAt && <p><span className="font-bold">Joined:</span> {new Date(user.createdAt).toLocaleDateString()}</p>}
                              {user.warningMessage && <p><span className="font-bold">Warning:</span> {user.warningMessage}</p>}
                            </div>

                            {/* Warning message input */}
                            {!user.warned && !user.banned && (
                              <input
                                value={warnMessage[user.uid] || ''}
                                onChange={e => setWarnMessage(prev => ({ ...prev, [user.uid]: e.target.value }))}
                                placeholder="Warning message (optional)…"
                                className={`w-full px-3 py-2 mb-2 rounded-xl border-2 outline-none text-xs ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-amber-600' : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'}`}
                              />
                            )}

                            <div className="flex flex-wrap gap-2">
                              {/* Warn / Remove warn */}
                              {!user.banned && (
                                user.warned ? (
                                  <button
                                    onClick={() => handleRemoveWarn(user.uid)}
                                    disabled={status === 'pending'}
                                    className={`${baseBtn} ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                  >
                                    {status === 'pending' ? '…' : status === 'done' ? '✓' : 'Remove Warning'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleWarn(user.uid)}
                                    disabled={status === 'pending'}
                                    className={`${baseBtn} bg-amber-500 text-white hover:bg-amber-600`}
                                  >
                                    {status === 'pending' ? '…' : status === 'done' ? '✓' : '⚠ Warn'}
                                  </button>
                                )
                              )}

                              {/* Ban / Unban */}
                              {user.banned ? (
                                <button
                                  onClick={() => handleUnban(user.uid)}
                                  disabled={status === 'pending'}
                                  className={`${baseBtn} ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                  {status === 'pending' ? '…' : status === 'done' ? '✓' : 'Unban User'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBan(user.uid)}
                                  disabled={status === 'pending'}
                                  className={`${baseBtn} bg-red-600 text-white hover:bg-red-700`}
                                >
                                  {status === 'pending' ? '…' : status === 'done' ? '✓' : '🚫 Ban'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── QUIZ TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              {/* Sheet links */}
              <div className="flex gap-3">
                {GOOGLE_SHEET_EDIT_URL && (
                  <button
                    onClick={() => window.open(GOOGLE_SHEET_EDIT_URL, '_blank')}
                    className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-slate-800/50 border-green-700/50 hover:border-green-500' : 'bg-green-50 border-green-200 hover:border-green-400'}`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-600 text-white'}`}>T</span>
                    <div className="text-left">
                      <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Training Data</div>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>Open Sheet</div>
                    </div>
                  </button>
                )}
                {GOOGLE_QUIZ_SHEET_EDIT_URL && (
                  <button
                    onClick={() => window.open(GOOGLE_QUIZ_SHEET_EDIT_URL, '_blank')}
                    className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-slate-800/50 border-amber-700/50 hover:border-amber-500' : 'bg-amber-50 border-amber-200 hover:border-amber-400'}`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-amber-600/20 text-amber-400' : 'bg-amber-600 text-white'}`}>Q</span>
                    <div className="text-left">
                      <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Quiz Data</div>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>Open Sheet</div>
                    </div>
                  </button>
                )}
              </div>

              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>English</label>
                <input value={english} onChange={e => setEnglish(e.target.value)} placeholder="e.g. Good morning"
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-sm font-medium ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-600' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-600'}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Yoruba Answer</label>
                <input value={yorubaAnswer} onChange={e => setYorubaAnswer(e.target.value)} placeholder="e.g. Ẹ ku aaro"
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-sm font-medium ${isDarkMode ? 'bg-slate-950 border-amber-800/50 text-white focus:border-emerald-600' : 'bg-white border-amber-200 text-slate-900 focus:border-emerald-600'}`} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none text-xs font-bold ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none text-xs font-bold ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleQuizSubmit} disabled={!english.trim() || !yorubaAnswer.trim() || quizStatus === 'sending'}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40">
                {quizStatus === 'sending' ? 'Saving…' : quizStatus === 'success' ? 'Saved!' : quizStatus === 'error' ? 'Error — Try Again' : 'Add Quiz Entry'}
              </button>

              {recentEntries.length > 0 && (
                <div>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Recently Added</h3>
                  <div className="space-y-1">
                    {recentEntries.map((e, i) => (
                      <div key={i} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{e.english}</span>
                        <span className={`font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{e.yoruba}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer close button */}
        <div className="px-6 pb-6 pt-3 flex-shrink-0">
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Close Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
