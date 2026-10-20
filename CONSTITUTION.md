# Ape Type — Constitution

## Mission

An Obsidian plugin providing an in-editor typing speed test — a Monkey Type clone that runs entirely inside Obsidian. Lets users practice typing without leaving their vault.

## Tech Stack

| Layer | Choice | Role |
|-------|--------|------|
| Language | TypeScript 5.x | Plugin runtime |
| Package manager | npm | Dependencies |
| Build (dev) | esbuild (fast) | `npm run build:fast` — ~340 KB, no type check |
| Build (release) | esbuild (full) | `npm run build` — includes type check |
| Testing | vitest | Unit tests for pure logic |
| Data generation | `scripts/generate-data.mjs` | Word lists + quotes — never hand-edit |

## Architecture Invariants

- **Pure logic layer** (`TypingEngine`, `WordGenerator`, `StatsManager`) must have zero Obsidian imports — fully unit-testable in isolation.
- **Obsidian layer** (`ApeTypeView`, `SettingsTab`, `main.ts`) handles all plugin lifecycle and DOM.
- **`main.js` is tracked in git** — Obsidian loads it directly; this is intentional.
- **WPM formulas must match Monkey Type exactly:**
  - WPM = correct chars / 5 / elapsed minutes
  - Raw WPM = all non-backspace keystrokes / 5 / elapsed minutes
  - Accuracy = correct keystrokes / total keystrokes
  - Consistency = 100 − (stdDev / mean × 100)

## Non-Goals

- Online leaderboards or account sync
- Custom theme editor
- Multiplayer or head-to-head mode
- Any dependency on external APIs
