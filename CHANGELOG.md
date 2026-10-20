# Ape Type — Changelog

## [1.4.0 release housekeeping] — 2026-10-20

Repo, docs and config changes made while publishing the first GitHub release (tag `1.4.0`). No plugin code changed; the released `main.js` is functionally the 1.4.0 build described below.

### Dependencies
- **Pinned `obsidian` devDependency to `1.13.1` (BK-021):** it was `"latest"`, so each fresh clone resolved whatever was newest and type-checking could change with no change to this repo. 1.13.1 is the version already locked and tested; upgrade deliberately.

### Changed
- **Version metadata and first GitHub release (BK-020):** `manifest.json` and `package.json` bumped from 1.0.0 to 1.4.0 so they match this changelog. Obsidian (and tools like BRAT) read the manifest version, so a release tagged `1.4.0` needed it to agree. README now offers the release download again, with build-from-source as the alternative. The plugin code is the same as 1.4.0; everything below is docs/config.
- **Charter approved:** `CONSTITUTION.md` stamped approved and lists the features built before it as grandfathered, so new features can enter the workflow. Its "`main.js` is tracked in git" invariant was false (`main.js` is gitignored) and now states the real policy.
- **Stopped tracking `test-vault/.obsidian/plugins/ape-type/main.js`:** it was force-added despite `.gitignore` and had already drifted from the real build. The local copy stays; rebuild and copy it in as the README describes.

### Fixed
- **Type-check:** `tsconfig.json` now sets `skipLibCheck: true`. `obsidian@1.13.1`'s own `.d.ts` fails to compile (`Menu`/`Modal`/`PopoverSuggest` don't implement `HistoryHandler.onHistoryBack`), so bare `tsc` and editors reported 3 errors even though `npm run build` already passed `--skipLibCheck`. Config and build script now agree.
- **README install instructions:** the "download the latest release" path pointed at a releases page with no releases, and the test vault was described as ready-to-run although `main.js` is gitignored and the build writes it to the repo root. Installation is now build-from-source with the copy step spelled out. Also corrected the command name (**Open typing test**), added the Gruvbox themes, and removed settings the settings tab doesn't have (punctuation/numbers/difficulty live in the toolbar).

## [1.4.0] — 2026-06-25

### Added
- **Gruvbox themes (BK-019):** Two new colour schemes in Settings → Theme: Gruvbox Dark (bg `#282828`, yellow accent `#d79921`, cream text) and Gruvbox Light (bg `#fff9d4`, muted tan dividers `#e2d9b3`, ochre accent `#d49d26`, dark brown text). Light palette colours supplied by user; dark palette uses the canonical Gruvbox Dark set.

## [1.3.0] — 2026-06-24

### Added
- **Full quote library (BK-001):** All 6 488 Monkey Type english quotes are now bundled (previously capped at 200/group, 787 total). Quote pool: 904 short, 3 797 medium, 1 599 long, 188 thicc.
- **Theme selector (BK-004):** Four colour themes available in Settings → Ape Type: Dark (default), Light, Nord, Dracula. Theme is persisted and applied immediately to any open tab view when changed.
- **Zen mode (BK-007):** New "zen" toolbar mode — no live WPM or timer shown during the test. Uses a word-count word pool (same 10/25/50/100 options). Tab still restarts; results are saved to history normally.
- **Repeat quote button (BK-012):** After finishing a quote test, a "repeat quote" button appears in the results actions row. Clicking it restarts with the exact same quote so you can practise it again.
- **Mobile keyboard support (BK-014):** Character input is now processed via the `input` event (`InputEvent.data` / `InputEvent.inputType`) instead of relying solely on `keydown`. Virtual keyboards on Android/iOS that fire `keydown` with `key: 'Unidentified'` now work correctly. Tab and Backspace retain their `keydown` handlers for reliability on desktop.

### Changed
- `getWeakChars` gains an optional `minRate` parameter (default `0`); improve mode now passes `minRate = 0.10` so characters the user has recently mastered drop off the targeting list promptly.

## [1.2.0] — 2026-06-24

### Added
- **History progress chart (BK-016):** Multi-line SVG chart in the history panel showing WPM over time. One coloured line per mode (up to 5), using a shared WPM scale so you can compare improvement across modes at a glance. Only modes with 3+ tests are shown. Legend below the chart identifies each line.
- **Analytics section (BK-017):** New section in history showing: summary stat cards (avg WPM / consistency / most-missed char over last 10 tests), and horizontal accuracy bars for up to 8 most error-prone characters (with error count and rate). Bars only appear once enough data accumulates (≥10 attempts per character).
- **Improvement mode (BK-018):** New "improve" mode in the toolbar. Generates a word-count-based test (10/25/50/100 words) with a weighted pool biased toward words containing your most-missed characters and toward specific words you've previously failed. Shows a "focusing on: …" hint during the test. Results are saved to history as mode `improve`.

### Changed
- `TypingEngine` now tracks `charAttempts`, `charErrors`, and `wordErrors` per test and includes them in `buildResult()`. Optional fields on `TestResult` for backward compatibility.
- `StatsManager` gains three aggregation methods: `getWeakChars()`, `getWeakWords()`, `getProgressByMode()`.
- `WordGenerator` gains `generateImprovementWords()` with weighted random selection.

## [1.1.0] — 2026-06-24

### Fixed
- **UI freeze (crash):** `updateWordStates` used `querySelectorAll` which returns a static NodeList — `letterEls.length` was frozen at the initial value so the grow-loop ran forever the moment a user overtyped past the end of a word. Replaced with `childElementCount` which is a live property.
- **Results keydown stacking:** Each call to `showResults` was adding a new `keydown` listener to `resultsEl` without removing the previous one. Multiple Tab/Enter presses or rapid test restarts caused stacked listeners to all fire. Now tracked in `_resultsKeyHandler` and replaced on each call.
- **Flash restart timeout leak:** `flashRestart` setTimeout could fire after the view was closed and call `startNewTest` on a torn-down engine. The handle is now stored and cleared in `onunload`.

### Added
- **History screen (BK-002):** Click "history" in the toolbar to see personal bests (all modes, grouped as cards) and a table of the 50 most recent results. Tab or the "close" button returns to typing.
- **Note embed (BK-015):** Add a fenced ` ```ape-type ``` ` code block to any note to embed a live typing test inline. Optional settings: `mode: time|words|quote`, `time: 15|30|60|120`, `words: 10|25|50|100`, `length: short|medium|long|thicc`. The embed shares history/PBs with the main tab view. Lifecycle is tied to the note via `MarkdownRenderChild` so no intervals leak when the note is closed.

### Changed
- Extracted all view/engine logic into `ApeTypeWidget extends Component` so it can be shared between the dedicated tab view and note embeds. `ApeTypeView` is now a thin wrapper.

## [1.0.0] — 2026-06-21

### Added
- Initial release of Ape Type, a Monkey Type-inspired typing speed test for Obsidian.
- **Time mode** — 15 / 30 / 60 / 120-second tests with live countdown.
- **Words mode** — 10 / 25 / 50 / 100-word tests with elapsed timer.
- **Quote mode** — Short / medium / long / thicc quotes sourced from the official Monkey Type english quote dataset (787 quotes bundled).
- **Word list** — 200-word English list sourced directly from Monkey Type's `english.json`.
- **Punctuation modifier** — injects commas, periods, and sentence-ending punctuation into word tests.
- **Numbers modifier** — randomly replaces ~15 % of words with numbers.
- **Difficulty modes** — Normal, Expert (any word error → restart on space), Master (any keypress error → instant restart).
- **Live stats bar** — real-time WPM and countdown / elapsed timer while typing.
- **Results screen** — WPM, raw WPM, accuracy, consistency, character counts, mode label, WPM + raw WPM line chart.
- **Personal best tracking** — per-mode/value/difficulty PBs persisted in plugin data.
- **Full history log** — up to 1 000 past results stored in plugin data.
- **Smooth caret** — CSS-animated caret that follows the current typing position.
- **Keyboard-first UX** — Tab restarts the test; hidden input captures all keystrokes without interfering with Obsidian hotkeys.
- **Caps Lock indicator** — visible warning when Caps Lock is active.
- Unit tests covering TypingEngine, WordGenerator, and StatsManager (vitest).
