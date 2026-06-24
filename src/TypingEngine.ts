import type {
  TestMode,
  Difficulty,
  TestState,
  Letter,
  LetterState,
  Word,
  EngineSnapshot,
  TestResult,
} from './types';
import { calcConsistency } from './StatsManager';

const MAX_EXTRA_CHARS = 20;

export class TypingEngine {
  private mode: TestMode = 'time';
  private difficulty: Difficulty = 'normal';
  private timeLimitSeconds = 30;
  private modeValue = '30';

  private testState: TestState = 'idle';
  private words: Word[] = [];
  private currentWordIndex = 0;
  private currentLetterIndex = 0;

  // Keystroke tracking (not counting backspace)
  private totalKeystrokes = 0;
  private correctKeystrokes = 0;
  // Raw char tracking: every non-backspace keypress including space
  private allTypedChars = 0;

  // Per-character and per-word error tracking
  private charAttempts: Record<string, number> = {};
  private charErrors: Record<string, number> = {};
  private wordErrors: Record<string, number> = {};

  // Timing
  private startTime: number | null = null;
  private endTime: number | null = null;
  private wpmHistory: number[] = [];
  private rawHistory: number[] = [];
  private lastTickSecond = 0;
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  // Callbacks
  onTick?: (snap: EngineSnapshot) => void;
  onComplete?: () => void;

  init(
    textWords: string[],
    mode: TestMode,
    modeValue: string,
    difficulty: Difficulty,
    timeLimitSeconds = 30
  ): void {
    this.clearTick();
    this.mode = mode;
    this.modeValue = modeValue;
    this.difficulty = difficulty;
    this.timeLimitSeconds = timeLimitSeconds;

    this.testState = 'idle';
    this.currentWordIndex = 0;
    this.currentLetterIndex = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.allTypedChars = 0;
    this.charAttempts = {};
    this.charErrors = {};
    this.wordErrors = {};
    this.startTime = null;
    this.endTime = null;
    this.wpmHistory = [];
    this.rawHistory = [];
    this.lastTickSecond = 0;

    this.words = textWords.map((w) => ({
      letters: w.split('').map((c) => ({ char: c, state: 'untouched' as LetterState })),
      isActive: false,
      isComplete: false,
      hasError: false,
      typedCount: 0,
    }));
    if (this.words.length > 0) this.words[0].isActive = true;
  }

  // Returns 'restart' if the caller must reset the test (expert/master violation)
  pressKey(key: string): 'restart' | 'ok' {
    if (this.testState === 'complete') return 'ok';
    if (key === 'Backspace') {
      this.handleBackspace();
      return 'ok';
    }
    if (key === ' ') return this.handleSpace();
    if (key.length === 1) return this.handleChar(key);
    return 'ok';
  }

  getSnapshot(): EngineSnapshot {
    const elapsed = this.elapsedSeconds();
    return {
      state: this.testState,
      words: this.words,
      currentWordIndex: this.currentWordIndex,
      currentLetterIndex: this.currentLetterIndex,
      wpm: this.calcWpm(elapsed),
      rawWpm: this.calcRawWpm(elapsed),
      accuracy: this.calcAccuracy(),
      elapsed,
      remaining: Math.max(0, this.timeLimitSeconds - elapsed),
      wordsComplete: this.currentWordIndex,
    };
  }

  buildResult(): Omit<TestResult, 'id' | 'timestamp' | 'punctuation' | 'numbers'> {
    const elapsed = this.endTime && this.startTime
      ? (this.endTime - this.startTime) / 1000
      : this.elapsedSeconds();

    const { correct, incorrect } = this.countFinalChars();

    return {
      mode: this.mode,
      modeValue: this.modeValue,
      wpm: this.calcWpm(elapsed),
      rawWpm: this.calcRawWpm(elapsed),
      accuracy: this.calcAccuracy(),
      consistency: calcConsistency(this.wpmHistory),
      duration: Math.round(elapsed),
      wordCount: this.currentWordIndex,
      charCount: correct + incorrect,
      correctChars: correct,
      incorrectChars: incorrect,
      wpmHistory: [...this.wpmHistory],
      rawHistory: [...this.rawHistory],
      difficulty: this.difficulty,
      charAttempts: { ...this.charAttempts },
      charErrors: { ...this.charErrors },
      wordErrors: { ...this.wordErrors },
    };
  }

  destroy(): void {
    this.clearTick();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private startTest(): void {
    this.testState = 'running';
    this.startTime = Date.now();
    this.lastTickSecond = 0;
    this.tickHandle = setInterval(() => this.tick(), 100);
  }

  private tick(): void {
    if (!this.startTime || this.testState !== 'running') return;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const sec = Math.floor(elapsed);

    if (sec > this.lastTickSecond) {
      this.wpmHistory.push(this.calcWpm(elapsed));
      this.rawHistory.push(this.calcRawWpm(elapsed));
      this.lastTickSecond = sec;
    }

    if (this.mode === 'time' && elapsed >= this.timeLimitSeconds) {
      this.endTest();
      return;
    }

    this.onTick?.(this.getSnapshot());
  }

  private endTest(): void {
    this.endTime = Date.now();
    this.testState = 'complete';
    this.clearTick();
    this.onTick?.(this.getSnapshot());
    this.onComplete?.();
  }

  private handleChar(char: string): 'restart' | 'ok' {
    if (this.testState === 'idle') this.startTest();
    if (this.testState !== 'running') return 'ok';

    const word = this.words[this.currentWordIndex];
    if (!word) return 'ok';

    this.totalKeystrokes++;
    this.allTypedChars++;

    const originalLen = word.letters.length;
    let typedWithinBounds = false;

    if (this.currentLetterIndex < originalLen) {
      typedWithinBounds = true;
      const expected = word.letters[this.currentLetterIndex].char;
      const correct = char === expected;
      word.letters[this.currentLetterIndex].state = correct ? 'correct' : 'incorrect';
      this.charAttempts[expected] = (this.charAttempts[expected] ?? 0) + 1;
      if (correct) {
        this.correctKeystrokes++;
      } else {
        this.charErrors[expected] = (this.charErrors[expected] ?? 0) + 1;
        word.hasError = true;
        if (this.difficulty === 'master') {
          this.clearTick();
          return 'restart';
        }
      }
      this.currentLetterIndex++;
      word.typedCount++;
    } else {
      // Extra character beyond word boundary
      const extraCount = word.letters.filter((l) => l.state === 'extra').length;
      if (extraCount < MAX_EXTRA_CHARS) {
        word.letters.push({ char, state: 'extra' });
        word.hasError = true;
        word.typedCount++;
        this.currentLetterIndex++;
      }
      if (this.difficulty === 'master') {
        this.clearTick();
        return 'restart';
      }
    }

    // Auto-complete only when the last ORIGINAL letter of the last word was just typed.
    // Extra characters beyond the word do NOT trigger completion.
    if (
      typedWithinBounds &&
      this.mode !== 'time' &&
      this.currentWordIndex === this.words.length - 1 &&
      this.currentLetterIndex >= originalLen
    ) {
      this.finaliseWord(word);
      this.endTest();
    }

    this.onTick?.(this.getSnapshot());
    return 'ok';
  }

  private handleSpace(): 'restart' | 'ok' {
    if (this.testState !== 'running') return 'ok';

    const word = this.words[this.currentWordIndex];
    if (!word || word.typedCount === 0) return 'ok';

    if (this.difficulty === 'expert' && word.hasError) {
      this.clearTick();
      return 'restart';
    }

    // Mark remaining untouched letters as incorrect
    for (let i = this.currentLetterIndex; i < word.letters.length; i++) {
      if (word.letters[i].state === 'untouched') {
        word.letters[i].state = 'incorrect';
        word.hasError = true;
      }
    }

    this.finaliseWord(word);
    this.allTypedChars++; // count the space

    // In time mode the timer is the sole completion condition — never end on space.
    if (this.mode !== 'time' && this.currentWordIndex >= this.words.length - 1) {
      this.endTest();
      return 'ok';
    }

    // Advance only when a next word exists. In time mode the word pool can
    // theoretically run dry (edge case in tests); just leave cursor at end.
    if (this.currentWordIndex + 1 < this.words.length) {
      word.isActive = false;
      this.currentWordIndex++;
      this.currentLetterIndex = 0;
      this.words[this.currentWordIndex].isActive = true;
    }

    this.onTick?.(this.getSnapshot());
    return 'ok';
  }

  private handleBackspace(): void {
    if (this.testState !== 'running') return;

    const word = this.words[this.currentWordIndex];
    if (!word) return;

    if (this.currentLetterIndex > 0) {
      this.currentLetterIndex--;
      const letter = word.letters[this.currentLetterIndex];
      if (letter.state === 'extra') {
        word.letters.splice(this.currentLetterIndex, 1);
      } else {
        letter.state = 'untouched';
      }
      word.typedCount--;
    } else if (this.currentWordIndex > 0) {
      const prevWord = this.words[this.currentWordIndex - 1];
      if (prevWord.hasError) {
        word.isActive = false;
        prevWord.isActive = true;
        prevWord.isComplete = false;
        this.allTypedChars = Math.max(0, this.allTypedChars - 1); // un-count the space
        this.currentWordIndex--;
        this.currentLetterIndex = prevWord.typedCount;
      }
    }

    this.onTick?.(this.getSnapshot());
  }

  private finaliseWord(word: Word): void {
    word.isComplete = true;
    word.isActive = false;
    if (word.hasError) {
      const wordStr = word.letters
        .filter((l) => l.state !== 'extra')
        .map((l) => l.char)
        .join('');
      this.wordErrors[wordStr] = (this.wordErrors[wordStr] ?? 0) + 1;
    }
  }

  private elapsedSeconds(): number {
    if (!this.startTime) return 0;
    const end = this.endTime ?? Date.now();
    return (end - this.startTime) / 1000;
  }

  private calcWpm(elapsed: number): number {
    if (elapsed <= 0) return 0;
    const correct = this.countCorrectChars();
    return Math.round((correct / 5) / (elapsed / 60));
  }

  private calcRawWpm(elapsed: number): number {
    if (elapsed <= 0) return 0;
    return Math.round((this.allTypedChars / 5) / (elapsed / 60));
  }

  private calcAccuracy(): number {
    if (this.totalKeystrokes === 0) return 100;
    return Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100);
  }

  // Correct chars = sum of correct letters in completed words + correct letters in active word + spaces between correct words
  private countCorrectChars(): number {
    let count = 0;
    for (let i = 0; i <= Math.min(this.currentWordIndex, this.words.length - 1); i++) {
      const w = this.words[i];
      const correctInWord = w.letters.filter((l) => l.state === 'correct').length;
      count += correctInWord;
      if (i < this.currentWordIndex && !w.hasError) count++; // space credit for clean word
    }
    return count;
  }

  private countFinalChars(): { correct: number; incorrect: number } {
    let correct = 0;
    let incorrect = 0;
    for (let i = 0; i < this.currentWordIndex; i++) {
      for (const l of this.words[i].letters) {
        if (l.state === 'correct') correct++;
        else if (l.state === 'incorrect' || l.state === 'extra') incorrect++;
      }
    }
    return { correct, incorrect };
  }

  private clearTick(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }
}
