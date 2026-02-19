import React from 'react';
import { useAppMode } from '../context/AppModeContext';

interface TabBarProps {
  activeTab: 'write' | 'practice';
  onTabChange: (tab: 'write' | 'practice') => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const { isDarkMode } = useAppMode();

  return (
    <div className={`flex gap-1 mx-6 mt-4 p-1 rounded-2xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
      {(['write', 'practice'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
            activeTab === tab
              ? 'bg-emerald-600 text-white shadow-lg'
              : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab === 'write' ? 'Write' : 'Practice'}
        </button>
      ))}
    </div>
  );
};

export default TabBar;
