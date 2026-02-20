import React, { useState, useEffect } from 'react';
import { useAppMode } from '../context/AppModeContext';
import { GOOGLE_QUIZ_FORMS_CONFIG, GOOGLE_SHEET_EDIT_URL, GOOGLE_QUIZ_SHEET_EDIT_URL } from '../constants';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';


interface AdminPanelProps {
  onClose: () => void;
}

const CATEGORIES = ['greeting', 'family', 'food', 'market', 'travel', 'proverb'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { isDarkMode } = useAppMode();
  const [english, setEnglish] = useState('');
  const [yorubaAnswer, setYorubaAnswer] = useState('');
  const [category, setCategory] = useState('greeting');
  const [difficulty, setDifficulty] = useState('beginner');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [recentEntries, setRecentEntries] = useState<{ english: string; yoruba: string }[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<number | null>(null);

  // Fetch registered users count on mount
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setRegisteredUsers(snapshot.size);
      } catch {
        setRegisteredUsers(null);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!english.trim() || !yorubaAnswer.trim()) return;
    if (!GOOGLE_QUIZ_FORMS_CONFIG.formUrl) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      const formData = new URLSearchParams();
      formData.append(GOOGLE_QUIZ_FORMS_CONFIG.fields.english, english.trim());
      formData.append(GOOGLE_QUIZ_FORMS_CONFIG.fields.yoruba_answer, yorubaAnswer.trim());
      formData.append(GOOGLE_QUIZ_FORMS_CONFIG.fields.category, category);
      formData.append(GOOGLE_QUIZ_FORMS_CONFIG.fields.difficulty, difficulty);
      await fetch(GOOGLE_QUIZ_FORMS_CONFIG.formUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      });
      setRecentEntries(prev => [{ english: english.trim(), yoruba: yorubaAnswer.trim() }, ...prev.slice(0, 9)]);
      setEnglish('');
      setYorubaAnswer('');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className={`max-w-lg w-full rounded-[2rem] p-6 shadow-2xl border-2 max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h2 className="text-xl font-black mb-1 flex items-center gap-3">
          <span className="w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center text-sm">A</span>
          Admin: Quiz Manager
        </h2>
        <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Add new quiz entries (syncs to all users)</p>

        {/* Registered users count */}
        <div className={`mb-6 px-4 py-3 rounded-xl border-2 flex items-center gap-3 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-emerald-50 border-emerald-100'}`}>
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${isDarkMode ? 'bg-emerald-600/20 text-emerald-400' : 'bg-emerald-600 text-white'}`}>
            U
          </span>
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Registered Users</div>
            <div className={`text-lg font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {registeredUsers !== null ? registeredUsers : '...'}
            </div>
          </div>
        </div>

        {/* Google Sheets quick-edit buttons */}
        <div className={`mb-6 flex gap-3`}>
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

        <div className="space-y-4">
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>English</label>
            <input
              value={english}
              onChange={e => setEnglish(e.target.value)}
              placeholder="e.g. Good morning"
              className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-sm font-medium ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-600' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-600'}`}
            />
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Yoruba Answer</label>
            <input
              value={yorubaAnswer}
              onChange={e => setYorubaAnswer(e.target.value)}
              placeholder="e.g. Ẹ ku aaro"
              className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-sm font-medium ${isDarkMode ? 'bg-slate-950 border-amber-800/50 text-white focus:border-emerald-600' : 'bg-white border-amber-200 text-slate-900 focus:border-emerald-600'}`}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none text-xs font-bold ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none text-xs font-bold ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!english.trim() || !yorubaAnswer.trim() || status === 'sending'}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
          >
            {status === 'sending' ? 'Saving...' : status === 'success' ? 'Saved!' : status === 'error' ? 'Error — Try Again' : 'Add Quiz Entry'}
          </button>
        </div>

        {recentEntries.length > 0 && (
          <div className="mt-6">
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

        <button
          onClick={onClose}
          className={`mt-6 w-full py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Close Admin Panel
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
