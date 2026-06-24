# Ape Type

A [Monkey Type](https://monkeytype.com)-inspired typing speed test built as an Obsidian plugin. Run tests in a dedicated tab or embed one inline in any note.

---

## Features

### Modes
| Mode | Description |
|------|-------------|
| **Time** | Type as many words as possible within 15 / 30 / 60 / 120 seconds |
| **Words** | Complete a set of 10 / 25 / 50 / 100 words |
| **Quote** | Type a random quote (short / medium / long / thicc) from the Monkey Type english dataset (6,488 quotes) |
| **Improve** | Weighted word pool biased toward characters and words you've previously struggled with |
| **Zen** | No timer, no live WPM — distraction-free typing |

### Modifiers & difficulty
- **Punctuation** — adds commas, periods, and sentence-ending punctuation to word tests
- **Numbers** — replaces ~15% of words with numbers
- **Normal** — standard scoring
- **Expert** — any word error causes an instant restart on spacebar
- **Master** — any keypress error causes an instant restart

### Stats & history
- Live WPM, raw WPM, accuracy, and timer while typing
- Results screen with WPM / raw WPM line chart, character counts, and consistency score
- Personal bests tracked per mode / value / difficulty combination
- Full history log (up to 1,000 results) with multi-line progress chart and per-character accuracy analytics

### Other
- **Note embed** — render a live typing test inside any note with a fenced code block
- **Themes** — Dark (default), Light, Nord, Dracula
- **Caps Lock indicator** — visible warning when Caps Lock is active
- **Mobile support** — virtual keyboards on Android / iOS work correctly
- Keyboard-first: **Tab** restarts the test from anywhere

---

## Installation

Ape Type is not yet listed in the Obsidian community plugins directory. Install it manually:

1. Download the [latest release](https://github.com/Reverberation1/ape-type/releases) (`main.js`, `manifest.json`, `styles.css`).
2. Copy the three files into your vault at `.obsidian/plugins/ape-type/`.
3. In Obsidian go to **Settings → Community plugins**, enable **Ape Type**.

Or clone this repo and [build from source](#development) — the test vault at `test-vault/` is already configured and ready to open.

---

## Usage

### Dedicated tab
Open the command palette (`Ctrl/Cmd+P`) and run **Ape Type: Open**. The test loads immediately — start typing to begin.

### Note embed
Add a fenced ` ```ape-type ``` ` code block to any note:

````markdown
```ape-type
mode: time
time: 30
```
````

Supported options:

| Key | Values | Default |
|-----|--------|---------|
| `mode` | `time` `words` `quote` | `time` |
| `time` | `15` `30` `60` `120` | `30` |
| `words` | `10` `25` `50` `100` | `25` |
| `length` | `short` `medium` `long` `thicc` | `medium` |

All embeds share history and personal bests with the main tab view.

### Keyboard shortcuts
| Key | Action |
|-----|--------|
| `Tab` | Restart test / close results |
| `Enter` | Confirm results (same as Tab) |

---

## Settings

Open **Settings → Ape Type** to configure defaults:

- Default mode, time limit, word count, and quote length
- Punctuation and numbers toggles
- Difficulty (Normal / Expert / Master)
- Smooth caret animation
- Theme (Dark / Light / Nord / Dracula)

---

## Development

**Requirements:** Node.js 18+, npm

Clone the repo, then run `npm i` to install dependencies.

| Command | Description |
|---------|-------------|
| `npm run build:fast` | Production bundle → `main.js` |
| `npm run build` | Type-check then bundle |
| `npm run dev` | Watch mode |
| `npm test` | Run test suite (vitest, 46 tests) |
| `npm run generate-data` | Re-fetch word/quote data from the Monkey Type repo |

To test in Obsidian, open the `test-vault/` directory as a vault — the plugin is already installed and enabled.

---

## Acknowledgements

Word list and quote dataset sourced from [monkeytypegame/monkeytype](https://github.com/monkeytypegame/monkeytype).
