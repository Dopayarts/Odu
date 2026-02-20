
export interface YorubaCharSet {
  base: string;
  high: string;
  low: string;
  mid?: string;
}

export interface KeyboardState {
  isShift: boolean;
  isCaps: boolean;
  selectedBase: string | null;
}

export enum Tonality {
  HIGH = 'high',
  LOW = 'low',
  MID = 'mid',
  SUBDOT = 'subdot'
}

export type AppMode = 'simple' | 'learn' | 'contribute';

export interface Contribution {
  id: string;
  english: string;
  yoruba: string;
  username: string;
  email?: string;
  location?: string;
  mode: 'freeform' | 'challenge';
  category?: string;
  timestamp: number;
  synced: boolean;
}

export interface ChallengeSentence {
  id: string;
  english: string;
  yoruba_answer?: string;
  category: 'greeting' | 'family' | 'food' | 'market' | 'travel' | 'proverb';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface QuizScore {
  date: string;
  correct: number;
  total: number;
}

export interface QuizHistory {
  scores: QuizScore[];
}

export interface QuizAnswer {
  questionId?: string;
  english: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  phase: 'translate' | 'fillgap';
}

export interface QuizFlag {
  id?: string;
  questionId: string;
  english: string;
  userAnswer: string;       // the answer the user gave (claimed alternate)
  correctAnswer: string;    // the system's current correct answer
  phase: 'translate' | 'fillgap';
  username: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface FillGapData {
  english: string;
  fullYoruba: string;
  gappedWords: { index: number; word: string }[];
  displayWords: (string | null)[];
  options: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
