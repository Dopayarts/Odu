import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ChallengeSentence, QuizScore, QuizAnswer, FillGapData } from '../../types';
import { playCorrectSound, playWrongSound } from '../utils/sounds';

const HISTORY_KEY = 'odu-quiz-history';
const QUESTIONS_PER_PHASE = 5;
const TOTAL_QUESTIONS = 10;
function getTimerSeconds(difficulty?: 'beginner' | 'intermediate' | 'advanced'): number {
  switch (difficulty) {
    case 'intermediate': return 40;
    case 'advanced': return 60;
    default: return 20;
  }
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/g, '');
}

function loadHistory(): QuizScore[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(scores: QuizScore[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(scores));
}

function pickByDifficulty(questions: ChallengeSentence[], seed: string): ChallengeSentence[] {
  const beginners = seededShuffle(questions.filter(q => q.difficulty === 'beginner'), seed + '-b');
  const intermediates = seededShuffle(questions.filter(q => q.difficulty === 'intermediate'), seed + '-i');
  const advanced = seededShuffle(questions.filter(q => q.difficulty === 'advanced'), seed + '-a');

  const picked: ChallengeSentence[] = [];
  picked.push(...beginners.slice(0, 2));
  picked.push(...intermediates.slice(0, 2));
  picked.push(...advanced.slice(0, 1));

  // If not enough in a category, fill from others
  if (picked.length < QUESTIONS_PER_PHASE) {
    const usedIds = new Set(picked.map(q => q.id));
    const remaining = seededShuffle(questions.filter(q => !usedIds.has(q.id)), seed + '-r');
    picked.push(...remaining.slice(0, QUESTIONS_PER_PHASE - picked.length));
  }

  return picked.slice(0, QUESTIONS_PER_PHASE);
}

function generateFillGapData(
  question: ChallengeSentence,
  allQuestions: ChallengeSentence[],
  seed: string
): FillGapData {
  const yoruba = question.yoruba_answer || '';
  const words = yoruba.split(/\s+/).filter(Boolean);

  const gapCount = question.difficulty === 'beginner' ? 1
    : question.difficulty === 'intermediate' ? 2 : 3;

  // Pick random word indices to blank out
  const indices = seededShuffle(
    words.map((_, i) => i),
    seed + question.id
  ).slice(0, Math.min(gapCount, words.length));
  indices.sort((a, b) => a - b);

  const gappedWords = indices.map(i => ({ index: i, word: words[i] }));

  const displayWords = words.map((w, i) => indices.includes(i) ? null : w);

  // Generate distractors from other sentences
  const otherWords = allQuestions
    .filter(q => q.id !== question.id && q.yoruba_answer)
    .flatMap(q => (q.yoruba_answer || '').split(/\s+/).filter(Boolean));
  const uniqueOther = [...new Set(otherWords)];
  const correctWords = gappedWords.map(g => g.word);
  const distractors = seededShuffle(
    uniqueOther.filter(w => !correctWords.includes(w)),
    seed + question.id + '-d'
  ).slice(0, Math.max(3, gapCount + 1));

  const options = seededShuffle([...correctWords, ...distractors], seed + question.id + '-o');

  return {
    english: question.english,
    fullYoruba: yoruba,
    gappedWords,
    displayWords,
    options,
    difficulty: question.difficulty,
  };
}

export function useQuiz(questions: ChallengeSentence[]) {
  const today = getTodayKey();
  const [history, setHistory] = useState<QuizScore[]>(loadHistory);

  const isDailyDone = useMemo(() => history.some(s => s.date === today), [history, today]);

  // Pick questions: 5 for translate, 5 for fill-gap (different sets)
  const { translateQuestions, fillgapQuestions, fillGapDataList } = useMemo(() => {
    if (questions.length === 0) return { translateQuestions: [], fillgapQuestions: [], fillGapDataList: [] };

    const set1 = pickByDifficulty(questions, today + '-translate');
    const usedIds = new Set(set1.map(q => q.id));
    const remaining = questions.filter(q => !usedIds.has(q.id));
    const set2 = remaining.length >= QUESTIONS_PER_PHASE
      ? pickByDifficulty(remaining, today + '-fillgap')
      : pickByDifficulty(questions, today + '-fillgap-fallback');

    const fgData = set2.map((q, i) => generateFillGapData(q, questions, today + '-fg-' + i));

    return { translateQuestions: set1, fillgapQuestions: set2, fillGapDataList: fgData };
  }, [questions, today]);

  const dailyQuestions = useMemo(() => [...translateQuestions, ...fillgapQuestions], [translateQuestions, fillgapQuestions]);

  const [started, setStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; correctAnswer: string } | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [timerDuration, setTimerDuration] = useState(20);
  const [timeLeft, setTimeLeft] = useState(20);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase: 'translate' | 'fillgap' = questionIndex < QUESTIONS_PER_PHASE ? 'translate' : 'fillgap';
  const currentQuestion = dailyQuestions[questionIndex] || null;
  const currentFillGap = phase === 'fillgap' ? fillGapDataList[questionIndex - QUESTIONS_PER_PHASE] || null : null;
  const totalQuestions = TOTAL_QUESTIONS;

  // Timer logic
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    const duration = getTimerSeconds(currentQuestion?.difficulty);
    setTimerDuration(duration);
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer, currentQuestion?.difficulty]);

  // Start timer on new question (only after user has started)
  useEffect(() => {
    if (started && !answered && currentQuestion && !isComplete && !isDailyDone) {
      startTimer();
    }
    return () => stopTimer();
  }, [started, questionIndex, answered, currentQuestion, isComplete, isDailyDone, startTimer, stopTimer]);

  const startQuiz = useCallback(() => {
    setStarted(true);
  }, []);

  // Handle timeout
  const timeoutHandledRef = useRef(false);
  useEffect(() => {
    if (timeLeft === 0 && !answered && !timeoutHandledRef.current) {
      timeoutHandledRef.current = true;
      stopTimer();
      // Auto-submit as wrong
      if (currentQuestion?.yoruba_answer) {
        playWrongSound();
        const correctAnswer = currentQuestion.yoruba_answer;
        setLastResult({ isCorrect: false, correctAnswer });
        setAnswered(true);
        setAnswers(prev => [...prev, {
          english: currentQuestion.english,
          userAnswer: '(time ran out)',
          correctAnswer,
          isCorrect: false,
          phase,
        }]);
      }
    }
  }, [timeLeft, answered, currentQuestion, phase, stopTimer]);

  // Reset timeout flag when question changes
  useEffect(() => {
    timeoutHandledRef.current = false;
  }, [questionIndex]);

  const checkAnswer = useCallback((userAnswer: string): boolean => {
    if (!currentQuestion?.yoruba_answer) return false;
    stopTimer();
    const isCorrect = normalize(userAnswer) === normalize(currentQuestion.yoruba_answer);
    if (isCorrect) {
      setCorrect(prev => prev + 1);
      playCorrectSound();
    } else {
      playWrongSound();
    }
    setLastResult({ isCorrect, correctAnswer: currentQuestion.yoruba_answer });
    setAnswered(true);
    setAnswers(prev => [...prev, {
      english: currentQuestion.english,
      userAnswer,
      correctAnswer: currentQuestion.yoruba_answer!,
      isCorrect,
      phase,
    }]);
    return isCorrect;
  }, [currentQuestion, phase, stopTimer]);

  const checkFillGapAnswer = useCallback((filledWords: string[]): boolean => {
    if (!currentFillGap || !currentQuestion?.yoruba_answer) return false;
    stopTimer();
    const correctWords = currentFillGap.gappedWords.map(g => g.word);
    const isCorrect = filledWords.length === correctWords.length &&
      filledWords.every((w, i) => normalize(w) === normalize(correctWords[i]));

    if (isCorrect) {
      setCorrect(prev => prev + 1);
      playCorrectSound();
    } else {
      playWrongSound();
    }

    const userAnswer = filledWords.join(', ') || '(no answer)';
    const correctAnswer = currentQuestion.yoruba_answer;
    setLastResult({ isCorrect, correctAnswer });
    setAnswered(true);
    setAnswers(prev => [...prev, {
      english: currentQuestion.english,
      userAnswer,
      correctAnswer,
      isCorrect,
      phase: 'fillgap',
    }]);
    return isCorrect;
  }, [currentFillGap, currentQuestion, stopTimer]);

  const nextQuestion = useCallback(() => {
    const nextIdx = questionIndex + 1;
    if (nextIdx >= totalQuestions || nextIdx >= dailyQuestions.length) {
      const score: QuizScore = { date: today, correct, total: Math.min(totalQuestions, dailyQuestions.length) };
      const updated = [...history, score];
      setHistory(updated);
      saveHistory(updated);
      setIsComplete(true);
      stopTimer();
    } else {
      setQuestionIndex(nextIdx);
      setAnswered(false);
      setLastResult(null);
    }
  }, [questionIndex, totalQuestions, dailyQuestions.length, today, correct, history, stopTimer]);

  const resetForNewDay = useCallback(() => {
    setStarted(false);
    setQuestionIndex(0);
    setCorrect(0);
    setAnswered(false);
    setLastResult(null);
    setIsComplete(false);
    setAnswers([]);
    setTimerDuration(20);
    setTimeLeft(20);
  }, []);

  return {
    started,
    startQuiz,
    currentQuestion,
    questionIndex,
    totalQuestions: Math.min(totalQuestions, dailyQuestions.length),
    correct,
    answered,
    lastResult,
    isComplete,
    isDailyDone,
    history,
    answers,
    timeLeft,
    timerDuration,
    phase,
    currentFillGap,
    checkAnswer,
    checkFillGapAnswer,
    nextQuestion,
    resetForNewDay,
  };
}
