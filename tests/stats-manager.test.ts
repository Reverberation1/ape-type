import { describe, it, expect, beforeEach } from 'vitest';
import { StatsManager, emptyPluginData, calcConsistency } from '../src/StatsManager';
import type { TestResult } from '../src/types';

function makeResult(wpm: number, mode = 'time', modeValue = '30'): TestResult {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    mode: mode as 'time',
    modeValue,
    wpm,
    rawWpm: wpm + 5,
    accuracy: 95,
    consistency: 80,
    duration: 30,
    wordCount: 60,
    charCount: 280,
    correctChars: 270,
    incorrectChars: 10,
    wpmHistory: [wpm],
    rawHistory: [wpm + 5],
    difficulty: 'normal',
    punctuation: false,
    numbers: false,
  };
}

describe('StatsManager', () => {
  let sm: StatsManager;

  beforeEach(() => {
    sm = new StatsManager(emptyPluginData());
  });

  it('starts with empty history', () => {
    expect(sm.getHistory()).toHaveLength(0);
  });

  it('adds results to history', () => {
    sm.addResult(makeResult(80));
    expect(sm.getHistory()).toHaveLength(1);
  });

  it('stores most recent first', () => {
    sm.addResult(makeResult(80));
    sm.addResult(makeResult(90));
    expect(sm.getHistory()[0].wpm).toBe(90);
  });

  it('sets personal best on first result', () => {
    const r = makeResult(80);
    sm.addResult(r);
    const pb = sm.getPersonalBest(r);
    expect(pb).toBeDefined();
    expect(pb?.wpm).toBe(80);
  });

  it('updates personal best when new result is higher', () => {
    sm.addResult(makeResult(80));
    const r2 = makeResult(100);
    const isNew = sm.addResult(r2);
    expect(isNew).toBe(true);
    expect(sm.getPersonalBest(r2)?.wpm).toBe(100);
  });

  it('does not update personal best when new result is lower', () => {
    sm.addResult(makeResult(100));
    const r2 = makeResult(80);
    const isNew = sm.addResult(r2);
    expect(isNew).toBe(false);
    expect(sm.getPersonalBest(r2)?.wpm).toBe(100);
  });

  it('uses separate PB keys for different modes', () => {
    sm.addResult(makeResult(100, 'time', '30'));
    sm.addResult(makeResult(120, 'words', '25'));
    const r1 = makeResult(50, 'time', '30');
    const r2 = makeResult(50, 'words', '25');
    expect(sm.getPersonalBest(r1)?.wpm).toBe(100);
    expect(sm.getPersonalBest(r2)?.wpm).toBe(120);
  });

  it('clears history', () => {
    sm.addResult(makeResult(80));
    sm.clearHistory();
    expect(sm.getHistory()).toHaveLength(0);
  });

  it('caps history at 1000 entries', () => {
    for (let i = 0; i < 1005; i++) sm.addResult(makeResult(i));
    expect(sm.getHistory().length).toBeLessThanOrEqual(1000);
  });
});

describe('StatsManager — getWeakChars', () => {
  it('returns empty array when no results have charAttempts', () => {
    const sm = new StatsManager(emptyPluginData());
    sm.addResult(makeResult(80));
    expect(sm.getWeakChars()).toHaveLength(0);
  });

  it('aggregates charAttempts and charErrors across results', () => {
    const sm = new StatsManager(emptyPluginData());
    const r1 = { ...makeResult(80), charAttempts: { a: 20, b: 15 }, charErrors: { a: 8 } };
    const r2 = { ...makeResult(85), charAttempts: { a: 10 }, charErrors: { a: 3 } };
    sm.addResult(r1);
    sm.addResult(r2);
    const weak = sm.getWeakChars();
    const aEntry = weak.find((w) => w.char === 'a');
    expect(aEntry).toBeDefined();
    expect(aEntry!.attempts).toBe(30);
    expect(aEntry!.errors).toBe(11);
    expect(aEntry!.rate).toBeCloseTo(11 / 30, 3);
  });

  it('excludes chars with fewer than 10 attempts', () => {
    const sm = new StatsManager(emptyPluginData());
    const r = { ...makeResult(80), charAttempts: { x: 5 }, charErrors: { x: 5 } };
    sm.addResult(r);
    expect(sm.getWeakChars()).toHaveLength(0);
  });

  it('sorts by error rate descending', () => {
    const sm = new StatsManager(emptyPluginData());
    const r = {
      ...makeResult(80),
      charAttempts: { a: 20, b: 20 },
      charErrors: { a: 2, b: 10 },
    };
    sm.addResult(r);
    const weak = sm.getWeakChars();
    expect(weak[0].char).toBe('b');
  });

  it('minRate filters out chars below the threshold', () => {
    const sm = new StatsManager(emptyPluginData());
    // 'a' has 10% error rate, 'b' has 50%
    const r = {
      ...makeResult(80),
      charAttempts: { a: 20, b: 20 },
      charErrors: { a: 2, b: 10 },
    };
    sm.addResult(r);
    // 0.10 threshold: 'a' (0.10) is exactly at threshold → included; 'b' (0.50) → included
    expect(sm.getWeakChars(50, 0.10)).toHaveLength(2);
    // 0.15 threshold: 'a' (0.10) below threshold → excluded
    expect(sm.getWeakChars(50, 0.15)).toHaveLength(1);
    expect(sm.getWeakChars(50, 0.15)[0].char).toBe('b');
  });

  it('limit restricts how many results are scanned', () => {
    const sm = new StatsManager(emptyPluginData());
    // Two old results with errors on 'a'
    sm.addResult({ ...makeResult(80), charAttempts: { a: 15 }, charErrors: { a: 10 } });
    sm.addResult({ ...makeResult(80), charAttempts: { a: 15 }, charErrors: { a: 10 } });
    // One recent result with no errors
    sm.addResult({ ...makeResult(90), charAttempts: { a: 20 }, charErrors: {} });
    // With limit=1 (newest only): 'a' has 0/20 = 0% error rate, filtered by minRate 0.10
    expect(sm.getWeakChars(1, 0.10)).toHaveLength(0);
    // With limit=3 (all): 'a' has 20/50 = 40%, above threshold
    expect(sm.getWeakChars(3, 0.10)).toHaveLength(1);
  });
});

describe('StatsManager — getWeakWords', () => {
  it('returns empty array when no results have wordErrors', () => {
    const sm = new StatsManager(emptyPluginData());
    sm.addResult(makeResult(80));
    expect(sm.getWeakWords()).toHaveLength(0);
  });

  it('aggregates and sorts by error count descending', () => {
    const sm = new StatsManager(emptyPluginData());
    const r1 = { ...makeResult(80), wordErrors: { the: 3, quick: 1 } };
    const r2 = { ...makeResult(85), wordErrors: { the: 2, brown: 6 } };
    sm.addResult(r1);
    sm.addResult(r2);
    const words = sm.getWeakWords();
    expect(words[0]).toBe('brown');
    expect(words[1]).toBe('the');
  });
});

describe('StatsManager — getProgressByMode', () => {
  it('returns empty object when history is empty', () => {
    const sm = new StatsManager(emptyPluginData());
    expect(Object.keys(sm.getProgressByMode())).toHaveLength(0);
  });

  it('omits groups with fewer than 3 entries', () => {
    const sm = new StatsManager(emptyPluginData());
    sm.addResult(makeResult(80, 'time', '30'));
    sm.addResult(makeResult(85, 'time', '30'));
    expect(Object.keys(sm.getProgressByMode())).toHaveLength(0);
  });

  it('includes groups with 3+ entries, oldest first', () => {
    const sm = new StatsManager(emptyPluginData());
    sm.addResult({ ...makeResult(70, 'time', '30'), timestamp: 1000 });
    sm.addResult({ ...makeResult(80, 'time', '30'), timestamp: 2000 });
    sm.addResult({ ...makeResult(90, 'time', '30'), timestamp: 3000 });
    const prog = sm.getProgressByMode();
    const key = 'time 30 normal';
    expect(prog[key]).toBeDefined();
    expect(prog[key]).toHaveLength(3);
    // Should be oldest first (ascending timestamp)
    expect(prog[key][0].wpm).toBe(70);
    expect(prog[key][2].wpm).toBe(90);
  });

  it('groups by mode and modeValue separately', () => {
    const sm = new StatsManager(emptyPluginData());
    for (let i = 0; i < 3; i++) sm.addResult(makeResult(80, 'time', '30'));
    for (let i = 0; i < 3; i++) sm.addResult(makeResult(100, 'words', '25'));
    const prog = sm.getProgressByMode();
    expect(Object.keys(prog)).toHaveLength(2);
  });
});

describe('calcConsistency', () => {
  it('returns 100 for a single sample', () => {
    expect(calcConsistency([80])).toBe(100);
  });

  it('returns 100 for constant WPM', () => {
    expect(calcConsistency([80, 80, 80, 80])).toBe(100);
  });

  it('returns lower value for high variance', () => {
    const c = calcConsistency([10, 100, 10, 100]);
    expect(c).toBeLessThan(50);
  });

  it('never goes below 0', () => {
    expect(calcConsistency([1, 1000])).toBeGreaterThanOrEqual(0);
  });

  it('returns 100 for empty history', () => {
    expect(calcConsistency([])).toBe(100);
  });
});
