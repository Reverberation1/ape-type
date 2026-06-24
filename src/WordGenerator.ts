export interface GenerateOptions {
  punctuation: boolean;
  numbers: boolean;
}

const TRAIL_PUNCT = [',', ',', ',', '.', '.', '!', '?', ';', ':'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateWords(
  wordList: string[],
  count: number,
  opts: GenerateOptions
): string[] {
  const result: string[] = [];
  let capitalize = false;

  for (let i = 0; i < count; i++) {
    let word = pick(wordList);

    if (opts.numbers && Math.random() < 0.15) {
      word = String(randInt(0, 9999));
    } else {
      if (capitalize) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
        capitalize = false;
      }

      if (opts.punctuation) {
        if (Math.random() < 0.18) {
          const p = pick(TRAIL_PUNCT);
          word += p;
          if (p === '.' || p === '!' || p === '?') capitalize = true;
        } else if (Math.random() < 0.04) {
          word = "'" + word + "'";
        }
      }
    }

    result.push(word);
  }
  return result;
}

export function wordsFromText(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

export function generateImprovementWords(
  wordList: string[],
  count: number,
  weakChars: string[],
  weakWords: string[]
): string[] {
  if (weakChars.length === 0 && weakWords.length === 0) {
    return generateWords(wordList, count, { punctuation: false, numbers: false });
  }

  const weakCharSet = new Set(weakChars);
  const weakWordSet = new Set(weakWords.slice(0, 20).filter((w) => wordList.includes(w)));

  // Score: base 1 + 3 per distinct weak char present; weak words override to min score 8
  const scores = wordList.map((w) => {
    const distinctWeak = new Set([...w].filter((ch) => weakCharSet.has(ch))).size;
    const base = 1 + distinctWeak * 3;
    return weakWordSet.has(w) ? Math.max(base, 8) : base;
  });

  const total = scores.reduce((sum, s) => sum + s, 0);
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    let threshold = Math.random() * total;
    let chosen = wordList[wordList.length - 1];
    for (let j = 0; j < wordList.length; j++) {
      threshold -= scores[j];
      if (threshold <= 0) {
        chosen = wordList[j];
        break;
      }
    }
    result.push(chosen);
  }
  return result;
}
