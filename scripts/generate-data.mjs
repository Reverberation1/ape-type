// Generates src/data/words.ts and src/data/quotes.ts from the raw Monkey Type JSON files.
// Run with: node scripts/generate-data.mjs
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "../src/data");

// --- Words ---
const wordsRaw = JSON.parse(readFileSync(join(dataDir, "english_words_raw.json"), "utf-8"));
writeFileSync(
  join(dataDir, "words.ts"),
  `// Auto-generated from Monkey Type english.json — do not edit by hand.\nexport const englishWords: string[] = ${JSON.stringify(wordsRaw.words)};\n`
);
console.log(`Words: ${wordsRaw.words.length} entries written.`);

// --- Quotes ---
// Take up to 200 quotes per length group to keep bundle size reasonable.
const quotesRaw = JSON.parse(readFileSync(join(dataDir, "english_quotes_raw.json"), "utf-8"));
const groups = quotesRaw.groups; // [[0,100],[101,300],[301,600],[601,9999]]

const selected = groups.flatMap(([min, max]) =>
  quotesRaw.quotes
    .filter((q) => q.length >= min && q.length <= max)
    .map(({ text, source, length, id }) => ({ text, source, length, id }))
);

writeFileSync(
  join(dataDir, "quotes.ts"),
  `// Auto-generated from Monkey Type english quotes — do not edit by hand.\nimport type { Quote } from "../types";\nexport const englishQuotes: Quote[] = ${JSON.stringify(selected)};\nexport const quoteGroups: [number, number][] = ${JSON.stringify(groups)};\n`
);
console.log(`Quotes: ${selected.length} entries written (from ${quotesRaw.quotes.length} total).`);
