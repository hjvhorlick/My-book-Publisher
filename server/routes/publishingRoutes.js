const express = require('express');
const crypto = require('node:crypto');
const multer = require('multer');
const { db, countWordsFromHtml } = require('../db');
const { requireAuth, verifyProjectOwnership } = require('../auth');
const { formatFormattingRow, formatMetadataRow, hydrateProjectSummary, formatChapterRow } = require('./projectRoutes');
const { runManuscriptReview } = require('../reviewEngine');
const { parseImportedFile } = require('../importEngine');
const {
  generateDocxExport,
  generatePdfExport,
  generateEpubExport,
  calculatePublishingSpecs
} = require('../exportEngine');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB max manuscript upload
});

function loadProjectBundle(projectId) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(projectId);
  const formatting = formatFormattingRow(db.prepare('SELECT * FROM formatting_settings WHERE project_id = ?').get(projectId)) || {};
  const metadata = formatMetadataRow(db.prepare('SELECT * FROM publishing_metadata WHERE project_id = ?').get(projectId)) || {};
  const assets = db.prepare('SELECT * FROM assets WHERE project_id = ? ORDER BY created_at ASC').all(projectId);
  const notes = db.prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC').all(projectId);
  return { project, chapters, formatting, metadata, assets, notes };
}

// 1. Manuscript Quality & Review Diagnostics
router.get('/:projectId/review', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }
  const bundle = loadProjectBundle(req.params.projectId);
  const review = runManuscriptReview(bundle);
  return res.json({ review });
});

// 2. Platform Publishing Specs (Amazon KDP & Kobo Writing Life + Spine Calculator)
router.get('/:projectId/specs', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }
  const bundle = loadProjectBundle(req.params.projectId);
  const specs = calculatePublishingSpecs(bundle);
  return res.json({ specs });
});

// 3. Real File Export (DOCX, PDF, EPUB, JSON Backup)
router.get('/:projectId/export/:format', requireAuth, async (req, res) => {
  try {
    const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const format = String(req.params.format || '').toLowerCase();
    const bundle = loadProjectBundle(req.params.projectId);

    if (!bundle.chapters || bundle.chapters.length === 0) {
      return res.status(400).json({ error: 'Cannot export an empty manuscript with zero chapters. Add at least one chapter first.' });
    }

    const safeSlug = (bundle.project.title || 'manuscript')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'manuscript';

    if (format === 'docx') {
      const buffer = await generateDocxExport(bundle);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}.docx"`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const buffer = await generatePdfExport(bundle);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}.pdf"`);
      return res.send(buffer);
    }

    if (format === 'epub') {
      const buffer = await generateEpubExport(bundle);
      res.setHeader('Content-Type', 'application/epub+zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}.epub"`);
      return res.send(buffer);
    }

    if (format === 'json') {
      const archive = {
        exportedAt: new Date().toISOString(),
        generator: 'Folio & Quill Book Publishing Studio',
        project: hydrateProjectSummary(bundle.project),
        chapters: bundle.chapters.map(formatChapterRow),
        formatting: bundle.formatting,
        metadata: bundle.metadata,
        notes: bundle.notes
      };
      const jsonBuffer = Buffer.from(JSON.stringify(archive, null, 2), 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}-backup.json"`);
      return res.send(jsonBuffer);
    }

    return res.status(400).json({ error: `Unsupported export format "${format}". Supported formats: docx, pdf, epub, json.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate export file.', details: err.message });
  }
});

// 4. Import Preview (DOCX, Markdown, TXT, or Pasted Text)
router.post('/import/preview', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (req.file) {
      const preview = await parseImportedFile({
        buffer: req.file.buffer,
        filename: req.file.originalname || 'imported.txt'
      });
      return res.json({ preview });
    }

    const { rawText, title = 'Pasted Manuscript' } = req.body || {};
    if (!rawText || !String(rawText).trim()) {
      return res.status(400).json({ error: 'Please upload a DOCX, Markdown (.md), or TXT file, or provide pasted manuscript text.' });
    }

    const preview = await parseImportedFile({
      buffer: null,
      filename: `${title}.txt`,
      rawText: String(rawText)
    });
    return res.json({ preview });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to parse imported manuscript.' });
  }
});

// 5. Commit Imported Writing into a New or Existing Book Project
router.post('/import/commit', requireAuth, (req, res) => {
  try {
    const {
      targetProjectId = null,
      title = 'Imported Book Project',
      subtitle = '',
      authorName,
      bookType = 'general',
      templateId = 'blank-manuscript',
      chapters = []
    } = req.body || {};

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: 'No imported chapters provided to commit.' });
    }

    const now = new Date().toISOString();

    // Case A: Append imported chapters into an existing project owned by user
    if (targetProjectId) {
      const ownership = verifyProjectOwnership(targetProjectId, req.user.id);
      if (ownership.error) {
        return res.status(ownership.status).json({ error: ownership.error });
      }

      const maxRow = db.prepare('SELECT MAX(order_index) as maxIdx FROM chapters WHERE project_id = ?').get(targetProjectId);
      let nextOrder = (maxRow && maxRow.maxIdx !== null) ? Number(maxRow.maxIdx) + 1 : 0;

      for (const ch of chapters) {
        const chId = `ch-${crypto.randomUUID()}`;
        const html = ch.contentHtml || '<p></p>';
        const wc = countWordsFromHtml(html);
        db.prepare(`
          INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
          VALUES (?, ?, 'imported', ?, '', 'chapter', ?, ?, 'Imported section', ?, 2500, 'drafting', 0, '{}', 1, ?, ?)
        `).run(chId, targetProjectId, ch.title || `Imported Chapter`, nextOrder++, html, wc, now, now);
      }

      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, targetProjectId);
      const updatedProj = db.prepare('SELECT * FROM projects WHERE id = ?').get(targetProjectId);
      const allCh = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(targetProjectId).map(formatChapterRow);
      return res.json({ project: hydrateProjectSummary(updatedProj), chapters: allCh });
    }

    // Case B: Create a brand new project from the imported manuscript
    const projectId = `proj-${crypto.randomUUID()}`;
    const resolvedAuthor = String(authorName !== undefined ? authorName : (req.user.penName || req.user.name)).trim();
    const defaultCover = {
      layout: 'editorial_frame',
      bgColor: '#1E293B',
      accentColor: '#D4AF37',
      textColor: '#FBF8F3',
      fontFamily: 'Newsreader',
      badgeText: 'IMPORTED MANUSCRIPT',
      backBlurb: '',
      spineColor: '#0F172A'
    };

    db.prepare(`
      INSERT INTO projects (id, user_id, title, subtitle, author_name, description, central_idea, target_audience, book_type, template_id, status, current_stage, target_word_count, cover_config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'Imported manuscript ready for editing, formatting, and publishing.', '', '', ?, ?, 'in_progress', 'manuscript', 40000, ?, ?, ?)
    `).run(projectId, req.user.id, String(title).trim() || 'Imported Book', String(subtitle).trim(), resolvedAuthor, bookType, templateId, JSON.stringify(defaultCover), now, now);

    let firstChId = null;
    chapters.forEach((ch, idx) => {
      const chId = `ch-${crypto.randomUUID()}`;
      if (idx === 0) firstChId = chId;
      const html = ch.contentHtml || '<p></p>';
      const wc = countWordsFromHtml(html);
      db.prepare(`
        INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
        VALUES (?, ?, 'imported', ?, '', 'chapter', ?, ?, 'Imported chapter', ?, 2500, 'drafting', 0, '{}', 1, ?, ?)
      `).run(chId, projectId, ch.title || `Chapter ${idx + 1}`, idx, html, wc, now, now);
    });

    if (firstChId) {
      db.prepare('UPDATE projects SET last_opened_chapter_id = ? WHERE id = ?').run(firstChId, projectId);
    }

    db.prepare(`
      INSERT INTO formatting_settings (project_id, preset_id, trim_size, body_font, heading_font, updated_at)
      VALUES (?, 'classic_literary', '5.5x8.5', 'Newsreader', 'Newsreader', ?)
    `).run(projectId, now);

    db.prepare(`
      INSERT INTO publishing_metadata (project_id, copyright_holder, language, contributors_json, front_matter_json, back_matter_json, updated_at)
      VALUES (?, ?, 'en', ?, '{}', '{}', ?)
    `).run(projectId, resolvedAuthor, JSON.stringify([{ name: resolvedAuthor, role: 'Author' }]), now);

    const createdProj = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    const createdCh = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(projectId).map(formatChapterRow);
    return res.status(201).json({ project: hydrateProjectSummary(createdProj), chapters: createdCh });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to commit imported manuscript.', details: err.message });
  }
});

module.exports = router;
