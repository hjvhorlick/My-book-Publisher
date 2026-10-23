const express = require('express');
const crypto = require('node:crypto');
const { db, countWordsFromHtml } = require('../db');
const { requireAuth, verifyProjectOwnership } = require('../auth');
const { formatChapterRow } = require('./projectRoutes');

const router = express.Router({ mergeParams: true });

function formatNoteRow(row) {
  let metadata = {};
  try { metadata = JSON.parse(row.metadata_json || '{}'); } catch { metadata = {}; }
  return {
    id: row.id,
    projectId: row.project_id,
    noteType: row.note_type,
    title: row.title,
    content: row.content || '',
    metadata,
    linkedChapterId: row.linked_chapter_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }
  const rows = db.prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC').all(req.params.projectId);
  return res.json({ notes: rows.map(formatNoteRow) });
});

router.post('/', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const {
    noteType = 'research',
    title,
    content = '',
    metadata = {},
    linkedChapterId = null
  } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Note title is required.' });
  }

  const id = `note-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO notes (id, project_id, note_type, title, content, metadata_json, linked_chapter_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.params.projectId,
    String(noteType),
    String(title).trim(),
    String(content),
    JSON.stringify(metadata || {}),
    linkedChapterId || null,
    now,
    now
  );

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, req.params.projectId);
  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  return res.status(201).json({ note: formatNoteRow(row) });
});

router.put('/:noteId', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const cur = db.prepare('SELECT * FROM notes WHERE id = ? AND project_id = ?').get(req.params.noteId, req.params.projectId);
  if (!cur) {
    return res.status(404).json({ error: 'Note not found.' });
  }

  const { noteType, title, content, metadata, linkedChapterId } = req.body || {};
  let mergedMeta = {};
  try { mergedMeta = JSON.parse(cur.metadata_json || '{}'); } catch { mergedMeta = {}; }
  if (metadata && typeof metadata === 'object') {
    mergedMeta = { ...mergedMeta, ...metadata };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE notes
    SET note_type = ?,
        title = ?,
        content = ?,
        metadata_json = ?,
        linked_chapter_id = ?,
        updated_at = ?
    WHERE id = ? AND project_id = ?
  `).run(
    noteType !== undefined ? String(noteType) : cur.note_type,
    title !== undefined ? (String(title).trim() || cur.title) : cur.title,
    content !== undefined ? String(content) : cur.content,
    JSON.stringify(mergedMeta),
    linkedChapterId !== undefined ? (linkedChapterId || null) : cur.linked_chapter_id,
    now,
    cur.id,
    req.params.projectId
  );

  const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(cur.id);
  return res.json({ note: formatNoteRow(updated) });
});

router.delete('/:noteId', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const existing = db.prepare('SELECT id FROM notes WHERE id = ? AND project_id = ?').get(req.params.noteId, req.params.projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Note not found.' });
  }

  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.noteId);
  return res.json({ success: true });
});

// Turn a note or outline entry into a manuscript chapter or section without losing the original note
router.post('/:noteId/convert-to-chapter', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND project_id = ?').get(req.params.noteId, req.params.projectId);
  if (!note) {
    return res.status(404).json({ error: 'Note not found.' });
  }

  const { targetChapterId = null } = req.body || {};
  const paragraphs = String(note.content || '')
    .split(/\n+/)
    .filter(Boolean)
    .map(p => `<p>${p}</p>`)
    .join('\n');
  const sectionHtml = `<h2>${note.title}</h2>\n${paragraphs || '<p></p>'}`;
  const now = new Date().toISOString();

  if (targetChapterId) {
    const ch = db.prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ?').get(targetChapterId, req.params.projectId);
    if (!ch) {
      return res.status(404).json({ error: 'Target chapter not found.' });
    }
    const combinedHtml = `${ch.content_html || ''}\n${sectionHtml}`;
    const wc = countWordsFromHtml(combinedHtml);
    db.prepare('UPDATE chapters SET content_html = ?, word_count = ?, version = version + 1, updated_at = ? WHERE id = ?')
      .run(combinedHtml, wc, now, ch.id);
    db.prepare('UPDATE notes SET linked_chapter_id = ?, updated_at = ? WHERE id = ?').run(ch.id, now, note.id);

    const updatedCh = db.prepare('SELECT * FROM chapters WHERE id = ?').get(ch.id);
    return res.json({
      chapter: formatChapterRow(updatedCh),
      note: formatNoteRow(db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id)),
      mode: 'appended_to_chapter'
    });
  }

  // Create a brand new chapter from the note while preserving the original note
  const maxOrderRow = db.prepare('SELECT MAX(order_index) as maxIdx FROM chapters WHERE project_id = ?').get(req.params.projectId);
  const nextOrder = (maxOrderRow && maxOrderRow.maxIdx !== null) ? Number(maxOrderRow.maxIdx) + 1 : 0;
  const newChId = `ch-${crypto.randomUUID()}`;
  const wc = countWordsFromHtml(sectionHtml);

  const guidance = {
    purpose: `Developed from ${note.note_type} note: "${note.title}"`,
    accomplish: 'Expand these initial notes into a polished manuscript chapter.',
    questions: ['What additional scenes, examples, or transitions are needed to flesh out this note?'],
    approaches: ['Keep the core insight of your note while expanding the narrative flow.'],
    subtopics: ['Opening', 'Core Expansion', 'Transition'],
    example: '',
    commonOmissions: [],
    completionCriteria: ['Expanded from note into full prose'],
    completedCriteria: [],
    customNotes: `Origin: Note "${note.title}"`
  };

  db.prepare(`
    INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
    VALUES (?, ?, 'from-note', ?, '', 'chapter', ?, ?, ?, ?, 2500, 'drafting', 0, ?, 1, ?, ?)
  `).run(
    newChId,
    req.params.projectId,
    note.title,
    nextOrder,
    sectionHtml,
    note.content.slice(0, 220),
    wc,
    JSON.stringify(guidance),
    now,
    now
  );

  db.prepare('UPDATE notes SET linked_chapter_id = ?, updated_at = ? WHERE id = ?').run(newChId, now, note.id);

  const createdCh = db.prepare('SELECT * FROM chapters WHERE id = ?').get(newChId);
  return res.status(201).json({
    chapter: formatChapterRow(createdCh),
    note: formatNoteRow(db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id)),
    mode: 'created_new_chapter'
  });
});

module.exports = router;
