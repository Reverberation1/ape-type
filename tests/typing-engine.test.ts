import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TypingEngine } from '../src/TypingEngine';

// Stub setInterval/clearInterval so the engine doesn't need real timers
vi.useFakeTimers();

const WORDS = ['the', 'quick', 'brown', 'fox', 'jumps'];

function makeEngine(words = WORDS, mode: 'time' | 'words' | 'quote' = 'words') {
  const engine = new TypingEngine();
  engine.init(words, mode, '5', 'normal', 60);
  return engine;
}

function typeWord(engine: TypingEngine, word: string): void {
  for (const ch of word) engine.pressKey(ch);
  engine.pressKey(' ');
}

describe('TypingEngine — initial state', () => {
  it('starts idle', () => {
    const e = makeEngine();
    expect(e.getSnapshot().state).toBe('idle');
  });

  it('has the correct word count', () => {
    const e = makeEngine();
    expect(e.getSnapshot().words.length).toBe(WORDS.length);
  });

  it('marks first word active', () => {
    const e = makeEngine();
    expect(e.getSnapshot().words[0].isActive).toBe(true);
  });
});

describe('TypingEngine — typing', () => {
  let engine: TypingEngine;
  beforeEach(() => { engine = makeEngine(); });

  it('transitions to running on first keypress', () => {
    engine.pressKey('t');
    expect(engine.getSnapshot().state).toBe('running');
  });

  it('marks correct letter correct', () => {
    engine.pressKey('t');
    expect(engine.getSnapshot().words[0].letters[0].state).toBe('correct');
  });

  it('marks wrong letter incorrect', () => {
    engine.pressKey('z');
    expect(engine.getSnapshot().words[0].letters[0].state).toBe('incorrect');
  });

  it('advances word index on space', () => {
    typeWord(engine, 'the');
    expect(engine.getSnapshot().currentWordIndex).toBe(1);
  });

  it('counts accuracy (fully correct word)', () => {
    typeWord(engine, 'the');
    expect(engine.getSnapshot().accuracy).toBe(100);
  });

  it('accuracy drops after a mistake', () => {
    engine.pressKey('z'); // wrong
    engine.pressKey('h');
    engine.pressKey('e');
    engine.pressKey(' ');
    expect(engine.getSnapshot().accuracy).toBeLessThan(100);
  });

  it('backspace restores untouched state', () => {
    engine.pressKey('t');
    engine.pressKey('Backspace');
    expect(engine.getSnapshot().words[0].letters[0].state).toBe('untouched');
  });

  it('does not go before word start with backspace', () => {
    engine.pressKey('t');
    engine.pressKey('Backspace');
    engine.pressKey('Backspace'); // no-op
    expect(engine.getSnapshot().currentWordIndex).toBe(0);
    expect(engine.getSnapshot().currentLetterIndex).toBe(0);
  });

  it('backspace at word start returns to previous word if it had error', () => {
    engine.pressKey('z'); // wrong
    engine.pressKey(' '); // advance
    engine.pressKey('Backspace');
    expect(engine.getSnapshot().currentWordIndex).toBe(0);
  });

  it('ignores space when nothing has been typed in current word', () => {
    engine.pressKey(' '); // nothing typed yet — should NOT advance
    expect(engine.getSnapshot().currentWordIndex).toBe(0);
  });
});

describe('TypingEngine — words mode completion', () => {
  it('completes when last word is fully typed', () => {
    const e = makeEngine(['hi', 'yo'], 'words');
    typeWord(e, 'hi');
    e.pressKey('y');
    e.pressKey('o');
    // last letter of last word typed — should complete
    expect(e.getSnapshot().state).toBe('complete');
  });
});

describe('TypingEngine — time mode', () => {
  it('does not complete on word count exhaustion', () => {
    const e = makeEngine(WORDS, 'time');
    // type all words — should NOT complete since timer hasn't elapsed
    for (const w of WORDS) typeWord(e, w);
    expect(e.getSnapshot().state).toBe('running');
  });

  it('completes when timer elapses', () => {
    let completed = false;
    const e = new TypingEngine();
    e.init(['the', 'quick'], 'time', '1', 'normal', 1); // 1-second test
    e.onComplete = () => { completed = true; };
    e.pressKey('t'); // start test
    vi.advanceTimersByTime(1200); // advance past 1s
    expect(completed).toBe(true);
  });
});

describe('TypingEngine — expert/master mode', () => {
  it('expert: returns restart when space pressed after error word', () => {
    const e = new TypingEngine();
    e.init(['the', 'fox'], 'words', '2', 'expert', 60);
    e.pressKey('z'); // wrong
    const result = e.pressKey(' '); // space after error
    expect(result).toBe('restart');
  });

  it('master: returns restart on first wrong key', () => {
    const e = new TypingEngine();
    e.init(['the'], 'words', '1', 'master', 60);
    const result = e.pressKey('z');
    expect(result).toBe('restart');
  });

  it('normal: continues after error', () => {
    const e = new TypingEngine();
    e.init(['the', 'fox'], 'words', '2', 'normal', 60);
    e.pressKey('z');
    const result = e.pressKey(' ');
    expect(result).toBe('ok');
  });
});

describe('TypingEngine — WPM', () => {
  it('wpm is 0 when idle', () => {
    const e = makeEngine();
    expect(e.getSnapshot().wpm).toBe(0);
  });

  it('wpm is non-zero after typing for a second', () => {
    const e = makeEngine(['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog', 'now'], 'time');
    e.pressKey('t'); // start
    vi.advanceTimersByTime(2000);
    expect(e.getSnapshot().wpm).toBeGreaterThan(0);
  });
});

describe('TypingEngine — extra characters', () => {
  it('appends extra letters as extra state', () => {
    // Use 2 words so the first word does not auto-complete on its last char.
    const e = makeEngine(['hi', 'bye']);
    e.pressKey('h');
    e.pressKey('i');
    e.pressKey('x'); // extra character on word[0] before space is pressed
    const letters = e.getSnapshot().words[0].letters;
    expect(letters[2].state).toBe('extra');
  });
});

describe('TypingEngine — character tracking', () => {
  it('records charAttempts for each keypress', () => {
    const e = makeEngine(['the', 'fox']);
    e.pressKey('t');
    e.pressKey('h');
    e.pressKey('e');
    const r = e.buildResult();
    expect(r.charAttempts?.['t']).toBe(1);
    expect(r.charAttempts?.['h']).toBe(1);
    expect(r.charAttempts?.['e']).toBe(1);
  });

  it('records charErrors only when wrong key pressed', () => {
    const e = makeEngine(['the', 'fox']);
    e.pressKey('z'); // wrong for 't'
    e.pressKey('h');
    e.pressKey('e');
    const r = e.buildResult();
    expect(r.charErrors?.['t']).toBe(1);
    expect(r.charErrors?.['h']).toBeUndefined();
  });

  it('does not record charErrors for correct keypresses', () => {
    const e = makeEngine(['hi', 'yo']);
    e.pressKey('h');
    e.pressKey('i');
    e.pressKey(' ');
    const r = e.buildResult();
    expect(r.charErrors?.['h']).toBeUndefined();
    expect(r.charErrors?.['i']).toBeUndefined();
  });

  it('records wordErrors when word completed with error then space', () => {
    const e = makeEngine(['the', 'fox']);
    e.pressKey('z'); // wrong for 't'
    e.pressKey('h');
    e.pressKey('e');
    e.pressKey(' ');
    const r = e.buildResult();
    expect(r.wordErrors?.['the']).toBe(1);
  });

  it('does not record wordErrors for cleanly typed words', () => {
    const e = makeEngine(['hi', 'yo']);
    typeWord(e, 'hi');
    const r = e.buildResult();
    expect(r.wordErrors?.['hi']).toBeUndefined();
  });

  it('resets tracking maps on init()', () => {
    const e = makeEngine(['hi', 'yo']);
    e.pressKey('z'); // wrong
    e.init(['hi', 'yo'], 'words', '2', 'normal', 60);
    const r = e.buildResult();
    expect(Object.keys(r.charAttempts ?? {})).toHaveLength(0);
    expect(Object.keys(r.charErrors ?? {})).toHaveLength(0);
    expect(Object.keys(r.wordErrors ?? {})).toHaveLength(0);
  });
});
