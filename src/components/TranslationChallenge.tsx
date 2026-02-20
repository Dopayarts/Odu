import React, { useState, useRef, useCallback, useEffect } from 'react';
import Keyboard from './Keyboard';
import { YORUBA_VOWELS } from '../constants';
import { useAppMode } from '../context/AppModeContext';
import { useQuizData } from '../hooks/useQuizData';
import { useQuiz } from '../hooks/useQuiz';
import { QuizAnswer } from '../../types';

// ─── Hearts display ──────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const HeartsRow: React.FC<{
  hearts: number;
  maxHearts: number;
  isDarkMode: boolean;
}> = ({ hearts, maxHearts, isDarkMode }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: maxHearts }).map((_, i) => (
      <span
        key={i}
        className={`text-xl transition-all ${
          i < hearts
            ? 'text-red-500 drop-shadow-sm'
            : isDarkMode ? 'text-slate-700' : 'text-slate-300'
        }`}
      >
        ♥
      </span>
    ))}
  </div>
);

// ─── No-hearts screen ─────────────────────────────────────────────────────────

const NoHeartsScreen: React.FC<{
  msUntilRefill: number | null;
  contribProgress: number;
  contributionsNeeded: number;
  isDarkMode: boolean;
  onContribute: () => void;
}> = ({ msUntilRefill, contribProgress, contributionsNeeded, isDarkMode, onContribute }) => {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-8">
      <div className={`rounded-2xl p-6 sm:p-8 border-2 text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-red-50 border-red-200'}`}>
        <div className="flex justify-center gap-1 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`text-3xl ${isDarkMode ? 'text-slate-700' : 'text-red-200'}`}>♥</span>
          ))}
        </div>
        <h2 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          No Hearts Left
        </h2>
        <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          You've used all your hearts. Recharge by waiting or contributing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Wait option */}
          <div className={`rounded-2xl p-4 border-2 text-left ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Wait
            </p>
            <p className={`text-2xl font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              ♥ +1
            </p>
            {msUntilRefill !== null ? (
              <p className={`text-xs font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                Ready in {formatTime(msUntilRefill)}
              </p>
            ) : (
              <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Refilling soon…</p>
            )}
          </div>

          {/* Contribute option */}
          <button
            onClick={onContribute}
            className={`rounded-2xl p-4 border-2 text-left transition-all hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-emerald-900/30 border-emerald-700 hover:border-emerald-500' : 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'}`}
          >
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Contribute Now
            </p>
            <p className={`text-2xl font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              ♥ +1
            </p>
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mb-1">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(contribProgress / contributionsNeeded) * 100}%` }}
              />
            </div>
            <p className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {contribProgress}/{contributionsNeeded} sentences submitted
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Word highlighting ────────────────────────────────────────────────────────

const WordHighlight: React.FC<{ userText: string; correctAnswer: string; isDarkMode: boolean }> = ({
  userText, correctAnswer, isDarkMode,
}) => {
  const correctWords = correctAnswer.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/g, '').split(' ');
  const userWords = userText.toLowerCase().trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);

  if (!userText.trim()) return null;

  return (
    <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
      {userWords.map((word, i) => {
        const isMatch = i < correctWords.length && word === correctWords[i];
        return (
          <span
            key={i}
            className={`px-1.5 py-0.5 rounded text-sm font-semibold transition-colors ${
              isMatch
                ? 'text-amber-500 bg-amber-100/20'
                : isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ─── Countdown timer ──────────────────────────────────────────────────────────

const CountdownTimer: React.FC<{ timeLeft: number; isDarkMode: boolean }> = ({ timeLeft, isDarkMode }) => {
  const isUrgent = timeLeft <= 5;
  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-black text-sm transition-all ${
      isUrgent
        ? 'border-red-500 text-red-500 animate-pulse'
        : isDarkMode
          ? 'border-slate-600 text-slate-300'
          : 'border-slate-300 text-slate-600'
    }`}>
      {timeLeft}
    </div>
  );
};

// ─── Fill-gap UI ──────────────────────────────────────────────────────────────

const FillGapChallenge: React.FC<{
  fillGap: NonNullable<ReturnType<typeof useQuiz>['currentFillGap']>;
  answered: boolean;
  onSubmit: (filledWords: string[]) => void;
  isDarkMode: boolean;
}> = ({ fillGap, answered, onSubmit, isDarkMode }) => {
  const [filledGaps, setFilledGaps] = useState<(string | null)[]>(
    new Array(fillGap.gappedWords.length).fill(null)
  );
  const [usedOptions, setUsedOptions] = useState<Set<number>>(new Set());

  useEffect(() => {
    setFilledGaps(new Array(fillGap.gappedWords.length).fill(null));
    setUsedOptions(new Set());
  }, [fillGap]);

  const handleOptionClick = (word: string, optionIdx: number) => {
    if (answered || usedOptions.has(optionIdx)) return;
    const nextEmptyGap = filledGaps.findIndex(g => g === null);
    if (nextEmptyGap === -1) return;

    const newFilled = [...filledGaps];
    newFilled[nextEmptyGap] = word;
    setFilledGaps(newFilled);
    setUsedOptions(prev => new Set([...prev, optionIdx]));

    if (newFilled.every(g => g !== null)) {
      onSubmit(newFilled.filter((w): w is string => w !== null));
    }
  };

  const handleGapClick = (gapIdx: number) => {
    if (answered || filledGaps[gapIdx] === null) return;
    const removedWord = filledGaps[gapIdx];
    const newFilled = [...filledGaps];
    newFilled[gapIdx] = null;
    setFilledGaps(newFilled);

    const optIdx = fillGap.options.findIndex((w, i) => w === removedWord && usedOptions.has(i));
    if (optIdx !== -1) {
      setUsedOptions(prev => {
        const next = new Set(prev);
        next.delete(optIdx);
        return next;
      });
    }
  };

  let gapCounter = 0;
  const sentenceDisplay = fillGap.displayWords.map((word, i) => {
    if (word !== null) {
      return (
        <span key={i} className={`mx-0.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {word}
        </span>
      );
    }
    const gapIdx = gapCounter++;
    const filled = filledGaps[gapIdx];
    return (
      <button
        key={i}
        onClick={() => handleGapClick(gapIdx)}
        disabled={answered}
        className={`inline-block mx-1 px-3 py-1 rounded-lg border-2 border-dashed min-w-[60px] text-center font-semibold transition-all ${
          filled
            ? isDarkMode
              ? 'border-amber-500 bg-amber-900/30 text-amber-300'
              : 'border-amber-500 bg-amber-50 text-amber-700'
            : isDarkMode
              ? 'border-slate-600 bg-slate-800 text-slate-500'
              : 'border-slate-300 bg-slate-50 text-slate-400'
        }`}
      >
        {filled || '____'}
      </button>
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-2xl p-6 border-2 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          English Meaning
        </p>
        <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          {fillGap.english}
        </p>
        <span className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
          fillGap.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
          fillGap.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {fillGap.difficulty} ({fillGap.gappedWords.length} {fillGap.gappedWords.length === 1 ? 'gap' : 'gaps'})
        </span>
      </div>

      <div className={`rounded-2xl p-6 border-2 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
          Fill in the gaps
        </p>
        <div className="flex flex-wrap items-center text-lg leading-loose">
          {sentenceDisplay}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {fillGap.options.map((word, i) => (
          <button
            key={i}
            onClick={() => handleOptionClick(word, i)}
            disabled={answered || usedOptions.has(i)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              usedOptions.has(i)
                ? isDarkMode
                  ? 'bg-slate-800 text-slate-600 opacity-40'
                  : 'bg-slate-100 text-slate-300 opacity-40'
                : isDarkMode
                  ? 'bg-slate-700 text-white hover:bg-slate-600 active:scale-95'
                  : 'bg-white border-2 border-slate-200 text-slate-800 hover:border-amber-400 active:scale-95'
            }`}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Answer review ────────────────────────────────────────────────────────────

const AnswerReview: React.FC<{
  answers: QuizAnswer[];
  correct: number;
  total: number;
  isDarkMode: boolean;
  onContribute: () => void;
}> = ({ answers, correct, total, isDarkMode, onContribute }) => {
  const percentage = Math.round((correct / total) * 100);
  const emoji = percentage === 100 ? '\u{1F3C6}' : percentage >= 60 ? '\u{1F389}' : '\u{1F4AA}';

  const translateAnswers = answers.filter(a => a.phase === 'translate');
  const fillgapAnswers = answers.filter(a => a.phase === 'fillgap');

  const renderSection = (title: string, items: QuizAnswer[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {title}
        </h4>
        <div className="space-y-2">
          {items.map((a, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 border ${
                a.isCorrect
                  ? isDarkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
                  : isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {a.english}
                  </p>
                  {!a.isCorrect && (
                    <>
                      <p className="text-xs text-red-500">
                        Your answer: <span className="font-semibold">{a.userAnswer}</span>
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Correct: <span className="font-semibold">{a.correctAnswer}</span>
                      </p>
                    </>
                  )}
                  {a.isCorrect && (
                    <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      <span className="font-semibold">{a.correctAnswer}</span>
                    </p>
                  )}
                </div>
                <span className={`text-lg flex-shrink-0 ${a.isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                  {a.isCorrect ? '\u2713' : '\u2717'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-8">
      <div className={`rounded-2xl p-6 sm:p-8 border-2 text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="text-5xl mb-4">{emoji}</div>
        <p className={`text-3xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          {correct}/{total}
        </p>
        <p className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
          {percentage === 100 ? 'Perfect Score!' : percentage >= 80 ? 'Great Job!' : percentage >= 60 ? 'Good Effort!' : 'Keep Practicing!'}
        </p>
      </div>

      <div className={`rounded-2xl p-4 border-2 max-h-80 overflow-y-auto ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Answer Review
        </h3>
        {renderSection('Translation', translateAnswers)}
        {renderSection('Fill the Gap', fillgapAnswers)}
      </div>

      <p className={`text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Come back tomorrow for new questions — or contribute sentences to earn more hearts ♥
      </p>
      <button
        onClick={onContribute}
        className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all self-center"
      >
        Switch to Contribute Mode
      </button>
      <ScoreHistory history={[]} isDarkMode={isDarkMode} />
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface TranslationChallengeProps {
  hearts: number;
  maxHearts: number;
  msUntilRefill: number | null;
  contribProgress: number;
  contributionsNeeded: number;
  onUseHeart: () => void;
}

const TranslationChallenge: React.FC<TranslationChallengeProps> = ({
  hearts,
  maxHearts,
  msUntilRefill,
  contribProgress,
  contributionsNeeded,
  onUseHeart,
}) => {
  const { isDarkMode, setMode } = useAppMode();
  const { questions } = useQuizData();
  const quiz = useQuiz(questions);

  const [yorubaText, setYorubaText] = useState('');
  const [isShiftToggled, setIsShiftToggled] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [toneModeActive, setToneModeActive] = useState(false);
  const lastShiftPressRef = useRef<number>(0);
  const [activeVowel, setActiveVowel] = useState<string | null>(null);
  const [diacriticIndex, setDiacriticIndex] = useState(0);
  const heartUsedRef = useRef(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const effectiveShift = isShiftToggled || isShiftPressed;

  const handleInput = useCallback((char: string) => {
    const start = editorRef.current?.selectionStart || 0;
    const end = editorRef.current?.selectionEnd || 0;
    const newText = yorubaText.substring(0, start) + char + yorubaText.substring(end);
    setYorubaText(newText);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = start + char.length;
        editorRef.current.focus();
      }
    }, 0);
  }, [yorubaText]);

  const handleBackspace = useCallback(() => {
    const start = editorRef.current?.selectionStart || 0;
    const end = editorRef.current?.selectionEnd || 0;
    if (start === 0 && end === 0) return;
    let newText: string;
    let newPos: number;
    if (start !== end) {
      newText = yorubaText.substring(0, start) + yorubaText.substring(end);
      newPos = start;
    } else {
      newText = yorubaText.substring(0, start - 1) + yorubaText.substring(end);
      newPos = start - 1;
    }
    setYorubaText(newText);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = newPos;
        editorRef.current.focus();
      }
    }, 0);
  }, [yorubaText]);

  const handleSpace = useCallback(() => handleInput(' '), [handleInput]);

  const confirmDiacritic = useCallback((vowel: string, index: number) => {
    const data = YORUBA_VOWELS[vowel];
    if (!data) return;
    let char = '';
    if (index === 0) char = data.low;
    else if (index === 1) char = data.base;
    else char = data.high;
    const output = effectiveShift ? char.toUpperCase() : char.toLowerCase();
    handleInput(output);
    setActiveVowel(null);
    setDiacriticIndex(0);
    setToneModeActive(false);
  }, [effectiveShift, handleInput]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        const now = Date.now();
        const diff = now - lastShiftPressRef.current;
        if (diff > 20 && diff < 350) setToneModeActive(prev => !prev);
        lastShiftPressRef.current = now;
        setIsShiftPressed(true);
      }
      if (activeVowel) {
        if (e.key === 'ArrowRight') { e.preventDefault(); setDiacriticIndex(prev => (prev + 1) % 3); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setDiacriticIndex(prev => (prev - 1 + 3) % 3); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmDiacritic(activeVowel, diacriticIndex); return; }
        if (e.key === 'Escape') { e.preventDefault(); setActiveVowel(null); setToneModeActive(false); return; }
        if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); confirmDiacritic(activeVowel, parseInt(e.key) - 1); return; }
      }
      if (document.activeElement === editorRef.current || !activeVowel) {
        const key = e.key.toLowerCase();
        if (YORUBA_VOWELS[key] && toneModeActive) {
          e.preventDefault();
          setActiveVowel(key);
          setDiacriticIndex(0);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [activeVowel, diacriticIndex, confirmDiacritic, toneModeActive]);

  const handleStartQuiz = useCallback(() => {
    if (!heartUsedRef.current) {
      onUseHeart();
      heartUsedRef.current = true;
    }
    quiz.startQuiz();
  }, [quiz, onUseHeart]);

  // Reset heart usage flag when quiz resets
  useEffect(() => {
    if (!quiz.started) heartUsedRef.current = false;
  }, [quiz.started]);

  const handleSubmit = () => {
    if (!yorubaText.trim()) return;
    quiz.checkAnswer(yorubaText.trim());
  };

  const handleNext = () => {
    setYorubaText('');
    quiz.nextQuestion();
  };

  // ── No hearts — show recharge screen ────────────────────────────────────────
  if (hearts <= 0 && !quiz.started) {
    return (
      <NoHeartsScreen
        msUntilRefill={msUntilRefill}
        contribProgress={contribProgress}
        contributionsNeeded={contributionsNeeded}
        isDarkMode={isDarkMode}
        onContribute={() => setMode('contribute')}
      />
    );
  }

  // ── Daily limit reached ──────────────────────────────────────────────────────
  if (quiz.isDailyDone && !quiz.isComplete) {
    const todayScore = quiz.history.find(s => s.date === new Date().toISOString().slice(0, 10));
    return (
      <div className="flex flex-col gap-4 px-4 sm:px-6 py-8">
        <div className={`rounded-2xl p-6 sm:p-8 border-2 text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
          <div className="text-4xl mb-4">{'\u{1F3AF}'}</div>
          {todayScore && (
            <p className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Today's Score: {todayScore.correct}/{todayScore.total}
            </p>
          )}
          <p className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
            You've completed today's quiz!
          </p>
          <HeartsRow hearts={hearts} maxHearts={maxHearts} isDarkMode={isDarkMode} />
          <p className={`text-sm mt-3 mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Come back tomorrow for new questions — or contribute sentences to earn more hearts ♥
          </p>
          <button
            onClick={() => setMode('contribute')}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all"
          >
            Switch to Contribute Mode
          </button>
        </div>
        <ScoreHistory history={quiz.history} isDarkMode={isDarkMode} />
      </div>
    );
  }

  // ── Quiz complete ────────────────────────────────────────────────────────────
  if (quiz.isComplete) {
    return (
      <AnswerReview
        answers={quiz.answers}
        correct={quiz.correct}
        total={quiz.totalQuestions}
        isDarkMode={isDarkMode}
        onContribute={() => setMode('contribute')}
      />
    );
  }

  // ── Start screen ─────────────────────────────────────────────────────────────
  if (!quiz.started && quiz.currentQuestion) {
    return (
      <div className="flex flex-col gap-4 px-4 sm:px-6 py-8">
        <div className={`rounded-2xl p-6 sm:p-8 border-2 text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
          <div className="text-5xl mb-4">{'\u{1F4DA}'}</div>
          <h2 className={`text-2xl font-black mb-3 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Daily Yoruba Quiz
          </h2>

          {/* Hearts display */}
          <div className="flex flex-col items-center gap-1 mb-4">
            <HeartsRow hearts={hearts} maxHearts={maxHearts} isDarkMode={isDarkMode} />
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {hearts} {hearts === 1 ? 'heart' : 'hearts'} remaining — 1 used per round
            </p>
          </div>

          <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {quiz.totalQuestions} questions in two phases:
          </p>
          <div className={`flex flex-col gap-2 text-left max-w-xs mx-auto mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <div className={`px-4 py-3 rounded-xl text-xs font-medium ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <span className={`font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Phase 1:</span> Translate English to Yoruba
            </div>
            <div className={`px-4 py-3 rounded-xl text-xs font-medium ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <span className={`font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Phase 2:</span> Fill in the missing Yoruba words
            </div>
          </div>
          <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Timer varies by difficulty: Beginner 20s · Intermediate 40s · Advanced 60s
          </p>
          <button
            onClick={handleStartQuiz}
            className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm tracking-wider shadow-xl shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all"
          >
            Start Lesson
          </button>
        </div>
        <ScoreHistory history={quiz.history} isDarkMode={isDarkMode} />
      </div>
    );
  }

  // ── No questions available ───────────────────────────────────────────────────
  if (!quiz.currentQuestion) {
    return (
      <div className="px-4 sm:px-6 py-8">
        <div className={`rounded-2xl p-6 text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
          <p className="text-sm text-slate-500">No quiz questions available yet.</p>
        </div>
      </div>
    );
  }

  // ── Progress bar header (shared) ─────────────────────────────────────────────
  const progressHeader = (
    <div className="px-4 sm:px-6 pt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Q {quiz.questionIndex + 1}/{quiz.totalQuestions}
          </span>
          <HeartsRow hearts={hearts} maxHearts={maxHearts} isDarkMode={isDarkMode} />
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Score: {quiz.correct}/{quiz.questionIndex + (quiz.answered ? 1 : 0)}
          </span>
          {!quiz.answered && <CountdownTimer timeLeft={quiz.timeLeft} isDarkMode={isDarkMode} />}
        </div>
      </div>
      <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${((quiz.questionIndex + (quiz.answered ? 1 : 0)) / quiz.totalQuestions) * 100}%` }}
        />
      </div>
    </div>
  );

  // ── Fill-the-gap phase ────────────────────────────────────────────────────────
  if (quiz.phase === 'fillgap' && quiz.currentFillGap) {
    return (
      <div className="flex flex-col gap-4">
        {progressHeader}
        <div className="px-4 sm:px-6">
          <p className={`text-[9px] font-bold uppercase tracking-widest mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            Phase 2: Fill the Gap
          </p>
          <FillGapChallenge
            fillGap={quiz.currentFillGap}
            answered={quiz.answered}
            onSubmit={(words) => quiz.checkFillGapAnswer(words)}
            isDarkMode={isDarkMode}
          />
        </div>

        {quiz.lastResult && (
          <div className="px-4 sm:px-6">
            <div className={`rounded-2xl p-4 border-2 ${
              quiz.lastResult.isCorrect
                ? isDarkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
                : isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'
            }`}>
              <p className={`text-sm font-black ${quiz.lastResult.isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                {quiz.lastResult.isCorrect ? '\u2713 Correct!' : '\u2717 Wrong!'}
              </p>
              {!quiz.lastResult.isCorrect && (
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  The answer was: <strong>{quiz.lastResult.correctAnswer}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {quiz.answered && (
          <div className="px-4 sm:px-6">
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {quiz.questionIndex + 1 >= quiz.totalQuestions ? 'See Results' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Translation phase ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {progressHeader}
      <div className="px-4 sm:px-6">
        <p className={`text-[9px] font-bold uppercase tracking-widest mb-3 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
          Phase 1: Translation
        </p>
        <div className={`rounded-2xl p-6 border-2 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
            Translate to Yoruba
          </p>
          <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            {quiz.currentQuestion.english}
          </p>
          <span className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
            quiz.currentQuestion.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
            quiz.currentQuestion.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {quiz.currentQuestion.difficulty}
          </span>
        </div>
      </div>

      {quiz.lastResult && (
        <div className="px-4 sm:px-6">
          <div className={`rounded-2xl p-4 border-2 ${
            quiz.lastResult.isCorrect
              ? isDarkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
              : isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'
          }`}>
            <p className={`text-sm font-black ${quiz.lastResult.isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
              {quiz.lastResult.isCorrect ? '\u2713 Correct!' : '\u2717 Wrong!'}
            </p>
            {!quiz.lastResult.isCorrect && (
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                The answer was: <strong>{quiz.lastResult.correctAnswer}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {!quiz.answered && quiz.currentQuestion.yoruba_answer && yorubaText.trim() && (
        <div className="px-4 sm:px-6">
          <WordHighlight
            userText={yorubaText}
            correctAnswer={quiz.currentQuestion.yoruba_answer}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      <div className="px-4 sm:px-6">
        <textarea
          ref={editorRef}
          value={yorubaText}
          onChange={e => setYorubaText(e.target.value)}
          placeholder="Type your Yoruba translation here..."
          disabled={quiz.answered}
          className={`w-full h-28 sm:h-32 p-4 sm:p-6 text-xl font-medium leading-relaxed rounded-2xl border-2 outline-none transition-all resize-none ${
            quiz.answered
              ? isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
              : toneModeActive
                ? 'border-emerald-500 bg-emerald-50/5 ring-4 ring-emerald-500/5'
                : isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-600' : 'bg-white border-slate-100 text-slate-900 focus:border-emerald-600'
          }`}
        />
        <div className="flex gap-2 mt-2">
          {quiz.answered ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {quiz.questionIndex + 1 >= quiz.totalQuestions ? 'See Results' : 'Next Question'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!yorubaText.trim()}
              className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-lg disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
            >
              Submit Answer
            </button>
          )}
        </div>
      </div>

      <div className={`p-4 sm:p-6 border-t transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
        <Keyboard
          onInput={handleInput}
          onBackspace={handleBackspace}
          onSpace={handleSpace}
          isShiftToggled={isShiftToggled}
          setIsShiftToggled={setIsShiftToggled}
          isShiftPressed={isShiftPressed}
          toneModeActive={toneModeActive}
          setToneModeActive={setToneModeActive}
          activeVowel={activeVowel}
          setActiveVowel={setActiveVowel}
          diacriticIndex={diacriticIndex}
          onDiacriticSelect={confirmDiacritic}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
};

// ─── Score history ────────────────────────────────────────────────────────────

const ScoreHistory: React.FC<{ history: { date: string; correct: number; total: number }[]; isDarkMode: boolean }> = ({ history, isDarkMode }) => {
  const recent = history.slice(-7).reverse();
  if (recent.length === 0) return null;

  return (
    <div className={`rounded-2xl p-4 border-2 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
      <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Recent Scores
      </h3>
      <div className="space-y-2">
        {recent.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-20 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(s.correct / s.total) * 100}%` }} />
              </div>
              <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{s.correct}/{s.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranslationChallenge;
