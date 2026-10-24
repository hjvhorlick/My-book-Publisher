# Folio & Quill — Book Publishing Studio

A full-stack writing and publishing app built with React, Vite, Express, and SQLite. Authors choose a book category and visual template, plan a chapter Index, write in per-page editors, and export a manuscript.

## Current workflow

1. **Start** — choose one of six categories: Photo Book, Cookbook, Magazine, Children’s Picture Book, How-To & Guide, or Story / Memoir / Chapter Book.
2. **Style** — choose from eight visual templates in the selected category. The style is applied automatically; page layout choices do not require manual typesetting.
3. **Index** — plan 5, 10, 20, or 30 chapter entries. The chapter title entered on the first writing page supplies its Index label.
4. **Pages** — each chapter contains one or more pages. Next Page adds a page to the current chapter; Delete Page keeps at least one page and preserves the chapter. Every template uses the same rich-text editor and offers five page structures.
5. **Introduction page** — beside Chapter pages, the writing studio offers a full-page Introduction editor for the author's words of expression, dedications, and opening notes. The page uses the chosen template's palette, heading treatment, and border, supports the same rich-text toolbar and Write with AI, and is saved on the project. Exports place it first among the front sections (before Dedication/Epigraph), in DOCX, PDF, and EPUB.
6. **Book cover** — also beside Chapter pages, the cover designer composes the cover: a background image (upload, asset library, free sample artwork, or stock photos, with a dim slider) plus word art of the book name. Word art defaults to outline-only letters — no background behind them, just a narrow border around each letter — with controls for border colour and width and an optional solid-fill mode. Editable sections cover the short wording from the author and the author's name, and an optional author photo is a yes/no choice. The cover preview follows the book's template theme and trim size and appears in the Export preview's Front Cover reader; cover settings persist as sibling keys in `coverConfig`.
7. **Export** — preview the front cover, Introduction, and Chapter Index, then download the manuscript as DOCX, PDF, EPUB 3, or a JSON archive.

## Writing and AI

- Page fields support rich-text formatting and paste, with field-level word counts and autosave.
- When a provider is configured, **Write with AI** prepares a field-specific prompt using book, chapter outline and guidance, page, category, selected template, and current-field context. Authors review the result before inserting it.
- Configure Gemini from the header: get a key through Google AI Studio, paste it into the settings window, optionally discover available models, save, then run the connection test. Gemini is the recommended setup path; the default model is `gemini-3.8-flash`.
- Keys are encrypted at rest and never returned to the browser. Additional configured providers can be used as fallbacks. Usage totals reflect provider-reported token counts. Model availability, quotas, pricing, and rate limits depend on the provider account and can change; the app does not promise a free quota or estimate costs.
- The Gemini connection test makes a real provider request when used. Automated tests mock provider responses; they do not verify a live key or provider availability.

## Stock image search

- Add a Pexels key, a Pixabay key, or both from the header’s **API keys** settings. The keys are encrypted at rest with the same server-side credential encryption used for AI providers; they are never sent to browser code or returned by the settings API.
- Use **Stock photos** on a page image slot to search either provider or both. Choosing a result downloads it into the current book’s asset library, then applies it to the page. The saved asset includes the provider source page, creator credit, alt text, and a stock-provider license review marker.
- The app does not claim that a live provider key or network connection has been verified until you run its test. Automated tests mock Pexels and Pixabay responses; this restricted sandbox cannot reach those provider hosts.

## Development

### Requirements

- Node.js 22 or newer (the server uses `node:sqlite`)

### Run locally

```bash
npm install
npm run dev
```

The server listens on port `3000` by default. Set `PORT` to use another port.

### Build and tests

```bash
npm test
npm run build
```

Tests cover the six category prompt profiles, legacy-page migration and preservation, nested chapter pages, exports, the Introduction page and book-cover design persistence, encrypted AI and image-provider routes, mocked Pexels/Pixabay search and asset import metadata, all 48 visual templates, and all five page structures per template.

## Credential and database configuration

- `DB_PATH` — SQLite database location (default: `./data/publisher.db`).
- `AI_CREDENTIAL_ENCRYPTION_KEY` — stable, high-entropy key for production AI and image-provider credential encryption. Configure and back it up securely before storing production API keys.
- `AI_CREDENTIAL_KEY_FILE` — optional path for the local development encryption-key file.
- `PORT` — HTTP port (default: `3000`).

Gemini keys are available from [Google AI Studio](https://aistudio.google.com/app/apikey). Review the provider’s current [model](https://ai.google.dev/gemini-api/docs/models) and [pricing](https://ai.google.dev/gemini-api/docs/pricing) details before use.
