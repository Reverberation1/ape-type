import type { TestResult, PersonalBest, PluginData } from './types';

export class StatsManager {
  private data: PluginData;

  constructor(data: PluginData) {
    this.data = data;
  }

  getData(): PluginData {
    return this.data;
  }

  addResult(result: TestResult): boolean {
    this.data.history.unshift(result);
    if (this.data.history.length > 1000) {
      this.data.history = this.data.history.slice(0, 1000);
    }
    return this.updatePersonalBest(result);
  }

  private updatePersonalBest(result: TestResult): boolean {
    const key = pbKey(result);
    const existing = this.data.personalBests[key];
    if (!existing || result.wpm > existing.wpm) {
      this.data.personalBests[key] = {
        wpm: result.wpm,
        accuracy: result.accuracy,
        consistency: result.consistency,
        timestamp: result.timestamp,
      };
      return true;
    }
    return false;
  }

  getPersonalBest(result: TestResult): PersonalBest | undefined {
    return this.data.personalBests[pbKey(result)];
  }

  getHistory(): TestResult[] {
    return this.data.history;
  }

  clearHistory(): void {
    this.data.history = [];
  }

  getWeakChars(
    limit = 50,
    minRate = 0,
  ): { char: string; attempts: number; errors: number; rate: number }[] {
    const totAttempts: Record<string, number> = {};
    const totErrors: Record<string, number> = {};
    for (const r of this.data.history.slice(0, limit)) {
      if (!r.charAttempts) continue;
      for (const [ch, n] of Object.entries(r.charAttempts)) {
        totAttempts[ch] = (totAttempts[ch] ?? 0) + n;
      }
      for (const [ch, n] of Object.entries(r.charErrors ?? {})) {
        totErrors[ch] = (totErrors[ch] ?? 0) + n;
      }
    }
    return Object.keys(totAttempts)
      .filter((ch) => totAttempts[ch] >= 10)
      .map((ch) => ({
        char: ch,
        attempts: totAttempts[ch],
        errors: totErrors[ch] ?? 0,
        rate: (totErrors[ch] ?? 0) / totAttempts[ch],
      }))
      .filter((e) => e.rate >= minRate)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);
  }

  getWeakWords(limit = 50): string[] {
    const totals: Record<string, number> = {};
    for (const r of this.data.history.slice(0, limit)) {
      if (!r.wordErrors) continue;
      for (const [w, n] of Object.entries(r.wordErrors)) {
        totals[w] = (totals[w] ?? 0) + n;
      }
    }
    return Object.keys(totals)
      .sort((a, b) => totals[b] - totals[a])
      .slice(0, 20);
  }

  getProgressByMode(limitPerMode = 30): Record<string, { wpm: number; accuracy: number; timestamp: number }[]> {
    // history is newest-first; collect up to limitPerMode per group, then reverse for charting
    const groups: Record<string, { wpm: number; accuracy: number; timestamp: number }[]> = {};
    for (const r of this.data.history) {
      const key = `${r.mode} ${r.modeValue} ${r.difficulty}`;
      if (!groups[key]) groups[key] = [];
      if (groups[key].length < limitPerMode) {
        groups[key].push({ wpm: r.wpm, accuracy: r.accuracy, timestamp: r.timestamp });
      }
    }
    const result: Record<string, { wpm: number; accuracy: number; timestamp: number }[]> = {};
    for (const [key, entries] of Object.entries(groups)) {
      if (entries.length >= 3) {
        result[key] = entries.slice().reverse(); // oldest → newest
      }
    }
    return result;
  }
}

function pbKey(r: TestResult): string {
  return `${r.mode}_${r.modeValue}_${r.difficulty}`;
}

export function emptyPluginData(): PluginData {
  return { history: [], personalBests: {} };
}

export function calcConsistency(wpmHistory: number[]): number {
  if (wpmHistory.length < 2) return 100;
  const mean = wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length;
  if (mean === 0) return 100;
  const variance = wpmHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / wpmHistory.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.round(Math.max(0, Math.min(100, (1 - cv) * 100)));
}
