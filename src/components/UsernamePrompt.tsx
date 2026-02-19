import React, { useState } from 'react';
import { useAppMode } from '../context/AppModeContext';

interface UsernamePromptProps {
  onClose: () => void;
}

const UsernamePrompt: React.FC<UsernamePromptProps> = ({ onClose }) => {
  const { savedUsernames, addUsername, isDarkMode } = useAppMode();
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim()) {
      addUsername(input.trim());
      onClose();
    }
  };

  const handleSelect = (name: string) => {
    addUsername(name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl border-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h2 className="text-xl font-black mb-2 flex items-center gap-3">
          <span className="w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center text-lg">+</span>
          Enter Your Name
        </h2>
        <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Your name will appear in the credits for the Untangler exhibition. All contributions help train the ODU AI translator.
        </p>

        {savedUsernames.length > 0 && (
          <div className="mb-4">
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Previous users</p>
            <div className="flex flex-wrap gap-2">
              {savedUsernames.map(name => (
                <button
                  key={name}
                  onClick={() => handleSelect(name)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Your name or nickname..."
            className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium outline-none transition-all ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
            }`}
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-900/30"
          >
            Go
          </button>
        </div>

        <button
          onClick={onClose}
          className={`mt-4 w-full py-2 rounded-xl text-xs font-bold ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default UsernamePrompt;
