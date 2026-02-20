import React, { useState } from 'react';
import { useAppMode } from '../context/AppModeContext';

interface AuthScreenProps {
  onRegister: (email: string, username: string, password: string) => Promise<boolean>;
  onLogin: (email: string, password: string) => Promise<boolean>;
  error: string;
  setError: (msg: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onRegister, onLogin, error, setError }) => {
  const { isDarkMode } = useAppMode();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (isRegister && !username.trim()) {
      setError('Please enter a username.');
      return;
    }

    setLoading(true);
    const success = isRegister
      ? await onRegister(email, username, password)
      : await onLogin(email, password);

    if (!success) setLoading(false);
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border-2 outline-none text-sm font-medium transition-colors ${
    isDarkMode
      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-600'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
  }`;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-200'}`}>
      <div className={`w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border-2 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-white bg-slate-50'}`}>
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-lg shadow-emerald-900/40">
            O
          </div>
          <h1 className="text-2xl font-black tracking-tight">ODU Yoruba</h1>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {isRegister ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
              autoComplete="email"
            />
          </div>

          {isRegister && (
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Choose a unique username"
                className={inputClass}
                autoComplete="username"
              />
            </div>
          )}

          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isRegister ? 'At least 6 characters' : 'Enter your password'}
              className={inputClass}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (isRegister ? 'Creating Account...' : 'Signing In...') : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className={`text-xs font-bold transition-colors ${isDarkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`}
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
