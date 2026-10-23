const express = require('express');
const crypto = require('node:crypto');
const { db } = require('../db');
const { requireAuth, verifyProjectOwnership } = require('../auth');
const { STARTER_TEMPLATES, PUBLICATION_TYPES, PAGE_LAYOUT_LIBRARY, suggestAnglesForTopic } = require('../templatesData');
const { buildContextualGuidance } = require('../guidanceEngine');

const router = express.Router();

function formatCustomTemplate(row) {
  let stages = [];
  let enabledTools = [];
  let defaultFrontMatter = [];
  try { stages = JSON.parse(row.stages_json || '[]'); } catch { stages = []; }
  try { enabledTools = JSON.parse(row.enabled_tools_json || '[]'); } catch { enabledTools = []; }
  try { defaultFrontMatter = JSON.parse(row.default_front_matter_json || '[]'); } catch { defaultFrontMatter = []; }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    publicationType: row.book_type,
    bookType: row.book_type,
    tagline: row.tagline,
    description: row.description,
    intendedAudience: row.intended_audience,
    useCases: ['Custom author template'],
    keywords: [row.category.toLowerCase(), row.book_type.toLowerCase(), 'custom'],
    accentColor: row.accent_color || '#4A5568',
    recommendedTrimSize: row.recommended_trim_size || '5.5x8.5',
    recommendedFont: row.recommended_font || 'Newsreader',
    enabledTools,
    defaultFrontMatter,
    stages,
    isCustom: true,
    createdAt: row.created_at
  };
}

router.get('/', requireAuth, (req, res) => {
  const customRows = db.prepare('SELECT * FROM custom_templates WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const customTemplates = customRows.map(formatCustomTemplate);
  return res.json({
    publicationTypes: PUBLICATION_TYPES,
    pageLayouts: PAGE_LAYOUT_LIBRARY,
    templates: [...STARTER_TEMPLATES, ...customTemplates]
  });
});

router.post('/suggest', requireAuth, (req, res) => {
  const { topic } = req.body || {};
  const suggestions = suggestAnglesForTopic(topic);
  return res.json({ suggestions });
});

router.post('/custom', requireAuth, (req, res) => {
  try {
    const {
      name,
      category = 'Custom Templates',
      bookType = 'blank',
      tagline = '',
      description = '',
      intendedAudience = '',
      accentColor = '#4A5568',
      recommendedTrimSize = '5.5x8.5',
      recommendedFont = 'Newsreader',
      stages = [],
      enabledTools = ['concepts', 'outlines', 'research', 'quotes'],
      defaultFrontMatter = ['title_page', 'copyright', 'toc']
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }

    const id = `tpl-custom-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO custom_templates (id, user_id, name, category, book_type, tagline, description, intended_audience, accent_color, recommended_trim_size, recommended_font, stages_json, enabled_tools_json, default_front_matter_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.id,
      String(name).trim(),
      String(category).trim(),
      String(bookType).trim(),
      String(tagline).trim(),
      String(description).trim(),
      String(intendedAudience).trim(),
      accentColor,
      recommendedTrimSize,
      recommendedFont,
      JSON.stringify(Array.isArray(stages) ? stages : []),
      JSON.stringify(Array.isArray(enabledTools) ? enabledTools : []),
      JSON.stringify(Array.isArray(defaultFrontMatter) ? defaultFrontMatter : []),
      now
    );

    const row = db.prepare('SELECT * FROM custom_templates WHERE id = ?').get(id);
    return res.status(201).json({ template: formatCustomTemplate(row) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save custom template.', details: err.message });
  }
});

router.delete('/custom/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM custom_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'Custom template not found.' });
  }
  db.prepare('DELETE FROM custom_templates WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

router.get('/guidance/:projectId/:chapterId', requireAuth, (req, res) => {
  const { projectId, chapterId } = req.params;
  const ownership = verifyProjectOwnership(projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ?').get(chapterId, projectId);
  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found.' });
  }

  const allChapters = db.prepare('SELECT id, title, order_index, status, word_count FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(projectId);
  let template = STARTER_TEMPLATES.find(t => t.id === ownership.project.template_id);
  if (!template) {
    const customRow = db.prepare('SELECT * FROM custom_templates WHERE id = ?').get(ownership.project.template_id);
    if (customRow) template = formatCustomTemplate(customRow);
  }

  const guidance = buildContextualGuidance({
    project: ownership.project,
    chapter,
    allChapters,
    template
  });

  return res.json({ guidance });
});

module.exports = {
  router,
  formatCustomTemplate
};
