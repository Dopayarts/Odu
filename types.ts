
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
  mode: 'freeform' | 'challenge';
  category?: string;
  timestamp: number;
  synced: boolean;
}

export interface ChallengeSentence {
  id: string;
  english: string;
  category: 'greeting' | 'family' | 'food' | 'market' | 'travel' | 'proverb';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
