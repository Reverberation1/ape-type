export type TestMode = 'time' | 'words' | 'quote' | 'improve' | 'zen';
export type Difficulty = 'normal' | 'expert' | 'master';
export type QuoteLength = 'short' | 'medium' | 'long' | 'thicc';
export type LetterState = 'untouched' | 'correct' | 'incorrect' | 'extra';
export type TestState = 'idle' | 'running' | 'complete';

export interface Letter {
  char: string;
  state: LetterState;
}

export interface Word {
  letters: Letter[];
  isActive: boolean;
  isComplete: boolean;
  hasError: boolean;
  typedCount: number;
}

export interface TestResult {
  id: string;
  timestamp: number;
  mode: TestMode;
  modeValue: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  duration: number;
  wordCount: number;
  charCount: number;
  correctChars: number;
  incorrectChars: number;
  wpmHistory: number[];
  rawHistory: number[];
  difficulty: Difficulty;
  punctuation: boolean;
  numbers: boolean;
  charAttempts?: Record<string, number>;
  charErrors?: Record<string, number>;
  wordErrors?: Record<string, number>;
}

export interface PersonalBest {
  wpm: number;
  accuracy: number;
  consistency: number;
  timestamp: number;
}

export interface PluginData {
  history: TestResult[];
  personalBests: Record<string, PersonalBest>;
}

export type Theme = 'dark' | 'light' | 'nord' | 'dracula' | 'gruvbox-dark' | 'gruvbox-light';

export interface ApeTypeSettings {
  defaultMode: TestMode;
  defaultTime: number;
  defaultWords: number;
  defaultQuoteLength: QuoteLength;
  punctuation: boolean;
  numbers: boolean;
  difficulty: Difficulty;
  smoothCaret: boolean;
  theme: Theme;
}

export const DEFAULT_SETTINGS: ApeTypeSettings = {
  defaultMode: 'time',
  defaultTime: 30,
  defaultWords: 25,
  defaultQuoteLength: 'medium',
  punctuation: false,
  numbers: false,
  difficulty: 'normal',
  smoothCaret: true,
  theme: 'dark',
};

export interface Quote {
  text: string;
  source: string;
  length: number;
  id: number;
}

export interface EngineSnapshot {
  state: TestState;
  words: Word[];
  currentWordIndex: number;
  currentLetterIndex: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  elapsed: number;
  remaining: number;
  wordsComplete: number;
}
