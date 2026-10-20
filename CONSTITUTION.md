# Ape Type — Constitution

<!-- gate: approved 2026-10-20 -->

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
- **`main.js` is a build artifact, not tracked in git** (gitignored, including the `test-vault/` copy). Users get it from GitHub release assets or by building from source; the tag and `manifest.json` version must match.
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

## Grandfathered Features

Built before this charter (v1.0.0–v1.4.0, June 2026), outside the `features/NN-name/` workflow. They are accepted as-is; any change to them goes through the feature workflow.

- **v1.0.0 core** — time/words/quote modes, punctuation and numbers modifiers, normal/expert/master difficulty, live stats bar, results screen with WPM chart, personal bests, history log
- **BK-001 full-quote-library** — all 6,488 Monkey Type english quotes bundled
- **BK-002 history-screen** — personal bests + recent results list
- **BK-004 theme-selector** — Dark, Light, Nord, Dracula
- **BK-007 zen-mode** — no timer / live WPM
- **BK-012 repeat-quote-button** — retype the same quote
- **BK-014 mobile-keyboard-support** — `input`-event handling for virtual keyboards
- **BK-015 note-embed** — ` ```ape-type ``` ` code block
- **BK-016 history-progress-chart** — multi-line WPM-over-time chart
- **BK-017 analytics-section** — per-character accuracy bars and summary stats
- **BK-018 improvement-mode** — weighted word pool from weak chars/words
- **BK-019 gruvbox-themes** — Gruvbox Dark and Gruvbox Light
