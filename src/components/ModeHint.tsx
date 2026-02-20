import React, { useState, useEffect } from 'react';
import { useAppMode } from '../context/AppModeContext';

const MODES = [
  { name: 'Simple', description: 'Just type \u2014 your Yoruba keyboard' },
  { name: 'Learn', description: 'Practice daily quizzes to learn Yoruba' },
  { name: 'Contribute', description: 'Help train the ODU AI translator' },
];

const ModeHint: React.FC = () => {
  const { isDarkMode } = useAppMode();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % MODES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const current = MODES[currentIndex];

  return (
    <div className={`w-full flex justify-center mt-3 mb-4`}>
    <div className={`px-6 py-3 rounded-2xl shadow-lg border font-bold text-sm transition-all duration-500 ${
      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-slate-300/40'
    }`}>
      <span className={`text-[9px] font-black uppercase tracking-widest mr-2 ${
        isDarkMode ? 'text-amber-400' : 'text-amber-600'
      }`}>
        {current.name}
      </span>
      {current.description}
    </div>
    </div>
  );
};

export default ModeHint;
