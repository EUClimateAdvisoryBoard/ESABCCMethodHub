# ESABCC Reference Manager

A desktop reference management application for the European Scientific Advisory Board on Climate Change (ESABCC) reference library. Built with Electron, designed as a Word Add-in companion similar to Zotero or Mendeley.

## Features

- **Reference Library**: Browse, search, and filter 2600+ climate policy references
- **Full-text Search**: Search across titles, authors, journals, DOIs, and citations
- **Filters**: Filter by publication type, year range, and author
- **Annotations**: Add notes and annotations to any reference (stored locally in SQLite)
- **Collections**: Organise references into named collections
- **Word Integration**: Copy citations and references to clipboard for pasting into Word
  - Inline citation format: `(Author et al., Year)`
  - Full EEA-formatted citation
  - Bibliography builder with sorted output
- **Similar Papers**: Query the Semantic Scholar API to discover related work
- **Password Protection**: Simple login screen (password: `ESABCC192168`)

## Prerequisites

- Node.js 18 or later
- npm

## Setup

```bash
cd word-addin-app

# Install dependencies
npm install

# Export references from the main project's TypeScript source
npm run export-refs

# Launch the application
npm start
```

Or use the combined setup command:

```bash
npm run setup && npm start
```

## Project Structure

```
word-addin-app/
  main.js             Electron main process
  preload.js          Context bridge (main <-> renderer)
  package.json        Dependencies and scripts
  renderer/
    index.html        Application UI
    app.js            Renderer process logic
    styles.css        Scandinavian minimal design
  scripts/
    export-refs.js    Converts references.ts to references.json
  data/
    references.json   Exported reference data (generated)
```

## Usage

1. Launch the app and sign in with the password.
2. Browse or search the reference library in the Library tab.
3. Click a reference to open the detail panel on the right.
4. Use "Insert Citation" to copy `(Author, Year)` to your clipboard, then paste into Word.
5. Use "Insert Full Reference" to copy the complete formatted citation.
6. Add references to the Bibliography tab, then copy the sorted bibliography.
7. Use the Similar Papers tab to discover related work via Semantic Scholar.
8. Create Collections to organise references by topic or project.

## Data Storage

- References are loaded from `data/references.json` (read-only).
- Annotations, tags, and collections are stored in a SQLite database in the Electron user data directory.

## Technology

- Electron 33
- better-sqlite3 for local annotation storage
- Semantic Scholar API for related paper discovery
- No frameworks; vanilla HTML/CSS/JS for minimal footprint
