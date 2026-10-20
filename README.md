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
- **Themes** — Dark (default), Light, Nord, Dracula, Gruvbox Dark, Gruvbox Light
- **Caps Lock indicator** — visible warning when Caps Lock is active
- **Mobile support** — virtual keyboards on Android / iOS work correctly
- Keyboard-first: **Tab** restarts the test from anywhere

---

## Installation

Ape Type is not yet listed in the Obsidian community plugins directory, and no pre-built release has been published yet, so install it by building from source.

**Requirements:** Node.js 18+, npm, git

1. Clone and build:
   ```bash
   git clone https://github.com/Reverberation1/ape-type.git
   cd ape-type
   npm install
   npm run build:fast
   ```
   This produces `main.js` in the repo root (it is not committed to git, so this step is required).
2. Create the folder `<your vault>/.obsidian/plugins/ape-type/` and copy `main.js`, `manifest.json`, and `styles.css` into it. The `.obsidian` folder is hidden by default — enable "show hidden files" in your file manager, or copy from a terminal:
   ```bash
   mkdir -p "/path/to/vault/.obsidian/plugins/ape-type"
   cp main.js manifest.json styles.css "/path/to/vault/.obsidian/plugins/ape-type/"
   ```
3. Restart Obsidian (or reload it), open **Settings → Community plugins**, turn community plugins on if they are currently restricted, and enable **Ape Type**.

To update, `git pull`, rebuild, and copy `main.js` and `styles.css` over again.

---

## Usage

### Dedicated tab
Open the command palette (`Ctrl/Cmd+P`) and run **Ape Type: Open typing test**. The test loads immediately — start typing to begin.

Punctuation, numbers, difficulty, and the test length are chosen from the toolbar above the test.

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
- Smooth caret animation
- Theme (Dark / Light / Nord / Dracula / Gruvbox Dark / Gruvbox Light)

---

## Development

**Requirements:** Node.js 18+, npm

Clone the repo, then run `npm i` to install dependencies.

| Command | Description |
|---------|-------------|
| `npm run build:fast` | Production bundle → `main.js` |
| `npm run build` | Type-check then bundle |
| `npm run dev` | Watch mode |
| `npm test` | Run test suite (vitest) |
| `npm run generate-data` | Re-fetch word/quote data from the Monkey Type repo |

To test in Obsidian, open the `test-vault/` directory as a vault — the plugin is already enabled there, but the build writes `main.js` to the repo root, so copy it in after each build:

```bash
npm run build:fast && cp main.js styles.css manifest.json test-vault/.obsidian/plugins/ape-type/
```

---

## Acknowledgements

Word list and quote dataset sourced from [monkeytypegame/monkeytype](https://github.com/monkeytypegame/monkeytype).
