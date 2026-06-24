import { describe, it, expect } from 'vitest';
import { generateWords, generateImprovementWords, wordsFromText } from '../src/WordGenerator';

const WORD_LIST = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog'];

describe('generateWords', () => {
  it('returns the requested count', () => {
    const words = generateWords(WORD_LIST, 10, { punctuation: false, numbers: false });
    expect(words).toHaveLength(10);
  });

  it('each word is a non-empty string', () => {
    const words = generateWords(WORD_LIST, 20, { punctuation: false, numbers: false });
    words.forEach((w) => expect(w.length).toBeGreaterThan(0));
  });

  it('punctuation mode can produce words with trailing punctuation', () => {
    // Run many times to ensure at least one punctuated word appears
    let found = false;
    for (let i = 0; i < 20 && !found; i++) {
      const words = generateWords(WORD_LIST, 50, { punctuation: true, numbers: false });
      found = words.some((w) => /[.,!?;:]$/.test(w));
    }
    expect(found).toBe(true);
  });

  it('numbers mode can produce numeric tokens', () => {
    let found = false;
    for (let i = 0; i < 20 && !found; i++) {
      const words = generateWords(WORD_LIST, 50, { punctuation: false, numbers: true });
      found = words.some((w) => /^\d+$/.test(w));
    }
    expect(found).toBe(true);
  });

  it('no-modifier mode only produces words from the word list (ignoring case)', () => {
    const words = generateWords(WORD_LIST, 20, { punctuation: false, numbers: false });
    words.forEach((w) =>
      expect(WORD_LIST).toContain(w.toLowerCase())
    );
  });
});

describe('generateImprovementWords', () => {
  const LIST = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog'];

  it('returns exactly count words', () => {
    const words = generateImprovementWords(LIST, 20, ['t', 'h'], []);
    expect(words).toHaveLength(20);
  });

  it('falls back to standard generation when no weak data provided', () => {
    const words = generateImprovementWords(LIST, 10, [], []);
    expect(words).toHaveLength(10);
    words.forEach((w) => expect(LIST).toContain(w));
  });

  it('biases toward words containing weak characters', () => {
    // 'the' contains 't' and 'h' (two weak chars, score=7); others score=1
    // Over 200 trials 'the' should appear far more than uniform expectation (1/8 = 12.5%)
    const counts: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const words = generateImprovementWords(LIST, 1, ['t', 'h'], []);
      counts[words[0]] = (counts[words[0]] ?? 0) + 1;
    }
    expect((counts['the'] ?? 0)).toBeGreaterThan(40); // >> 25 (uniform expectation)
  });

  it('boosts weak words that exist in the word list', () => {
    // 'fox' is in LIST and in weakWords — should appear more than 'lazy' (no weak chars)
    const counts: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const words = generateImprovementWords(LIST, 1, [], ['fox']);
      counts[words[0]] = (counts[words[0]] ?? 0) + 1;
    }
    expect((counts['fox'] ?? 0)).toBeGreaterThan((counts['lazy'] ?? 0));
  });

  it('only boosts weakWords that exist in wordList', () => {
    // 'unicorn' is not in LIST — should not appear
    const words = generateImprovementWords(LIST, 50, [], ['unicorn']);
    words.forEach((w) => expect(LIST).toContain(w));
  });
});

describe('wordsFromText', () => {
  it('splits on whitespace', () => {
    const words = wordsFromText('the quick brown fox');
    expect(words).toEqual(['the', 'quick', 'brown', 'fox']);
  });

  it('ignores multiple spaces', () => {
    const words = wordsFromText('a   b');
    expect(words).toEqual(['a', 'b']);
  });

  it('handles newlines and tabs', () => {
    const words = wordsFromText('hello\tworld\nfoo');
    expect(words).toEqual(['hello', 'world', 'foo']);
  });

  it('returns empty array for empty string', () => {
    expect(wordsFromText('')).toEqual([]);
  });

  it('trims leading/trailing space', () => {
    expect(wordsFromText('  hi  ')).toEqual(['hi']);
  });
});
