import { Component } from 'obsidian';
import type ApeTypePlugin from './main';
import { TypingEngine } from './TypingEngine';
import { StatsManager } from './StatsManager';
import { generateWords, generateImprovementWords, wordsFromText } from './WordGenerator';
import { englishWords } from './data/words';
import { englishQuotes, quoteGroups } from './data/quotes';
import type {
  TestMode,
  Difficulty,
  QuoteLength,
  EngineSnapshot,
  TestResult,
  Word,
  Quote,
} from './types';

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];
const QUOTE_LENGTH_OPTIONS: QuoteLength[] = ['short', 'medium', 'long', 'thicc'];
const QUOTE_LENGTH_LABELS: Record<QuoteLength, string> = {
  short: 'short',
  medium: 'medium',
  long: 'long',
  thicc: 'thicc',
};
const TIME_MODE_WORD_COUNT = 200;
const PROGRESS_COLORS = ['#e2b714', '#8fa4af', '#4db6ac', '#f59563', '#b07ddc'];

export interface ApeTypeWidgetOptions {
  embedded?: boolean;
  initialMode?: TestMode;
  initialTime?: number;
  initialWords?: number;
  initialQuoteLength?: QuoteLength;
}

export class ApeTypeWidget extends Component {
  private plugin: ApeTypePlugin;
  private opts: ApeTypeWidgetOptions;
  private engine: TypingEngine;
  private stats: StatsManager;

  private mode: TestMode;
  private timeValue: number;
  private wordsValue: number;
  private quoteLength: QuoteLength;
  private difficulty: Difficulty;
  private punctuation: boolean;
  private numbers: boolean;

  private wrapperEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private liveStatsEl!: HTMLElement;
  private liveWpmEl!: HTMLElement;
  private liveTimerEl!: HTMLElement;
  private improveHintEl!: HTMLElement;
  private wordsAreaEl!: HTMLElement;
  private wordsContainerEl!: HTMLElement;
  private wordsInnerEl!: HTMLElement;
  private caretEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private focusOverlayEl!: HTMLElement;
  private resultsEl!: HTMLElement;
  private quoteSourceEl!: HTMLElement;
  private capsLockEl!: HTMLElement;
  private historyEl!: HTMLElement;

  private wordEls: HTMLElement[] = [];
  private rowHeight = 0;
  private scrolledRows = 0;
  private currentQuoteSource = '';
  private currentQuoteObj: Quote | null = null;
  private pendingRepeat = false;
  private historyVisible = false;

  private _flashTimeout: ReturnType<typeof setTimeout> | null = null;
  private _resultsKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private containerEl: HTMLElement,
    plugin: ApeTypePlugin,
    opts: ApeTypeWidgetOptions = {}
  ) {
    super();
    this.plugin = plugin;
    this.opts = opts;
    this.engine = new TypingEngine();
    this.stats = new StatsManager(plugin.pluginData);

    const s = plugin.settings;
    this.mode = opts.initialMode ?? s.defaultMode;
    this.timeValue = opts.initialTime ?? s.defaultTime;
    this.wordsValue = opts.initialWords ?? s.defaultWords;
    this.quoteLength = opts.initialQuoteLength ?? s.defaultQuoteLength;
    this.difficulty = s.difficulty;
    this.punctuation = s.punctuation;
    this.numbers = s.numbers;
  }

  applyTheme(theme: string): void {
    this.containerEl.className = this.containerEl.className
      .replace(/\bape-theme-\S+/g, '')
      .trim();
    this.containerEl.addClass(`ape-theme-${theme}`);
  }

  onload(): void {
    this.containerEl.addClass('ape-type-view');
    if (this.opts.embedded) this.containerEl.addClass('ape-type-embedded');
    this.applyTheme(this.plugin.settings.theme);
    this.buildDom();
    this.setupEngineCallbacks();
    this.setupEventListeners();
    this.startNewTest();
  }

  onunload(): void {
    if (this._flashTimeout !== null) {
      clearTimeout(this._flashTimeout);
      this._flashTimeout = null;
    }
    if (this._resultsKeyHandler && this.resultsEl) {
      this.resultsEl.removeEventListener('keydown', this._resultsKeyHandler);
      this._resultsKeyHandler = null;
    }
    this.engine.destroy();
  }

  focusInput(): void {
    this.inputEl?.focus({ preventScroll: true });
  }

  // ── DOM construction ──────────────────────────────────────────────────────

  private buildDom(): void {
    this.containerEl.empty();
    this.wrapperEl = this.containerEl.createDiv({ cls: 'ape-wrapper' });
    this.wrapperEl.createDiv({ cls: 'ape-embed-title', text: 'Ape Type' });
    this.buildToolbar();
    this.buildLiveStats();
    this.buildWordsArea();
    this.buildResults();
    this.buildHistoryPanel();
  }

  private buildToolbar(): void {
    this.toolbarEl = this.wrapperEl.createDiv({ cls: 'ape-toolbar' });

    const diffGroup = this.toolbarEl.createDiv({ cls: 'ape-toolbar-group ape-toolbar-diff' });
    for (const diff of ['normal', 'expert', 'master'] as Difficulty[]) {
      const btn = diffGroup.createEl('button', { cls: 'ape-btn', text: diff });
      btn.dataset.diff = diff;
      if (diff === this.difficulty) btn.addClass('active');
      btn.addEventListener('click', () => {
        this.difficulty = diff;
        diffGroup.querySelectorAll('[data-diff]').forEach((b) => b.removeClass('active'));
        btn.addClass('active');
        this.startNewTest();
      });
    }

    this.toolbarEl.createDiv({ cls: 'ape-toolbar-sep ape-sep-after-diff' });

    const modGroup = this.toolbarEl.createDiv({ cls: 'ape-toolbar-group ape-toolbar-mods' });
    this.buildModBtn(modGroup, 'punctuation', '@ punctuation', () => {
      this.punctuation = !this.punctuation;
      this.startNewTest();
    });
    this.buildModBtn(modGroup, 'numbers', '# numbers', () => {
      this.numbers = !this.numbers;
      this.startNewTest();
    });

    this.toolbarEl.createDiv({ cls: 'ape-toolbar-sep ape-sep-after-mods' });

    const modeGroup = this.toolbarEl.createDiv({ cls: 'ape-toolbar-group' });
    for (const m of ['time', 'words', 'quote', 'improve', 'zen'] as TestMode[]) {
      const btn = modeGroup.createEl('button', { cls: 'ape-btn', text: m });
      btn.dataset.mode = m;
      if (m === this.mode) btn.addClass('active');
      btn.addEventListener('click', () => {
        this.mode = m;
        modeGroup.querySelectorAll('[data-mode]').forEach((b) => b.removeClass('active'));
        btn.addClass('active');
        this.refreshValueGroup();
        this.startNewTest();
      });
    }

    this.toolbarEl.createDiv({ cls: 'ape-toolbar-sep ape-sep-mode-values' });

    const valueArea = this.toolbarEl.createDiv({ cls: 'ape-toolbar-group' });
    this.buildValueGroup(valueArea, 'time', TIME_OPTIONS.map(String), String(this.timeValue), (v) => {
      this.timeValue = Number(v);
      this.startNewTest();
    });
    this.buildValueGroup(valueArea, 'words', WORD_OPTIONS.map(String), String(this.wordsValue), (v) => {
      this.wordsValue = Number(v);
      this.startNewTest();
    });
    this.buildValueGroup(valueArea, 'quote', QUOTE_LENGTH_OPTIONS, this.quoteLength, (v) => {
      this.quoteLength = v as QuoteLength;
      this.startNewTest();
    });
    // improve mode reuses the words value group (refreshValueGroup shows it for both)

    this.refreshValueGroup();

    this.toolbarEl.createDiv({ cls: 'ape-toolbar-sep' });
    const histBtn = this.toolbarEl.createEl('button', { cls: 'ape-btn', text: 'history' });
    histBtn.addEventListener('click', () => {
      if (this.historyVisible) this.hideHistoryPanel();
      else this.showHistoryPanel();
    });
  }

  private buildModBtn(parent: HTMLElement, key: string, label: string, onClick: () => void): void {
    const active = key === 'punctuation' ? this.punctuation : this.numbers;
    const btn = parent.createEl('button', { cls: 'ape-btn ape-mod-btn', text: label });
    btn.dataset.mod = key;
    if (active) btn.addClass('active');
    btn.addEventListener('click', () => {
      btn.toggleClass('active', !btn.hasClass('active'));
      onClick();
    });
  }

  private buildValueGroup(
    parent: HTMLElement,
    forMode: string,
    values: string[],
    activeVal: string,
    onChange: (v: string) => void
  ): void {
    const group = parent.createDiv({ cls: 'ape-val-group', attr: { 'data-for': forMode } });
    for (const v of values) {
      const label = forMode === 'quote' ? QUOTE_LENGTH_LABELS[v as QuoteLength] : v;
      const btn = group.createEl('button', { cls: 'ape-btn', text: label });
      btn.dataset.val = v;
      if (v === activeVal) btn.addClass('active');
      btn.addEventListener('click', () => {
        group.querySelectorAll('[data-val]').forEach((b) => b.removeClass('active'));
        btn.addClass('active');
        onChange(v);
      });
    }
  }

  private refreshValueGroup(): void {
    this.toolbarEl.querySelectorAll('.ape-val-group').forEach((g) => {
      const el = g as HTMLElement;
      // improve and zen share the words value group
      const matches = el.dataset.for === this.mode ||
        (el.dataset.for === 'words' && (this.mode === 'improve' || this.mode === 'zen'));
      el.style.display = matches ? '' : 'none';
    });
    const modBtns = this.toolbarEl.querySelectorAll('.ape-mod-btn') as NodeListOf<HTMLElement>;
    const disableMods = this.mode === 'quote' || this.mode === 'improve' || this.mode === 'zen';
    modBtns.forEach((b) => {
      b.style.opacity = disableMods ? '0.3' : '1';
      b.style.pointerEvents = disableMods ? 'none' : '';
    });
  }

  private buildLiveStats(): void {
    this.liveStatsEl = this.wrapperEl.createDiv({ cls: 'ape-live-stats' });
    const wpmDiv = this.liveStatsEl.createDiv({ cls: 'ape-live-wpm' });
    this.liveWpmEl = wpmDiv.createSpan({ cls: 'ape-live-wpm-val', text: '0' });
    this.liveTimerEl = this.liveStatsEl.createDiv({ cls: 'ape-live-timer', text: '0' });

    this.improveHintEl = this.wrapperEl.createDiv({ cls: 'ape-improve-hint' });
    this.improveHintEl.style.display = 'none';
  }

  private buildWordsArea(): void {
    this.wordsAreaEl = this.wrapperEl.createDiv({ cls: 'ape-words-area' });

    this.capsLockEl = this.wordsAreaEl.createDiv({ cls: 'ape-capslock', text: 'CAPS LOCK' });
    this.capsLockEl.style.display = 'none';

    this.wordsContainerEl = this.wordsAreaEl.createDiv({ cls: 'ape-words-container' });
    this.wordsInnerEl = this.wordsContainerEl.createDiv({ cls: 'ape-words-inner' });
    this.caretEl = this.wordsContainerEl.createDiv({ cls: 'ape-caret' });

    this.quoteSourceEl = this.wordsAreaEl.createDiv({ cls: 'ape-quote-source' });

    this.inputEl = this.wordsAreaEl.createEl('input', {
      cls: 'ape-hidden-input',
      attr: {
        type: 'text',
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
      },
    });

    this.focusOverlayEl = this.wordsAreaEl.createDiv({ cls: 'ape-focus-overlay' });
    this.focusOverlayEl.createDiv({ cls: 'ape-focus-msg', text: 'click to focus or start typing' });
  }

  private buildResults(): void {
    this.resultsEl = this.wrapperEl.createDiv({ cls: 'ape-results' });
    this.resultsEl.style.display = 'none';
  }

  private buildHistoryPanel(): void {
    this.historyEl = this.wrapperEl.createDiv({ cls: 'ape-history' });
    this.historyEl.style.display = 'none';
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.registerDomEvent(this.inputEl, 'keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        this.handleKey('Tab');
        return;
      }
      if (e.key === 'Backspace') {
        // Prevent browser navigation; input event won't fire for backspace on empty
        // input on desktop, so we handle it here. Mobile fires input instead.
        e.preventDefault();
        e.stopPropagation();
        this.handleKey('Backspace');
        return;
      }
      if (e.key.length === 1) {
        // stopPropagation keeps Obsidian hotkeys from triggering; we do NOT
        // preventDefault so the input event fires (needed for mobile virtual keyboards).
        e.stopPropagation();
      }

      if (e.key === 'CapsLock' || e.getModifierState?.('CapsLock')) {
        const isCaps = e.getModifierState('CapsLock');
        this.capsLockEl.style.display = isCaps ? '' : 'none';
      }
    });

    this.registerDomEvent(this.wordsAreaEl, 'click', () => this.focusInput());
    this.registerDomEvent(this.focusOverlayEl, 'click', () => this.focusInput());

    this.registerDomEvent(this.inputEl, 'focus', () => {
      this.focusOverlayEl.style.display = 'none';
      this.caretEl.removeClass('blink-pause');
    });
    this.registerDomEvent(this.inputEl, 'blur', () => {
      this.focusOverlayEl.style.display = '';
      this.caretEl.addClass('blink-pause');
    });

    // Primary character input handler — works for both desktop and mobile.
    // On desktop: keydown inserts the char into the hidden input, then this fires.
    // On mobile: virtual keyboard fires this directly (keydown key is 'Unidentified').
    this.registerDomEvent(this.inputEl, 'input', (e: Event) => {
      const ie = e as InputEvent;
      if (ie.isComposing) {
        // IME composition in progress — discard and wait for compositionend
        (e.target as HTMLInputElement).value = '';
        return;
      }
      if (ie.inputType === 'deleteContentBackward') {
        // Mobile backspace (desktop is handled in keydown with preventDefault)
        this.handleKey('Backspace');
      } else if (ie.data) {
        for (const ch of ie.data) {
          this.handleKey(ch);
        }
      }
      (e.target as HTMLInputElement).value = '';
    });

    this.registerDomEvent(this.inputEl, 'compositionend', (e: Event) => {
      (e.target as HTMLInputElement).value = '';
    });
  }

  private handleKey(key: string): void {
    if (this.historyVisible) {
      if (key === 'Tab') this.hideHistoryPanel();
      return;
    }
    if (key === 'Tab') {
      this.startNewTest();
      return;
    }
    const result = this.engine.pressKey(key);
    if (result === 'restart') {
      this.flashRestart();
    }
  }

  // ── Engine callbacks ──────────────────────────────────────────────────────

  private setupEngineCallbacks(): void {
    this.engine.onTick = (snap) => this.renderUpdate(snap);
    this.engine.onComplete = () => this.handleTestComplete();
  }

  // ── Test lifecycle ────────────────────────────────────────────────────────

  private startNewTest(): void {
    this.engine.destroy();
    this.engine = new TypingEngine();
    this.setupEngineCallbacks();

    this.scrolledRows = 0;
    this.rowHeight = 0;
    this.wordEls = [];
    this.wordsInnerEl.style.transform = '';
    this.caretEl.removeClass('blink-pause');

    if (this.historyVisible) this.hideHistoryPanel();
    this.hideResults();
    this.liveStatsEl.style.opacity = '0';
    this.quoteSourceEl.textContent = '';

    // Improve hint
    if (this.mode === 'improve') {
      const weakChars = this.stats.getWeakChars(15, 0.10).map((w) => w.char);
      if (weakChars.length > 0) {
        this.improveHintEl.textContent = `focusing on: ${weakChars.slice(0, 6).join('  ')}`;
      } else {
        this.improveHintEl.textContent = 'no weak characters yet — complete more tests to see targeting';
      }
      this.improveHintEl.style.display = '';
    } else {
      this.improveHintEl.style.display = 'none';
    }

    const words = this.generateTestWords();
    const modeValue = this.currentModeValue();
    const timeLimit = this.mode === 'time' ? this.timeValue : 999999;

    this.engine.init(words, this.mode, modeValue, this.difficulty, timeLimit);
    this.renderWords(this.engine.getSnapshot());
    this.updateLiveTimer(this.engine.getSnapshot());

    if (this.mode === 'quote') {
      this.quoteSourceEl.textContent = `— ${this.currentQuoteSource}`;
    }

    this.focusInput();
  }

  private generateTestWords(): string[] {
    if (this.mode === 'time') {
      return generateWords(englishWords, TIME_MODE_WORD_COUNT, {
        punctuation: this.punctuation,
        numbers: this.numbers,
      });
    }
    if (this.mode === 'words') {
      return generateWords(englishWords, this.wordsValue, {
        punctuation: this.punctuation,
        numbers: this.numbers,
      });
    }
    if (this.mode === 'improve') {
      const weakChars = this.stats.getWeakChars(15, 0.10).map((w) => w.char);
      const weakWords = this.stats.getWeakWords(15);
      return generateImprovementWords(englishWords, this.wordsValue, weakChars, weakWords);
    }
    if (this.mode === 'zen') {
      return generateWords(englishWords, this.wordsValue, { punctuation: false, numbers: false });
    }
    // quote — reuse last quote if repeat was requested
    const quote = (this.pendingRepeat && this.currentQuoteObj)
      ? this.currentQuoteObj
      : this.pickQuote();
    this.pendingRepeat = false;
    this.currentQuoteSource = quote.source;
    this.currentQuoteObj = quote;
    return wordsFromText(quote.text);
  }

  private pickQuote(): Quote {
    const lengthIndex: Record<QuoteLength, number> = {
      short: 0, medium: 1, long: 2, thicc: 3,
    };
    const [min, max] = quoteGroups[lengthIndex[this.quoteLength]];
    const pool = englishQuotes.filter((q) => q.length >= min && q.length <= max);
    return pool[Math.floor(Math.random() * pool.length)] ?? englishQuotes[0];
  }

  private currentModeValue(): string {
    if (this.mode === 'time') return String(this.timeValue);
    if (this.mode === 'words') return String(this.wordsValue);
    if (this.mode === 'improve') return String(this.wordsValue);
    if (this.mode === 'zen') return String(this.wordsValue);
    return this.quoteLength;
  }

  private handleTestComplete(): void {
    const partial = this.engine.buildResult();
    const result: TestResult = {
      ...partial,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      punctuation: this.punctuation,
      numbers: this.numbers,
    };
    const isNewPb = this.stats.addResult(result);
    this.plugin.saveSettings();
    this.showResults(result, isNewPb);
  }

  private flashRestart(): void {
    if (this._flashTimeout !== null) {
      clearTimeout(this._flashTimeout);
    }
    this.wordsContainerEl.addClass('ape-restart-flash');
    this._flashTimeout = setTimeout(() => {
      this._flashTimeout = null;
      this.wordsContainerEl.removeClass('ape-restart-flash');
      this.startNewTest();
    }, 150);
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private renderUpdate(snap: EngineSnapshot): void {
    this.updateWordStates(snap);
    this.updateLiveTimer(snap);
    this.updateCaret(snap);
    this.updateScroll(snap);

    if (snap.state === 'running' && this.mode !== 'zen') {
      this.liveStatsEl.style.opacity = '1';
      this.liveWpmEl.textContent = String(snap.wpm);
    }
  }

  private renderWords(snap: EngineSnapshot): void {
    this.wordsInnerEl.empty();
    this.wordEls = [];

    for (let wi = 0; wi < snap.words.length; wi++) {
      const wordData = snap.words[wi];
      const wordEl = this.wordsInnerEl.createDiv({ cls: 'ape-word' });
      this.wordEls[wi] = wordEl;

      for (const letter of wordData.letters) {
        wordEl.createSpan({ cls: `ape-letter ${letter.state}`, text: letter.char });
      }

      if (wi === snap.currentWordIndex) wordEl.addClass('active');
    }

    requestAnimationFrame(() => {
      this.measureRowHeight();
      this.updateCaret(snap);
    });
  }

  private updateWordStates(snap: EngineSnapshot): void {
    const words: Word[] = snap.words;

    for (let wi = 0; wi < words.length; wi++) {
      const wordEl = this.wordEls[wi];
      if (!wordEl) continue;

      const wordData = words[wi];
      wordEl.toggleClass('active', wi === snap.currentWordIndex);
      wordEl.toggleClass('error', wordData.hasError && wordData.isComplete);

      const letters = wordData.letters;

      // childElementCount is live — avoids infinite loop that a static NodeList causes
      while (wordEl.childElementCount < letters.length) {
        wordEl.createSpan({ cls: 'ape-letter' });
      }
      while (wordEl.childElementCount > letters.length) {
        wordEl.lastChild?.remove();
      }

      const currentLetterEls = wordEl.querySelectorAll('.ape-letter');
      for (let li = 0; li < letters.length; li++) {
        const el = currentLetterEls[li] as HTMLElement;
        el.className = `ape-letter ${letters[li].state}`;
        el.textContent = letters[li].char;
      }
    }
  }

  private updateLiveTimer(snap: EngineSnapshot): void {
    if (this.mode === 'time') {
      const remaining = Math.ceil(snap.remaining);
      this.liveTimerEl.textContent = String(remaining > 0 ? remaining : 0);
    } else {
      this.liveTimerEl.textContent = String(Math.round(snap.elapsed));
    }
  }

  private updateCaret(snap: EngineSnapshot): void {
    const wordEl = this.wordEls[snap.currentWordIndex];
    if (!wordEl) return;

    const letterEls = wordEl.querySelectorAll('.ape-letter');
    let targetEl: Element | null = null;
    let afterLast = false;

    if (snap.currentLetterIndex < letterEls.length) {
      targetEl = letterEls[snap.currentLetterIndex];
    } else if (letterEls.length > 0) {
      targetEl = letterEls[letterEls.length - 1];
      afterLast = true;
    }

    if (!targetEl) return;

    const containerRect = this.wordsContainerEl.getBoundingClientRect();
    const letterRect = (targetEl as HTMLElement).getBoundingClientRect();

    let left = letterRect.left - containerRect.left;
    if (afterLast) left += letterRect.width;
    const top = letterRect.top - containerRect.top;

    this.caretEl.style.left = `${left}px`;
    this.caretEl.style.top = `${top}px`;
    this.caretEl.style.height = `${letterRect.height}px`;
  }

  private measureRowHeight(): void {
    if (this.rowHeight > 0) return;
    const els = this.wordsInnerEl.querySelectorAll('.ape-word');
    if (els.length < 2) { this.rowHeight = 50; return; }
    const firstTop = (els[0] as HTMLElement).offsetTop;
    for (let i = 1; i < els.length; i++) {
      const top = (els[i] as HTMLElement).offsetTop;
      if (top > firstTop) {
        this.rowHeight = top - firstTop;
        return;
      }
    }
    this.rowHeight = 50;
  }

  private updateScroll(snap: EngineSnapshot): void {
    if (this.rowHeight === 0) {
      this.measureRowHeight();
      if (this.rowHeight === 0) return;
    }

    const wordEl = this.wordEls[snap.currentWordIndex];
    if (!wordEl) return;

    const currentTop = wordEl.offsetTop;
    const visibleRows = 3;
    const threshold = this.rowHeight * (visibleRows - 1);
    const scrolledOffset = this.scrolledRows * this.rowHeight;

    if (currentTop - scrolledOffset >= threshold) {
      this.scrolledRows++;
      const newOffset = this.scrolledRows * this.rowHeight;
      this.wordsInnerEl.style.transform = `translateY(-${newOffset}px)`;
      requestAnimationFrame(() => this.updateCaret(snap));
    }
  }

  // ── Results screen ────────────────────────────────────────────────────────

  private showResults(result: TestResult, isNewPb: boolean): void {
    this.wordsAreaEl.style.display = 'none';
    this.liveStatsEl.style.display = 'none';
    this.improveHintEl.style.display = 'none';
    this.resultsEl.style.display = '';
    this.resultsEl.empty();

    const prevPb = this.stats.getPersonalBest(result);

    const main = this.resultsEl.createDiv({ cls: 'ape-results-main' });
    this.buildResultStat(main, 'wpm', String(result.wpm), 'large');
    this.buildResultStat(main, 'acc', `${result.accuracy}%`, 'large');

    const sub = this.resultsEl.createDiv({ cls: 'ape-results-sub' });
    this.buildResultStat(sub, 'raw', String(result.rawWpm));
    this.buildResultStat(sub, 'consistency', `${result.consistency}%`);
    this.buildResultStat(sub, 'time', `${result.duration}s`);
    this.buildResultStat(sub, 'chars', `${result.correctChars}/${result.incorrectChars}`);
    const modeLabel = this.mode === 'time'   ? `time ${result.modeValue}`
      : this.mode === 'words'   ? `words ${result.modeValue}`
      : this.mode === 'improve' ? `improve ${result.modeValue}`
      : this.mode === 'zen'     ? `zen ${result.modeValue}`
      : `quote ${result.modeValue}`;
    this.buildResultStat(sub, 'mode', modeLabel);

    if (result.wpmHistory.length > 1) {
      const chartEl = this.resultsEl.createDiv({ cls: 'ape-results-chart' });
      chartEl.innerHTML = this.buildSvgChart(result.wpmHistory, result.rawHistory);
    }

    if (prevPb) {
      const pbEl = this.resultsEl.createDiv({ cls: 'ape-results-pb' });
      if (isNewPb) {
        pbEl.createSpan({ cls: 'ape-pb-new', text: 'new personal best!' });
      } else {
        pbEl.createSpan({ cls: 'ape-pb-label', text: 'best:' });
        pbEl.createSpan({ cls: 'ape-pb-val', text: ` ${prevPb.wpm} wpm` });
      }
    }

    const actions = this.resultsEl.createDiv({ cls: 'ape-results-actions' });
    const restartBtn = actions.createEl('button', { cls: 'ape-restart-btn', text: 'next test' });
    restartBtn.addEventListener('click', () => this.restartFromResults());
    if (this.mode === 'quote' && this.currentQuoteObj) {
      const repeatBtn = actions.createEl('button', { cls: 'ape-restart-btn', text: 'repeat quote' });
      repeatBtn.addEventListener('click', () => {
        this.pendingRepeat = true;
        this.restartFromResults();
      });
    }
    actions.createSpan({ cls: 'ape-hint', text: 'tab or enter to restart' });

    if (this._resultsKeyHandler) {
      this.resultsEl.removeEventListener('keydown', this._resultsKeyHandler);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.resultsEl.removeEventListener('keydown', onKey);
        this._resultsKeyHandler = null;
        this.restartFromResults();
      }
    };
    this._resultsKeyHandler = onKey;
    this.resultsEl.setAttribute('tabindex', '0');
    this.resultsEl.addEventListener('keydown', onKey);
    this.resultsEl.focus();
  }

  private buildResultStat(parent: HTMLElement, label: string, value: string, size = ''): void {
    const el = parent.createDiv({ cls: `ape-stat ${size}` });
    el.createDiv({ cls: 'ape-stat-label', text: label });
    el.createDiv({ cls: 'ape-stat-value', text: value });
  }

  private buildSvgChart(wpm: number[], raw: number[]): string {
    const W = 600;
    const H = 160;
    const pad = { top: 10, right: 10, bottom: 30, left: 40 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;
    const maxWpm = Math.max(...wpm, ...raw, 1);
    const steps = wpm.length;

    const toX = (i: number) => pad.left + (i / Math.max(steps - 1, 1)) * innerW;
    const toY = (v: number) => pad.top + innerH - (v / maxWpm) * innerH;
    const line = (data: number[]) => data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

    const yLabels = [0, Math.round(maxWpm / 2), maxWpm]
      .map((v) => `<text x="${pad.left - 6}" y="${toY(v) + 4}" class="ape-chart-label" text-anchor="end">${v}</text>`)
      .join('');

    const xInterval = steps <= 30 ? 5 : steps <= 60 ? 10 : 30;
    const xLabels = Array.from({ length: steps }, (_, i) => i)
      .filter((i) => i % xInterval === 0 || i === steps - 1)
      .map((i) => `<text x="${toX(i)}" y="${H - 4}" class="ape-chart-label" text-anchor="middle">${i + 1}s</text>`)
      .join('');

    return `<svg viewBox="0 0 ${W} ${H}" class="ape-chart-svg" xmlns="http://www.w3.org/2000/svg">
  <polyline points="${line(raw)}" class="ape-chart-raw" fill="none"/>
  <polyline points="${line(wpm)}" class="ape-chart-wpm" fill="none"/>
  ${yLabels}${xLabels}
</svg>`;
  }

  private hideResults(): void {
    this.resultsEl.style.display = 'none';
    this.wordsAreaEl.style.display = '';
    this.liveStatsEl.style.display = '';
    this.liveStatsEl.style.opacity = '0';
  }

  private restartFromResults(): void {
    this.hideResults();
    this.startNewTest();
  }

  // ── History + Analytics screen ────────────────────────────────────────────

  private showHistoryPanel(): void {
    this.historyVisible = true;
    this.wordsAreaEl.style.display = 'none';
    this.liveStatsEl.style.display = 'none';
    this.improveHintEl.style.display = 'none';
    this.resultsEl.style.display = 'none';
    this.historyEl.style.display = '';
    this.renderHistory();
    this.historyEl.setAttribute('tabindex', '0');
    this.historyEl.focus();
  }

  private hideHistoryPanel(): void {
    this.historyVisible = false;
    this.historyEl.style.display = 'none';
    this.wordsAreaEl.style.display = '';
    this.liveStatsEl.style.display = '';
    this.liveStatsEl.style.opacity = '0';
    if (this.mode === 'improve') this.improveHintEl.style.display = '';
    this.focusInput();
  }

  private renderHistory(): void {
    this.historyEl.empty();

    const headerRow = this.historyEl.createDiv({ cls: 'ape-history-header' });
    headerRow.createDiv({ cls: 'ape-history-title', text: 'history' });
    const closeBtn = headerRow.createEl('button', { cls: 'ape-btn', text: 'close' });
    closeBtn.addEventListener('click', () => this.hideHistoryPanel());

    const history = this.stats.getHistory();

    // ── Progress chart ────────────────────────────────────────────────────
    const progressSection = this.historyEl.createDiv({ cls: 'ape-history-section' });
    progressSection.createDiv({ cls: 'ape-history-section-title', text: 'progress' });

    const progressData = this.stats.getProgressByMode();
    const progressEntries = Object.entries(progressData)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    if (progressEntries.length === 0) {
      progressSection.createDiv({
        cls: 'ape-history-empty',
        text: 'complete 3+ tests in any mode to see your progress chart',
      });
    } else {
      const chartWrap = progressSection.createDiv({ cls: 'ape-progress-chart-wrap' });
      chartWrap.innerHTML = this.buildProgressChart(progressEntries);

      const legend = chartWrap.createDiv({ cls: 'ape-progress-legend' });
      for (let i = 0; i < progressEntries.length; i++) {
        const item = legend.createDiv({ cls: 'ape-progress-legend-item' });
        item.createDiv({ cls: `ape-progress-legend-dot ape-chart-line-${i}` });
        item.createSpan({ text: progressEntries[i][0] });
      }
    }

    // ── Analytics ─────────────────────────────────────────────────────────
    const analyticsSection = this.historyEl.createDiv({ cls: 'ape-history-section' });
    analyticsSection.createDiv({ cls: 'ape-history-section-title', text: 'analytics' });

    const weakChars = this.stats.getWeakChars();
    const last10 = history.slice(0, 10);

    // Summary stat cards
    const summaryRow = analyticsSection.createDiv({ cls: 'ape-analytics-summary' });
    const avgWpm = last10.length > 0
      ? Math.round(last10.reduce((s, r) => s + r.wpm, 0) / last10.length)
      : 0;
    const avgConsistency = last10.length > 0
      ? Math.round(last10.reduce((s, r) => s + r.consistency, 0) / last10.length)
      : 0;
    this.buildResultStat(summaryRow, 'avg wpm', last10.length > 0 ? String(avgWpm) : '—');
    this.buildResultStat(summaryRow, 'consistency', last10.length > 0 ? `${avgConsistency}%` : '—');
    this.buildResultStat(summaryRow, 'most missed', weakChars.length > 0 ? weakChars[0].char : '—');

    // Character weakness bars
    const charSection = analyticsSection.createDiv({ cls: 'ape-analytics-chars' });
    charSection.createDiv({ cls: 'ape-history-section-title', text: 'character accuracy' });

    if (weakChars.length < 3) {
      charSection.createDiv({
        cls: 'ape-history-empty',
        text: 'still collecting data — complete more tests to see character analytics',
      });
    } else {
      // Show up to 8, from worst to best accuracy
      for (const { char, attempts, errors, rate } of weakChars.slice(0, 8)) {
        const row = charSection.createDiv({ cls: 'ape-analytics-row' });
        row.createSpan({ cls: 'ape-analytics-char', text: char });
        const track = row.createDiv({ cls: 'ape-analytics-bar-track' });
        track.createDiv({
          cls: 'ape-analytics-bar-fill',
          attr: { style: `width: ${Math.round(rate * 100)}%` },
        });
        row.createSpan({
          cls: 'ape-analytics-rate',
          text: `${Math.round(rate * 100)}%  (${errors}/${attempts})`,
        });
      }
    }

    if (history.length === 0) {
      this.historyEl.createDiv({ cls: 'ape-history-empty', text: 'no tests completed yet' });
      return;
    }

    // ── Personal bests ────────────────────────────────────────────────────
    const pbs = this.stats.getData().personalBests;
    const pbKeys = Object.keys(pbs);
    if (pbKeys.length > 0) {
      const pbSection = this.historyEl.createDiv({ cls: 'ape-history-section' });
      pbSection.createDiv({ cls: 'ape-history-section-title', text: 'personal bests' });
      const pbGrid = pbSection.createDiv({ cls: 'ape-history-pb-grid' });
      for (const key of pbKeys.sort()) {
        const pb = pbs[key];
        const card = pbGrid.createDiv({ cls: 'ape-history-pb-card' });
        card.createDiv({ cls: 'ape-history-pb-mode', text: key.replace(/_/g, ' ') });
        card.createDiv({ cls: 'ape-history-pb-wpm', text: `${pb.wpm} wpm` });
        card.createDiv({ cls: 'ape-history-pb-acc', text: `${pb.accuracy}% acc` });
      }
    }

    // ── Results table ─────────────────────────────────────────────────────
    const tableSection = this.historyEl.createDiv({ cls: 'ape-history-section' });
    const label = history.length > 50
      ? `recent results (showing 50 of ${history.length})`
      : 'recent results';
    tableSection.createDiv({ cls: 'ape-history-section-title', text: label });

    const table = tableSection.createEl('table', { cls: 'ape-history-table' });
    const thead = table.createEl('thead');
    const hr = thead.createEl('tr');
    for (const h of ['wpm', 'raw', 'acc', 'consistency', 'mode', 'date']) {
      hr.createEl('th', { text: h });
    }
    const tbody = table.createEl('tbody');
    for (const r of history.slice(0, 50)) {
      const tr = tbody.createEl('tr');
      tr.createEl('td', { text: String(r.wpm) });
      tr.createEl('td', { text: String(r.rawWpm) });
      tr.createEl('td', { text: `${r.accuracy}%` });
      tr.createEl('td', { text: `${r.consistency}%` });
      tr.createEl('td', { text: `${r.mode} ${r.modeValue}` });
      tr.createEl('td', { text: new Date(r.timestamp).toLocaleDateString() });
    }
  }

  private buildProgressChart(
    entries: [string, { wpm: number; accuracy: number; timestamp: number }[]][]
  ): string {
    const W = 600;
    const H = 180;
    const pad = { top: 14, right: 10, bottom: 24, left: 40 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;

    const allWpms = entries.flatMap(([, pts]) => pts.map((p) => p.wpm));
    const maxWpm = Math.max(...allWpms, 1);

    const toX = (i: number, total: number) =>
      pad.left + (total <= 1 ? innerW / 2 : (i / (total - 1)) * innerW);
    const toY = (v: number) => pad.top + innerH - (v / maxWpm) * innerH;

    let polylines = '';
    for (let ci = 0; ci < entries.length; ci++) {
      const [, points] = entries[ci];
      const pts = points.map((p, i) => `${toX(i, points.length)},${toY(p.wpm)}`).join(' ');
      polylines += `<polyline points="${pts}" class="ape-chart-progress-${ci}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    const yLabels = [0, Math.round(maxWpm / 2), maxWpm]
      .map((v) => `<text x="${pad.left - 6}" y="${toY(v) + 4}" class="ape-chart-label" text-anchor="end">${v}</text>`)
      .join('');

    const axisLines = `
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + innerH}" stroke="#646669" stroke-width="0.5" opacity="0.4"/>
      <line x1="${pad.left}" y1="${pad.top + innerH}" x2="${pad.left + innerW}" y2="${pad.top + innerH}" stroke="#646669" stroke-width="0.5" opacity="0.4"/>`;

    return `<svg viewBox="0 0 ${W} ${H}" class="ape-chart-svg" xmlns="http://www.w3.org/2000/svg">
  ${axisLines}
  ${polylines}
  ${yLabels}
</svg>`;
  }
}
