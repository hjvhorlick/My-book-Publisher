const express = require('express');
const crypto = require('node:crypto');
const { db, countWordsFromHtml, sanitizeRichHtmlServer, syncStructuredContentToHtml } = require('../db');
const { requireAuth, verifyProjectOwnership } = require('../auth');
const { formatChapterRow } = require('./projectRoutes');

const router = express.Router({ mergeParams: true });

function defaultStructuredDataForSection(sectionType, title) {
  if (sectionType === 'recipe') {
    return {
      course: 'Main Course',
      prepTime: '20 mins',
      cookTime: '35 mins',
      servings: '4 servings',
      difficulty: 'Easy',
      dietaryTags: ['Seasonal', 'House Favorite'],
      headnote: `The story and flavor inspiration behind ${title || 'this dish'}.`,
      ingredients: [
        { quantity: '2', unit: 'tbsp', item: 'extra-virgin olive oil', group: 'Base' },
        { quantity: '1', unit: 'tsp', item: 'flaky sea salt', group: 'Seasoning' }
      ],
      steps: [
        'Prepare and measure all fresh ingredients before heating the pan.',
        'Season generously and cook over medium-high heat until golden and fragrant.'
      ],
      chefNotes: 'Serve warm with crusty sourdough or toasted seeds.',
      pairingSuggestion: 'Crisp Chenin Blanc or sparkling botanical water',
      photoUrl: '',
      photoCaption: ''
    };
  }
  if (sectionType === 'magazine_article') {
    return {
      kicker: 'FEATURE STORY',
      headline: title || 'Feature Headline',
      deck: 'A compelling subheadline that frames the visual spread.',
      byline: 'By Studio Contributor',
      columns: 2,
      pullQuote: '“Design is the quiet dialogue between light, proportion, and human touch.”',
      sidebarTitle: 'Quick Dossier',
      sidebarItems: ['Key highlight 1', 'Key highlight 2'],
      backgroundColor: '#FFFFFF',
      accentColor: '#991B1B',
      blocks: [
        { id: `blk-${crypto.randomUUID().slice(0, 6)}`, type: 'headline', content: title || 'Feature Headline', span: 'full', align: 'left' },
        { id: `blk-${crypto.randomUUID().slice(0, 6)}`, type: 'pullquote', content: '“Great editorial design lets every image and column breathe.”', span: 'half', align: 'center' }
      ]
    };
  }
  if (sectionType === 'informational_unit') {
    return {
      unitNumber: 'Unit',
      learningObjectives: ['Understand the core framework', 'Apply the reference table'],
      calloutType: 'Key Concept',
      calloutTitle: 'Essential Principle',
      calloutBody: 'Summarize the most important takeaway in two crisp sentences.',
      diagramTitle: 'System Architecture Diagram',
      diagramNodes: [
        { step: '1', label: 'Input', detail: 'Primary signals & raw observations' },
        { step: '2', label: 'Process', detail: 'Analysis, synthesis & transformation' },
        { step: '3', label: 'Output', detail: 'Verified result & practical application' }
      ],
      dataTable: {
        caption: 'Comparative Reference Matrix',
        headers: ['Category', 'Primary Characteristic', 'Practical Application'],
        rows: [
          ['Tier 1', 'High velocity, low overhead', 'Rapid prototyping & field studies'],
          ['Tier 2', 'Balanced durability & scale', 'Standard production workflows']
        ]
      },
      keyTerms: [
        { term: 'Core Term', definition: 'Clear, concise definition for the glossary and margin note.' }
      ],
      references: ['Primary Source Reference (2026)']
    };
  }
  if (sectionType === 'storybook_spread') {
    return {
      spreadNumber: 1,
      illustrationPrompt: 'Warm watercolor and ink illustration filling the left page',
      illustrationPosition: 'left-page',
      illustrationAspect: 'square',
      backgroundColor: '#FFFBEB',
      textOverlayStyle: 'storybook-serif',
      readAloudTip: 'Pause gently before the final line of the spread.',
      storyText: 'In the quiet glow of morning, the lanterns along the river began to hum.'
    };
  }
  if (sectionType === 'photo_spread') {
    return {
      galleryStyle: 'two-up-facing',
      backgroundColor: '#FAFAFA',
      curatorialNote: 'Selected plates from the series.',
      photos: [
        { title: 'Plate I', location: 'Studio Archive', cameraSpec: '50mm • f/2.8', caption: 'Morning light across limestone.', aspect: 'landscape' },
        { title: 'Plate II', location: 'Studio Archive', cameraSpec: '35mm • f/4', caption: 'Shadow study at dusk.', aspect: 'portrait' }
      ]
    };
  }
  if (sectionType === 'workbook_exercise') {
    return {
      moduleBadge: 'PRACTICE LAB',
      estimatedTime: '15 mins',
      frameworkSummary: 'Read the prompt carefully and complete the structured exercises below.',
      checklistItems: [
        'Define the primary goal for this week',
        'Identify the single highest-leverage action'
      ],
      reflectionPrompts: [
        { prompt: 'What obstacle has been slowing your momentum, and how can you simplify it today?', lines: 4 },
        { prompt: 'What will success look and feel like 30 days from now?', lines: 4 }
      ],
      assessmentScale: {
        question: 'Rate your current clarity on this topic (1 = Low, 10 = High)',
        minLabel: '1 — Unclear',
        maxLabel: '10 — Crystal Clear'
      }
    };
  }
  return {};
}

function defaultLayoutForSection(sectionType) {
  const map = {
    recipe: 'recipe-classic-card',
    magazine_article: 'magazine-two-column',
    informational_unit: 'info-reference-unit',
    storybook_spread: 'storybook-illustrated-spread',
    photo_spread: 'photo-gallery-grid',
    workbook_exercise: 'workbook-interactive-sheet',
    chapter: 'longform-chapter'
  };
  return map[sectionType] || 'longform-chapter';
}

// List chapters
router.get('/', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }
  const rows = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(req.params.projectId);
  return res.json({ chapters: rows.map(formatChapterRow) });
});

// Create chapter / page / recipe / spread
router.post('/', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const {
    title = 'New Section',
    subtitle = '',
    sectionType = 'chapter',
    layoutId,
    structuredData,
    contentHtml = '',
    synopsis = '',
    targetWords = 1500,
    isOptional = false,
    guidance = {}
  } = req.body || {};

  const maxOrderRow = db.prepare('SELECT MAX(order_index) as maxIdx FROM chapters WHERE project_id = ?').get(req.params.projectId);
  const nextOrder = (maxOrderRow && maxOrderRow.maxIdx !== null) ? Number(maxOrderRow.maxIdx) + 1 : 0;

  const chId = `ch-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const resolvedLayout = layoutId || defaultLayoutForSection(sectionType);
  const resolvedStructured = structuredData && Object.keys(structuredData).length > 0
    ? structuredData
    : defaultStructuredDataForSection(sectionType, title);

  const finalHtml = syncStructuredContentToHtml(sectionType, resolvedStructured, contentHtml);
  const wc = countWordsFromHtml(finalHtml);

  const defaultGuidance = {
    purpose: guidance.purpose || `Develop the content and visual layout of "${title}".`,
    accomplish: guidance.accomplish || 'Engage the reader and advance the publication’s central promise.',
    questions: guidance.questions || ['What is the key takeaway or visual focus of this page?'],
    approaches: guidance.approaches || ['Lead with clarity and strong hierarchy.'],
    subtopics: guidance.subtopics || ['Opening', 'Core Content', 'Takeaway'],
    example: guidance.example || '',
    commonOmissions: guidance.commonOmissions || [],
    completionCriteria: guidance.completionCriteria || ['Drafted content', 'Checked page layout'],
    completedCriteria: guidance.completedCriteria || [],
    customNotes: guidance.customNotes || ''
  };

  db.prepare(`
    INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, layout_id, structured_data_json, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'drafting', ?, ?, 1, ?, ?)
  `).run(
    chId,
    req.params.projectId,
    `custom-${nextOrder + 1}`,
    String(title).trim() || 'Untitled Section',
    String(subtitle || '').trim(),
    sectionType,
    resolvedLayout,
    JSON.stringify(resolvedStructured),
    nextOrder,
    finalHtml,
    String(synopsis || '').trim(),
    wc,
    Number(targetWords) || 1500,
    isOptional ? 1 : 0,
    JSON.stringify(defaultGuidance),
    now,
    now
  );

  db.prepare(`
    INSERT INTO chapter_versions (id, chapter_id, project_id, title, content_html, word_count, version_number, label, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'Page created', ?)
  `).run(`ver-${crypto.randomUUID()}`, chId, req.params.projectId, String(title).trim() || 'Untitled Section', finalHtml, wc, now);

  db.prepare('UPDATE projects SET updated_at = ?, last_opened_chapter_id = ? WHERE id = ?').run(now, chId, req.params.projectId);

  const row = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chId);
  return res.status(201).json({ chapter: formatChapterRow(row) });
});

// Batch apply layout across single page, selected pages, or entire publication without losing content
router.post('/apply-layout', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const { layoutId, scope = 'single', chapterIds = [], sectionTypeFilter = null } = req.body || {};
  if (!layoutId) {
    return res.status(400).json({ error: 'layoutId is required.' });
  }

  const now = new Date().toISOString();
  if (scope === 'all') {
    if (sectionTypeFilter) {
      db.prepare('UPDATE chapters SET layout_id = ?, updated_at = ? WHERE project_id = ? AND section_type = ?')
        .run(layoutId, now, req.params.projectId, sectionTypeFilter);
    } else {
      db.prepare('UPDATE chapters SET layout_id = ?, updated_at = ? WHERE project_id = ?')
        .run(layoutId, now, req.params.projectId);
    }
  } else if (Array.isArray(chapterIds) && chapterIds.length > 0) {
    const stmt = db.prepare('UPDATE chapters SET layout_id = ?, updated_at = ? WHERE id = ? AND project_id = ?');
    chapterIds.forEach(id => stmt.run(layoutId, now, id, req.params.projectId));
  }

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, req.params.projectId);
  const rows = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(req.params.projectId);
  return res.json({ chapters: rows.map(formatChapterRow) });
});

// Reorder chapters
router.put('/reorder', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ error: 'orderedIds array is required.' });
  }

  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE chapters SET order_index = ?, updated_at = ? WHERE id = ? AND project_id = ?');
  orderedIds.forEach((id, idx) => {
    stmt.run(idx, now, id, req.params.projectId);
  });

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, req.params.projectId);
  const rows = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(req.params.projectId);
  return res.json({ chapters: rows.map(formatChapterRow) });
});

// Update / Autosave chapter or specialized page
router.put('/:chapterId', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const cur = db.prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ?').get(req.params.chapterId, req.params.projectId);
  if (!cur) {
    return res.status(404).json({ error: 'Chapter not found.' });
  }

  const {
    title,
    subtitle,
    sectionType,
    layoutId,
    structuredData,
    contentHtml,
    synopsis,
    targetWords,
    status,
    isOptional,
    guidance,
    createSnapshot = false,
    snapshotLabel = 'Saved checkpoint'
  } = req.body || {};

  const nextSectionType = sectionType !== undefined ? String(sectionType) : cur.section_type;
  const nextLayoutId = layoutId !== undefined ? String(layoutId) : (cur.layout_id || 'longform-chapter');

  let mergedStructured = {};
  try { mergedStructured = JSON.parse(cur.structured_data_json || '{}'); } catch { mergedStructured = {}; }
  if (structuredData && typeof structuredData === 'object') {
    mergedStructured = { ...mergedStructured, ...structuredData };
  }

  let nextHtml = sanitizeRichHtmlServer(contentHtml !== undefined ? String(contentHtml) : cur.content_html);
  if (Array.isArray(mergedStructured.pages)) {
    mergedStructured.pages = mergedStructured.pages.map((page) => (
      page && typeof page === 'object'
        ? {
            ...page,
            ...(page.contentHtml !== undefined ? { contentHtml: sanitizeRichHtmlServer(String(page.contentHtml || '')) } : {}),
            ...(page.subtitle !== undefined ? { subtitle: sanitizeRichHtmlServer(String(page.subtitle || '')) } : {})
          }
        : page
    ));
  }
  if (nextSectionType === 'recipe' && structuredData) {
    nextHtml = syncStructuredContentToHtml('recipe', mergedStructured, nextHtml);
  }

  const pageEntries = Array.isArray(mergedStructured.pages) ? mergedStructured.pages : null;
  const wc = pageEntries && pageEntries.length > 0
    ? pageEntries.reduce((total, page, index) => {
        const pageData = {
          ...(index === 0 ? mergedStructured : {}),
          ...(page?.structuredData && typeof page.structuredData === 'object' ? page.structuredData : {})
        };
        delete pageData.pages;
        const pageHtml = page?.contentHtml !== undefined
          ? String(page.contentHtml || '')
          : index === 0 ? nextHtml : '';
        return total + countWordsFromHtml(
          nextSectionType === 'recipe'
            ? syncStructuredContentToHtml(nextSectionType, pageData, pageHtml)
            : pageHtml
        );
      }, 0)
    : countWordsFromHtml(nextHtml);
  const nextTitle = title !== undefined ? (String(title).trim() || cur.title) : cur.title;

  let mergedGuidance = {};
  try { mergedGuidance = JSON.parse(cur.guidance_json || '{}'); } catch { mergedGuidance = {}; }
  if (guidance && typeof guidance === 'object') {
    mergedGuidance = { ...mergedGuidance, ...guidance };
  }

  const nextVersion = (cur.version || 1) + 1;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE chapters
    SET title = ?,
        subtitle = ?,
        section_type = ?,
        layout_id = ?,
        structured_data_json = ?,
        content_html = ?,
        synopsis = ?,
        word_count = ?,
        target_words = ?,
        status = ?,
        is_optional = ?,
        guidance_json = ?,
        version = ?,
        updated_at = ?
    WHERE id = ? AND project_id = ?
  `).run(
    nextTitle,
    subtitle !== undefined ? sanitizeRichHtmlServer(String(subtitle).trim()) : cur.subtitle,
    nextSectionType,
    nextLayoutId,
    JSON.stringify(mergedStructured),
    nextHtml,
    synopsis !== undefined ? String(synopsis) : cur.synopsis,
    wc,
    targetWords !== undefined ? Number(targetWords) || cur.target_words : cur.target_words,
    status !== undefined ? String(status) : cur.status,
    isOptional !== undefined ? (isOptional ? 1 : 0) : cur.is_optional,
    JSON.stringify(mergedGuidance),
    nextVersion,
    now,
    cur.id,
    req.params.projectId
  );

  const wordDiff = Math.abs(wc - (cur.word_count || 0));
  if (createSnapshot || wordDiff >= 25) {
    db.prepare(`
      INSERT INTO chapter_versions (id, chapter_id, project_id, title, content_html, word_count, version_number, label, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ver-${crypto.randomUUID()}`,
      cur.id,
      req.params.projectId,
      nextTitle,
      nextHtml,
      wc,
      nextVersion,
      snapshotLabel,
      now
    );
  }

  db.prepare('UPDATE projects SET updated_at = ?, last_opened_chapter_id = ? WHERE id = ?')
    .run(now, cur.id, req.params.projectId);

  const updated = db.prepare('SELECT * FROM chapters WHERE id = ?').get(cur.id);
  return res.json({
    chapter: formatChapterRow(updated),
    savedAt: now,
    version: nextVersion
  });
});

// Duplicate chapter / page
router.post('/:chapterId/duplicate', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const orig = db.prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ?').get(req.params.chapterId, req.params.projectId);
  if (!orig) {
    return res.status(404).json({ error: 'Chapter not found.' });
  }

  const maxOrderRow = db.prepare('SELECT MAX(order_index) as maxIdx FROM chapters WHERE project_id = ?').get(req.params.projectId);
  const nextOrder = (maxOrderRow && maxOrderRow.maxIdx !== null) ? Number(maxOrderRow.maxIdx) + 1 : 0;
  const newId = `ch-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, layout_id, structured_data_json, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    newId,
    req.params.projectId,
    orig.stage_key,
    `${orig.title} (Copy)`,
    orig.subtitle,
    orig.section_type,
    orig.layout_id || 'longform-chapter',
    orig.structured_data_json || '{}',
    nextOrder,
    orig.content_html,
    orig.synopsis,
    orig.word_count,
    orig.target_words,
    orig.status,
    orig.is_optional,
    orig.guidance_json,
    now,
    now
  );

  const row = db.prepare('SELECT * FROM chapters WHERE id = ?').get(newId);
  return res.status(201).json({ chapter: formatChapterRow(row) });
});

// Delete chapter
router.delete('/:chapterId', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const existing = db.prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ?').get(req.params.chapterId, req.params.projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Chapter not found.' });
  }

  db.prepare('DELETE FROM chapters WHERE id = ?').run(req.params.chapterId);

  const remaining = db.prepare('SELECT id FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(req.params.projectId);
  const stmt = db.prepare('UPDATE chapters SET order_index = ? WHERE id = ?');
  remaining.forEach((r, idx) => stmt.run(idx, r.id));

  return res.json({ success: true });
});

// Get chapter version history
router.get('/:chapterId/versions', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const versions = db.prepare(`
    SELECT * FROM chapter_versions
    WHERE chapter_id = ? AND project_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(req.params.chapterId, req.params.projectId);

  return res.json({
    versions: versions.map(v => ({
      id: v.id,
      chapterId: v.chapter_id,
      title: v.title,
      contentHtml: v.content_html,
      wordCount: v.word_count,
      versionNumber: v.version_number,
      label: v.label,
      createdAt: v.created_at
    }))
  });
});

// Restore chapter version
router.post('/:chapterId/restore/:versionId', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const ver = db.prepare('SELECT * FROM chapter_versions WHERE id = ? AND chapter_id = ? AND project_id = ?')
    .get(req.params.versionId, req.params.chapterId, req.params.projectId);
  if (!ver) {
    return res.status(404).json({ error: 'Version snapshot not found.' });
  }

  const cur = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.chapterId);
  const nextVer = (cur.version || 1) + 1;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE chapters
    SET title = ?, content_html = ?, word_count = ?, version = ?, updated_at = ?
    WHERE id = ?
  `).run(ver.title, ver.content_html, ver.word_count, nextVer, now, req.params.chapterId);

  db.prepare(`
    INSERT INTO chapter_versions (id, chapter_id, project_id, title, content_html, word_count, version_number, label, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`ver-${crypto.randomUUID()}`, req.params.chapterId, req.params.projectId, ver.title, ver.content_html, ver.word_count, nextVer, `Restored from v${ver.version_number}`, now);

  const updated = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.chapterId);
  return res.json({ chapter: formatChapterRow(updated) });
});

module.exports = router;
