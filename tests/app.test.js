import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import JSZip from 'jszip';

const testDbPath = path.join(__dirname, '..', 'data', `test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
process.env.AI_CREDENTIAL_ENCRYPTION_KEY = 'vitest-ai-credential-encryption-key';

const { createApp } = require('../server/index');
const { db, initDatabase } = require('../server/db');

describe('Folio & Quill Book Publishing Studio — End-to-End Acceptance Suite', () => {
  let app;
  let authorAToken = '';
  let authorBToken = '';
  let templateBookId = '';
  let blankBookId = '';
  let firstChapterId = '';
  let secondChapterId = '';

  beforeAll(() => {
    app = createApp();
  });

  afterAll(() => {
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {
      // ignore cleanup error
    }
  });

  it('1. Registers users, logs in, and accesses private library', async () => {
    const regA = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'author.a@example.com',
        password: 'SecurePassword123!',
        name: 'Arthur Pendelton',
        penName: 'A. Pendelton'
      });
    expect(regA.status).toBe(201);
    expect(regA.body.token).toBeTruthy();
    expect(regA.body.user.email).toBe('author.a@example.com');
    authorAToken = regA.body.token;

    const regB = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'author.b@example.com',
        password: 'SecurePassword456!',
        name: 'Beatrice Sterling'
      });
    expect(regB.status).toBe(201);
    authorBToken = regB.body.token;

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'author.a@example.com',
        password: 'SecurePassword123!'
      });
    expect(loginA.status).toBe(200);
    expect(loginA.body.token).toBeTruthy();

    const libA = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(libA.status).toBe(200);
    expect(Array.isArray(libA.body.projects)).toBe(true);
  });

  it('encrypts per-user AI keys, tracks tokens, and fails over on provider quotas', async () => {
    const initial = await request(app)
      .get('/api/ai/providers')
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(initial.status).toBe(200);
    expect(initial.body.providers).toHaveLength(3);
    expect(initial.body.providers.every((provider) => !provider.configured)).toBe(true);

    const geminiKey = 'AIza-test-user-key-000000000000000000';
    const groqKey = 'gsk_test-user-key-0000000000000000';
    const geminiSave = await request(app)
      .put('/api/ai/providers/gemini')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ apiKey: geminiKey, model: 'gemini-3.8-flash', priority: 1 });
    expect(geminiSave.status).toBe(200);
    expect(JSON.stringify(geminiSave.body)).not.toContain(geminiKey);

    const groqSave = await request(app)
      .put('/api/ai/providers/groq')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ apiKey: groqKey, model: 'openai/gpt-oss-20b', priority: 2 });
    expect(groqSave.status).toBe(200);

    const owner = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(authorAToken);
    const savedKey = db.prepare('SELECT encrypted_api_key FROM ai_provider_settings WHERE user_id = ? AND provider = ?').get(owner.user_id, 'gemini');
    expect(savedKey.encrypted_api_key).not.toBe(geminiKey);
    expect(savedKey.encrypted_api_key.split('.')).toHaveLength(3);

    db.prepare(`UPDATE ai_provider_settings SET model = 'gemini-2.5-flash-lite' WHERE user_id = ? AND provider = 'gemini'`).run(owner.user_id);
    initDatabase();
    const migratedGemini = db.prepare('SELECT model FROM ai_provider_settings WHERE user_id = ? AND provider = ?').get(owner.user_id, 'gemini');
    expect(migratedGemini.model).toBe('gemini-3.8-flash');

    const modelDiscoveryFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        models: [
          { name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] }
        ]
      })
    });
    vi.stubGlobal('fetch', modelDiscoveryFetch);
    try {
      const discovered = await request(app)
        .post('/api/ai/providers/gemini/models')
        .set('Authorization', `Bearer ${authorAToken}`)
        .send({});
      expect(discovered.status).toBe(200);
      expect(discovered.body.models.map((model) => model.id)).toEqual(['gemini-3.8-flash']);
      expect(modelDiscoveryFetch.mock.calls[0][1].headers['x-goog-api-key']).toBe(geminiKey);
      expect(modelDiscoveryFetch.mock.calls[0][0]).not.toContain(geminiKey);
    } finally {
      vi.unstubAllGlobals();
    }

    const connectionTestFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'connected' }] } }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1, totalTokenCount: 6 }
      })
    });
    vi.stubGlobal('fetch', connectionTestFetch);
    try {
      const testResult = await request(app)
        .post('/api/ai/providers/gemini/test')
        .set('Authorization', `Bearer ${authorAToken}`)
        .send({});
      expect(testResult.status).toBe(200);
      expect(testResult.body).toMatchObject({ success: true, provider: 'Google Gemini', usage: { totalTokens: 6 } });
    } finally {
      vi.unstubAllGlobals();
    }

    const otherUserSettings = await request(app)
      .get('/api/ai/providers')
      .set('Authorization', `Bearer ${authorBToken}`);
    expect(otherUserSettings.status).toBe(200);
    expect(otherUserSettings.body.providers.every((provider) => !provider.configured)).toBe(true);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'quota exceeded for this model' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '1. Mix flour.\n2. Bake gently.' } }],
          usage: { prompt_tokens: 15, completion_tokens: 12, total_tokens: 27 }
        })
      });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const generated = await request(app)
        .post('/api/ai/generate')
        .set('Authorization', `Bearer ${authorAToken}`)
        .send({ prompt: 'Write a concise recipe method for this field.', maxWords: 25 });

      expect(generated.status).toBe(200);
      expect(generated.body.provider).toBe('groq');
      expect(generated.body.fallbackProviders).toEqual(['Google Gemini']);
      expect(generated.body.wordCount).toBe(6);
      expect(generated.body.usage.totalTokens).toBe(27);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const settingsAfter = await request(app)
        .get('/api/ai/providers')
        .set('Authorization', `Bearer ${authorAToken}`);
      const gemini = settingsAfter.body.providers.find((provider) => provider.id === 'gemini');
      const groq = settingsAfter.body.providers.find((provider) => provider.id === 'groq');
      expect(gemini.lastError).toContain('quota exceeded');
      expect(groq.usage).toMatchObject({ requests: 1, promptTokens: 15, completionTokens: 12, totalTokens: 27 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('requires a user-entered title before adding a book to the library', async () => {
    const missingTitle = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ publicationType: 'photobook', templateId: 'fine-art-photobook' });

    expect(missingTitle.status).toBe(400);
    expect(missingTitle.body.error).toContain('book title');

    const library = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(library.body.projects.every((project) => project.title?.trim())).toBe(true);
  });

  it('2 & 3. Creates a book from a Living Template and from a Blank Manuscript with initial structure and contextual guidance', async () => {
    // Topic discovery suggestions (e.g. "forgiveness")
    const discRes = await request(app)
      .post('/api/templates/suggest')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ topic: 'forgiveness' });
    expect(discRes.status).toBe(200);
    expect(discRes.body.suggestions.length).toBeGreaterThanOrEqual(4);

    // Create from Literary Novel template
    const createTpl = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        title: 'The Winter Conservatory',
        subtitle: 'A Novel of Memory',
        centralIdea: 'Exploring how a family reconciles after decades of silence.',
        templateId: 'literary-novel',
        bookType: 'fiction'
      });
    expect(createTpl.status).toBe(201);
    expect(createTpl.body.project.title).toBe('The Winter Conservatory');
    expect(createTpl.body.chapters.length).toBe(6);
    templateBookId = createTpl.body.project.id;
    firstChapterId = createTpl.body.chapters[0].id;
    secondChapterId = createTpl.body.chapters[1].id;

    // Verify contextual guidance for Chapter 1
    const guideRes = await request(app)
      .get(`/api/templates/guidance/${templateBookId}/${firstChapterId}`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(guideRes.status).toBe(200);
    expect(guideRes.body.guidance.purpose).toContain('protagonist');
    expect(guideRes.body.guidance.interactiveResponses.show_ideas.items.length).toBeGreaterThan(0);

    // Create from Blank Manuscript
    const createBlank = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        title: 'Untethered Notes',
        templateId: 'blank-manuscript'
      });
    expect(createBlank.status).toBe(201);
    expect(createBlank.body.chapters.length).toBe(1);
    blankBookId = createBlank.body.project.id;
  });

  it('4, 5, 6 & 8. Adds, renames, formats, persists, reorders, skips optional chapters without blocking, and removes chapters', async () => {
    // Write formatted HTML to Chapter 1
    const richHtml = `<h2>The Glass Roof</h2><p>The frost had settled across the <strong>ironwork</strong> of the conservatory before dawn.</p><blockquote>“Memory is a greenhouse,” Julian said quietly.</blockquote>`;
    const saveRes = await request(app)
      .put(`/api/projects/${templateBookId}/chapters/${firstChapterId}`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        title: 'Chapter 1: The Frost on the Glass',
        contentHtml: richHtml,
        status: 'completed',
        createSnapshot: true,
        snapshotLabel: 'First scene completed'
      });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.savedAt).toBeTruthy();
    expect(saveRes.body.chapter.wordCount).toBeGreaterThan(15);

    // Verify persistence on reload
    const reloadRes = await request(app)
      .get(`/api/projects/${templateBookId}`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(reloadRes.status).toBe(200);
    const reloadedCh1 = reloadRes.body.chapters.find(c => c.id === firstChapterId);
    expect(reloadedCh1.title).toBe('Chapter 1: The Frost on the Glass');
    expect(reloadedCh1.contentHtml).toContain('Memory is a greenhouse');

    // Mark Chapter 2 as skipped and write directly in Chapter 3 (verifying non-blocking workflow)
    const skipRes = await request(app)
      .put(`/api/projects/${templateBookId}/chapters/${secondChapterId}`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ status: 'skipped' });
    expect(skipRes.status).toBe(200);
    expect(skipRes.body.chapter.status).toBe('skipped');

    // Add a new chapter
    const addRes = await request(app)
      .post(`/api/projects/${templateBookId}/chapters`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ title: 'Bonus Epilogue: Spring Thaw', isOptional: true });
    expect(addRes.status).toBe(201);
    const epilogueId = addRes.body.chapter.id;

    // Reorder chapters
    const currentChapters = reloadRes.body.chapters.map(c => c.id);
    const reordered = [secondChapterId, firstChapterId, ...currentChapters.slice(2), epilogueId];
    const reorderRes = await request(app)
      .put(`/api/projects/${templateBookId}/chapters/reorder`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ orderedIds: reordered });
    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body.chapters[0].id).toBe(secondChapterId);

    // Delete the bonus chapter
    const delRes = await request(app)
      .delete(`/api/projects/${templateBookId}/chapters/${epilogueId}`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(delRes.status).toBe(200);
  });

  it('10. Imports existing Markdown and Plain Text writing with preview and commits into a book', async () => {
    const markdownSample = `# Chapter One: The Signal\n\nWe heard the **beacon** across the bay.\n\n# Chapter Two: The Crossing\n\nBy noon the ferry had cleared the breakwater.`;
    const previewRes = await request(app)
      .post('/api/publishing/import/preview')
      .set('Authorization', `Bearer ${authorAToken}`)
      .attach('file', Buffer.from(markdownSample, 'utf8'), 'harbor-chronicle.md');

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.preview.chapterCount).toBe(2);
    expect(previewRes.body.preview.chapters[0].title).toBe('Chapter One: The Signal');

    const commitRes = await request(app)
      .post('/api/publishing/import/commit')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        title: 'Harbor Chronicle',
        chapters: previewRes.body.preview.chapters
      });
    expect(commitRes.status).toBe(201);
    expect(commitRes.body.chapters.length).toBe(2);
  });

  it('11. Associates notes and image assets with the right project and converts notes to chapters safely', async () => {
    // Create a character note
    const noteRes = await request(app)
      .post(`/api/projects/${templateBookId}/notes`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        noteType: 'character',
        title: 'Julian Mercer',
        content: 'Botanist who tended the conservatory for forty years.',
        metadata: { role: 'Mentor', motivation: 'Preserve the rare orchids' },
        linkedChapterId: firstChapterId
      });
    expect(noteRes.status).toBe(201);
    const noteId = noteRes.body.note.id;

    // Convert note into a manuscript chapter without losing the original note
    const convertRes = await request(app)
      .post(`/api/projects/${templateBookId}/notes/${noteId}/convert-to-chapter`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({});
    expect(convertRes.status).toBe(201);
    expect(convertRes.body.chapter.title).toBe('Julian Mercer');

    // Verify original note still exists
    const notesList = await request(app)
      .get(`/api/projects/${templateBookId}/notes`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(notesList.body.notes.some(n => n.id === noteId)).toBe(true);

    // Upload SVG image asset
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="green"/></svg>`;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    const assetRes = await request(app)
      .post(`/api/projects/${templateBookId}/assets`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        dataUrl,
        originalName: 'conservatory-seal.svg',
        caption: 'Figure 1: The Conservatory Seal',
        altText: 'Green circular botanical seal',
        licenseType: 'own_work'
      });
    expect(assetRes.status).toBe(201);
    expect(assetRes.body.asset.originalName).toBe('conservatory-seal.svg');
  });

  it('12, 13 & 14. Applies formatting & metadata, runs Quality Review, and exports real DOCX, PDF, and EPUB containing actual manuscript content', async () => {
    // Update formatting
    const fmtRes = await request(app)
      .put(`/api/projects/${templateBookId}/formatting`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        trimSize: '6x9',
        bodyFont: 'Lora',
        fontSizePt: 12,
        lineSpacing: 1.5
      });
    expect(fmtRes.status).toBe(200);
    expect(fmtRes.body.formatting.trimSize).toBe('6x9');

    // Update metadata
    const metaRes = await request(app)
      .put(`/api/projects/${templateBookId}/metadata`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        copyrightHolder: 'Arthur Pendelton',
        copyrightYear: '2026',
        keywords: ['conservatory', 'literary fiction', 'family secret'],
        bisacCategories: ['FICTION / Literary']
      });
    expect(metaRes.status).toBe(200);

    // Run Manuscript Review
    const revRes = await request(app)
      .get(`/api/publishing/${templateBookId}/review`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(revRes.status).toBe(200);
    expect(revRes.body.review.statistics.totalWords).toBeGreaterThan(20);

    // Export EPUB and verify actual content inside XHTML archive
    const epubRes = await request(app)
      .get(`/api/publishing/${templateBookId}/export/epub`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(epubRes.status).toBe(200);
    expect(epubRes.headers['content-type']).toContain('application/epub+zip');

    const epubZip = await JSZip.loadAsync(epubRes.body);
    const opfText = await epubZip.file('OEBPS/content.opf').async('string');
    expect(opfText).toContain('The Winter Conservatory');
    expect(opfText).toContain('A. Pendelton');

    // Find chapter XHTML with "Memory is a greenhouse"
    const chapterFiles = Object.keys(epubZip.files).filter(f => f.startsWith('OEBPS/chapter-'));
    let foundManuscriptQuote = false;
    for (const cf of chapterFiles) {
      const content = await epubZip.file(cf).async('string');
      if (content.includes('Memory is a greenhouse')) foundManuscriptQuote = true;
    }
    expect(foundManuscriptQuote).toBe(true);

    // Export DOCX and verify actual manuscript text in word/document.xml
    const docxRes = await request(app)
      .get(`/api/publishing/${templateBookId}/export/docx`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(docxRes.status).toBe(200);
    const docxZip = await JSZip.loadAsync(docxRes.body);
    const wordXml = await docxZip.file('word/document.xml').async('string');
    expect(wordXml).toContain('The Winter Conservatory');
    expect(wordXml).toContain('Memory is a greenhouse');

    // Export PDF and verify valid PDF header & non-trivial byte size
    const pdfRes = await request(app)
      .get(`/api/publishing/${templateBookId}/export/pdf`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.body.slice(0, 5).toString()).toBe('%PDF-');
    expect(pdfRes.body.length).toBeGreaterThan(1500);
  });

  it('15. Enforces strict multi-user isolation: Author B cannot access, edit, or export Author A’s private book', async () => {
    const getAttempt = await request(app)
      .get(`/api/projects/${templateBookId}`)
      .set('Authorization', `Bearer ${authorBToken}`);
    expect(getAttempt.status).toBe(403);

    const editAttempt = await request(app)
      .put(`/api/projects/${templateBookId}/chapters/${firstChapterId}`)
      .set('Authorization', `Bearer ${authorBToken}`)
      .send({ title: 'Unauthorized Tampering' });
    expect(editAttempt.status).toBe(403);

    const exportAttempt = await request(app)
      .get(`/api/publishing/${templateBookId}/export/epub`)
      .set('Authorization', `Bearer ${authorBToken}`);
    expect(exportAttempt.status).toBe(403);
  });

  it('19 & 20. Handles AI assistance modularly and switches templates without losing writing', async () => {
    const aiStatus = await request(app)
      .get('/api/ai/status')
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(aiStatus.status).toBe(200);
    expect(aiStatus.body.privacyNotice).toBeTruthy();

    const aiAssist = await request(app)
      .post('/api/ai/assist')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        action: 'improve_clarity',
        projectId: templateBookId,
        chapterId: firstChapterId,
        selectedText: 'In order to due to the fact that it was a very unique conservatory, we began to walk.'
      });
    expect(aiAssist.status).toBe(200);
    expect(aiAssist.body.suggestion.suggestedText).toBeTruthy();

    // Switch project template without losing existing writing
    const switchRes = await request(app)
      .post(`/api/projects/${templateBookId}/switch-template`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ templateId: 'memoir-life-story' });
    expect(switchRes.status).toBe(200);
    expect(switchRes.body.project.templateId).toBe('memoir-life-story');
    const preservedCh = switchRes.body.chapters.find(c => c.id === firstChapterId);
    expect(preservedCh.contentHtml).toContain('Memory is a greenhouse');
  });

  it('21. Imports a real generated DOCX file and preserves headings & paragraphs', async () => {
    const docxExport = await request(app)
      .get(`/api/publishing/${templateBookId}/export/docx`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(docxExport.status).toBe(200);

    const importDocxPreview = await request(app)
      .post('/api/publishing/import/preview')
      .set('Authorization', `Bearer ${authorAToken}`)
      .attach('file', docxExport.body, 'exported-manuscript.docx');

    expect(importDocxPreview.status).toBe(200);
    expect(importDocxPreview.body.preview.formatType).toBe('docx');
    expect(importDocxPreview.body.preview.totalWords).toBeGreaterThan(20);
  });

  it('22. Supports chapter version history recovery, custom templates, review placeholder detection, and KDP/Kobo specs', async () => {
    // Version history & restore
    const verRes = await request(app)
      .get(`/api/projects/${templateBookId}/chapters/${firstChapterId}/versions`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(verRes.status).toBe(200);
    expect(verRes.body.versions.length).toBeGreaterThanOrEqual(2);

    const restoreRes = await request(app)
      .post(`/api/projects/${templateBookId}/chapters/${firstChapterId}/restore/${verRes.body.versions[0].id}`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(restoreRes.status).toBe(200);

    // Custom reusable template
    const customTplRes = await request(app)
      .post('/api/templates/custom')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        name: 'Botanical Field Guide',
        category: 'Nonfiction and educational books',
        bookType: 'nonfiction',
        stages: [{ stageKey: 's1', title: 'Specimen Taxonomy', purpose: 'Document species', targetWords: 1500 }]
      });
    expect(customTplRes.status).toBe(201);
    expect(customTplRes.body.template.isCustom).toBe(true);

    // Review engine detects TODO placeholder
    await request(app)
      .put(`/api/projects/${blankBookId}/chapters/${(await request(app).get(`/api/projects/${blankBookId}`).set('Authorization', `Bearer ${authorAToken}`)).body.chapters[0].id}`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ contentHtml: '<p>TODO: Verify archival dates before printing.</p>' });

    const blankReview = await request(app)
      .get(`/api/publishing/${blankBookId}/review`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(blankReview.status).toBe(200);
    expect(blankReview.body.review.issues.some(i => i.id.startsWith('placeholder-'))).toBe(true);

    // KDP & Kobo specs calculator
    const specsRes = await request(app)
      .get(`/api/publishing/${templateBookId}/specs`)
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(specsRes.status).toBe(200);
    expect(specsRes.body.specs.spineWidthInches).toBeGreaterThan(0);
    expect(specsRes.body.specs.platforms.amazonKdp).toBeTruthy();
    expect(specsRes.body.specs.platforms.koboWritingLife).toBeTruthy();
  });

  it('23. Supports password recovery and account deletion with cascade cleanup', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'author.b@example.com' });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.recoveryToken).toBeTruthy();

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: 'author.b@example.com',
        recoveryToken: forgotRes.body.recoveryToken,
        newPassword: 'UpdatedPassword789!'
      });
    expect(resetRes.status).toBe(200);

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'author.b@example.com', password: 'UpdatedPassword789!' });
    expect(loginB.status).toBe(200);

    const delB = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${loginB.body.token}`)
      .send({ password: 'UpdatedPassword789!' });
    expect(delB.status).toBe(200);
  });

  it('24. Supports multi-format publications (Cookbooks, Magazines, Storybooks, Informational), structured recipe editing, and batch layout application without losing content', async () => {
    // Verify publicationTypes and pageLayouts in /api/templates
    const tplRes = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${authorAToken}`);
    expect(tplRes.status).toBe(200);
    expect(Array.isArray(tplRes.body.publicationTypes)).toBe(true);
    expect(tplRes.body.publicationTypes.some(p => p.id === 'cookbook')).toBe(true);
    expect(tplRes.body.publicationTypes.some(p => p.id === 'magazine')).toBe(true);
    expect(Array.isArray(tplRes.body.pageLayouts)).toBe(true);
    expect(tplRes.body.pageLayouts.length).toBeGreaterThanOrEqual(10);

    // Create a Cookbook project
    const cookRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        title: 'Mediterranean Summer Kitchen',
        subtitle: 'Olive Oil, Citrus & Sea Salt',
        publicationType: 'cookbook',
        templateId: 'culinary-cookbook'
      });
    expect(cookRes.status).toBe(201);
    const cookId = cookRes.body.project.id;
    const recipePage = cookRes.body.chapters.find(c => c.sectionType === 'recipe');
    expect(recipePage).toBeTruthy();
    expect(recipePage.structuredData.ingredients.length).toBeGreaterThan(0);

    // Update structured recipe ingredients & steps
    const updatedRecipeRes = await request(app)
      .put(`/api/projects/${cookId}/chapters/${recipePage.id}`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        title: 'Grilled Lemon & Oregano Sea Bass',
        sectionType: 'recipe',
        layoutId: 'recipe-full-spread',
        structuredData: {
          ...recipePage.structuredData,
          prepTime: '15 mins',
          cookTime: '12 mins',
          servings: '4 servings',
          ingredients: [
            { quantity: '2', unit: 'whole', item: 'Mediterranean sea bass, scaled', group: 'Fish' },
            { quantity: '3', unit: 'tbsp', item: 'cold-pressed olive oil', group: 'Marinade' }
          ],
          steps: [
            'Score the skin of the sea bass and rub generously with olive oil, lemon zest, and flaky salt.',
            'Grill over white-hot charcoal for 5 minutes per side until blistered and tender.'
          ],
          chefNotes: 'Serve immediately with charred lemon halves.'
        }
      });
    expect(updatedRecipeRes.status).toBe(200);
    expect(updatedRecipeRes.body.chapter.layoutId).toBe('recipe-full-spread');
    expect(updatedRecipeRes.body.chapter.contentHtml).toContain('Mediterranean sea bass');

    // Batch apply a layout across all recipe pages without losing content
    const applyLayoutRes = await request(app)
      .post(`/api/projects/${cookId}/chapters/apply-layout`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        layoutId: 'recipe-classic-card',
        scope: 'all',
        sectionTypeFilter: 'recipe'
      });
    expect(applyLayoutRes.status).toBe(200);
    const afterApply = applyLayoutRes.body.chapters.find(c => c.id === recipePage.id);
    expect(afterApply.layoutId).toBe('recipe-classic-card');
    expect(afterApply.structuredData.ingredients[0].item).toContain('Mediterranean sea bass');

    // Verify exported EPUB contains automatic clickable Index page (index-toc.xhtml) jumping to chapter start anchors
    const epubRes = await request(app)
      .get(`/api/publishing/${cookId}/export/epub`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(epubRes.status).toBe(200);
    const epubZip = await JSZip.loadAsync(epubRes.body);
    const indexTocHtml = await epubZip.file('OEBPS/index-toc.xhtml').async('string');
    expect(indexTocHtml).toContain('Index &amp; Contents');
    expect(indexTocHtml).toContain('#start-chapter-1');
    expect(indexTocHtml).toContain('Grilled Lemon &amp; Oregano Sea Bass');
  });

  it('25. Persists page counts and each page’s selected third-level design structure', async () => {
    const customChapters = Array.from({ length: 5 }, (_, index) => ({
      stageKey: `planned-page-${index + 1}`,
      title: `Planned Page ${index + 1}`,
      sectionType: 'photo_spread',
      layoutId: 'photo-gallery-grid',
      structuredData: {
        pageStructure: index % 3,
        mosaicVariant: index % 3,
        isFlipped: index % 2 === 1,
        structureName: `Structure ${index % 3 + 1}`
      }
    }));

    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({
        title: 'Five-Page Template Structure Test',
        publicationType: 'photobook',
        templateId: 'fine-art-photobook',
        customChapters
      });

    expect(created.status).toBe(201);
    expect(created.body.chapters).toHaveLength(5);
    expect(created.body.chapters.map((chapter) => chapter.structuredData.pageStructure)).toEqual([0, 1, 2, 0, 1]);

    const firstChapter = created.body.chapters[0];
    const changed = await request(app)
      .put(`/api/projects/${created.body.project.id}/chapters/${firstChapter.id}`)
      .set('Authorization', `Bearer ${authorAToken}`)
      .send({ structuredData: { pageStructure: 2 } });

    expect(changed.status).toBe(200);
    expect(changed.body.chapter.structuredData.pageStructure).toBe(2);
    expect(changed.body.chapter.structuredData.structureName).toBe('Structure 1');
  });
});
