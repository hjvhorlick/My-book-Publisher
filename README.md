# Folio & Quill — Book Publishing Studio

A full-stack writing and publishing app built with React, Vite, Express, and SQLite. Authors choose a book category and visual template, plan a chapter Index, write in per-page editors, and export a manuscript.

## Current workflow

1. **Start** — choose one of six categories: Photo Book, Cookbook, Magazine, Children’s Picture Book, How-To & Guide, or Story / Memoir / Chapter Book.
2. **Style** — choose from eight visual templates in the selected category. The style is applied automatically; page layout choices do not require manual typesetting.
3. **Index** — plan 5, 10, 20, or 30 chapter entries. The chapter title entered on the first writing page supplies its Index label.
4. **Pages** — each chapter contains one or more pages. Next Page adds a page to the current chapter; Delete Page keeps at least one page and preserves the chapter. The designed page itself stays clean: every text block shows the author's words exactly as they will print, with one small **Edit** button (including a tiny fit counter, e.g. `18/36`). All tools live inside the editor that the button opens.
5. **Export** — preview and download the manuscript as DOCX, PDF, EPUB 3, or a JSON archive.

## Writing and AI

### One editor per block, sized to its space

Every text area in every template has a recorded **slot rule** (`src/data/slotRules.js`): the kind of writing it holds, how many lines the design gives it, its ideal word range, and its hard maximum. The rules were audited across all 48 templates and five page structures (text blocks use 1–13 lines; image frames use eleven recorded frame sizes) and are the single source of truth shared by the editor, the AI prompts, the stock-photo search, and the image cropper.

Pressing a block's **Edit** button opens a professional document editor with a grouped toolbar (undo/redo, paragraph styles where they make sense, bold/italic/underline/strikethrough, lists, alignment, text colour, clear formatting) over a clean paper surface. A live **fit metre** shows how full the space is; long pastes are shortened to the remaining budget; **Trim to fit** repairs over-limit text; and the editor will not place more words on the page than the block's space holds. Changes are applied only on **Done** (or discarded with Cancel/Esc), then autosaved.

### AI that writes to fit

- Inside the editor, **Write with AI** prepares a field-specific prompt using book, chapter outline and guidance, page, category, selected template, current-field context — and the block's ideal word range, so drafts fill the space instead of overflowing it. **Improve my wording**, **Make it fit**, and **Fix spelling & grammar** revise the current text under the same limit. The server also trims generated output to the block maximum. Authors always review a suggestion before using it.
- Configure Gemini from the header: get a key through Google AI Studio, paste it into the settings window, optionally discover available models, save, then run the connection test. Gemini is the recommended setup path; the default model is `gemini-3.8-flash`.
- Keys are encrypted at rest and never returned to the browser. Additional configured providers can be used as fallbacks. Usage totals reflect provider-reported token counts. Model availability, quotas, pricing, and rate limits depend on the provider account and can change; the app does not promise a free quota or estimate costs.
- The Gemini connection test makes a real provider request when used. Automated tests mock provider responses; they do not verify a live key or provider availability.

## Stock image search

- Add a Pexels key, a Pixabay key, or both from the header’s **API keys** settings. The keys are encrypted at rest with the same server-side credential encryption used for AI providers; they are never sent to browser code or returned by the settings API.
- Use **Stock photos** on a page image slot to search either provider or both. The search is told the frame's shape (a portrait frame searches for portrait photos) and results are badged by how well they fit. Choosing a result downloads it into the current book’s asset library, then opens the built-in image editor. The saved asset includes the provider source page, creator credit, alt text, and a stock-provider license review marker.

## Image editing

- Every photo frame has a rule on record: aspect ratio, orientation, recommended print size, and minimum usable resolution. Uploads, stock downloads, and **Edit image** on an existing photo all open the frame-fitting editor: drag to centre the picture in a crop window locked to the frame's shape, zoom, turn by 90° steps, mirror, and adjust brightness, contrast, and colour strength. The saved photo is exported at the frame's recommended print size, with a warning when a source picture is small for its frame.

## Clean published pages

- Editor chrome never reaches the reader. The Step 5 preview and all downloads render the book only: the author's words, the placed images with their captions, page numbers, and Index links to each chapter. Builder labels (layout names, editing footers, word counters, production notes such as illustration briefs) are excluded everywhere.
- **DOCX** — clickable Contents entries linked to chapter Bookmarks, centred page-number footer (`PAGE` field), embedded page photos with captions.
- **PDF** — Index with internal `GoTo` links to named chapter destinations (and a back-to-Index link per chapter), printed page numbers, embedded page photos. Damaged PNGs are validated and skipped rather than failing the export.
- **EPUB 3** — navigation document plus a clickable in-book Index linking to chapter anchors, chapter photos embedded with captions and alt text. (Reflowable e-books have no fixed page numbers by format design; reading systems number locations themselves.)
- **JSON** remains a complete backup archive of the project (not a reader-facing format).
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

Tests cover the six category prompt profiles, the slot-rule registry for every field and frame, fit enforcement and crop geometry, the Edit-button page workflow, clean previews, clean exports (embedded photos, linked Indexes, page numbers, excluded production notes), legacy-page migration and preservation, nested chapter pages, encrypted AI and image-provider routes, mocked Pexels/Pixabay search and asset import metadata, all 48 visual templates, and all five page structures per template.

## Credential and database configuration

- `DB_PATH` — SQLite database location (default: `./data/publisher.db`).
- `AI_CREDENTIAL_ENCRYPTION_KEY` — stable, high-entropy key for production AI and image-provider credential encryption. Configure and back it up securely before storing production API keys.
- `AI_CREDENTIAL_KEY_FILE` — optional path for the local development encryption-key file.
- `PORT` — HTTP port (default: `3000`).

Gemini keys are available from [Google AI Studio](https://aistudio.google.com/app/apikey). Review the provider’s current [model](https://ai.google.dev/gemini-api/docs/models) and [pricing](https://ai.google.dev/gemini-api/docs/pricing) details before use.
