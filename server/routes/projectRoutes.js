const express = require('express');
const crypto = require('node:crypto');
const { db, countWordsFromHtml, syncStructuredContentToHtml } = require('../db');
const { requireAuth, verifyProjectOwnership } = require('../auth');
const { STARTER_TEMPLATES, PUBLICATION_TYPES, PAGE_LAYOUT_LIBRARY } = require('../templatesData');
const { formatCustomTemplate } = require('./templateRoutes');

const router = express.Router();

function resolveTemplate(templateId) {
  const starter = STARTER_TEMPLATES.find(t => t.id === templateId);
  if (starter) return starter;
  const customRow = db.prepare('SELECT * FROM custom_templates WHERE id = ?').get(templateId);
  if (customRow) return formatCustomTemplate(customRow);
  return STARTER_TEMPLATES[0];
}

function hydrateProjectSummary(projRow) {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as totalChapters,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedChapters,
      COALESCE(SUM(word_count), 0) as totalWords
    FROM chapters
    WHERE project_id = ?
  `).get(projRow.id);

  let coverConfig = {};
  try { coverConfig = JSON.parse(projRow.cover_config_json || '{}'); } catch { coverConfig = {}; }
  const tpl = resolveTemplate(projRow.template_id);
  const pubType = PUBLICATION_TYPES.find(p => p.id === (projRow.book_type || tpl?.publicationType || tpl?.bookType));

  return {
    id: projRow.id,
    userId: projRow.user_id,
    title: projRow.title,
    subtitle: projRow.subtitle || '',
    authorName: projRow.author_name || '',
    description: projRow.description || '',
    centralIdea: projRow.central_idea || '',
    targetAudience: projRow.target_audience || '',
    bookType: projRow.book_type,
    publicationType: pubType?.id || projRow.book_type || 'book',
    publicationTypeName: pubType?.name || tpl?.category || 'Publication',
    templateId: projRow.template_id,
    templateName: tpl?.name || 'Custom Publication',
    templateCategory: tpl?.category || 'General',
    status: projRow.status,
    currentStage: projRow.current_stage || 'manuscript',
    targetWordCount: projRow.target_word_count || 40000,
    totalWords: Number(stats?.totalWords || 0),
    totalChapters: Number(stats?.totalChapters || 0),
    completedChapters: Number(stats?.completedChapters || 0),
    coverConfig,
    lastOpenedChapterId: projRow.last_opened_chapter_id,
    createdAt: projRow.created_at,
    updatedAt: projRow.updated_at
  };
}

function formatChapterRow(row) {
  let guidance = {};
  let structuredData = {};
  try { guidance = JSON.parse(row.guidance_json || '{}'); } catch { guidance = {}; }
  try { structuredData = JSON.parse(row.structured_data_json || '{}'); } catch { structuredData = {}; }
  return {
    id: row.id,
    projectId: row.project_id,
    stageKey: row.stage_key,
    title: row.title,
    subtitle: row.subtitle || '',
    sectionType: row.section_type || 'chapter',
    layoutId: row.layout_id || 'longform-chapter',
    structuredData,
    orderIndex: row.order_index,
    contentHtml: row.content_html || '',
    synopsis: row.synopsis || '',
    wordCount: row.word_count || 0,
    targetWords: row.target_words || 2500,
    status: row.status || 'drafting',
    isOptional: Boolean(row.is_optional),
    guidance,
    version: row.version || 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatFormattingRow(row) {
  if (!row) return null;
  return {
    projectId: row.project_id,
    presetId: row.preset_id,
    trimSize: row.trim_size,
    marginTopMm: row.margin_top_mm,
    marginBottomMm: row.margin_bottom_mm,
    marginInnerMm: row.margin_inner_mm,
    marginOuterMm: row.margin_outer_mm,
    bodyFont: row.body_font,
    headingFont: row.heading_font,
    fontSizePt: row.font_size_pt,
    lineSpacing: row.line_spacing,
    paragraphIndentEm: row.paragraph_indent_em,
    paragraphSpacingPt: row.paragraph_spacing_pt,
    chapterDropCaps: Boolean(row.chapter_drop_caps),
    chapterOpeningStyle: row.chapter_opening_style,
    sceneBreakOrnament: row.scene_break_ornament,
    pageNumberingStyle: row.page_numbering_style,
    runningHeaderLeft: row.running_header_left,
    runningHeaderRight: row.running_header_right,
    includeToc: Boolean(row.include_toc),
    paperType: row.paper_type,
    updatedAt: row.updated_at
  };
}

function formatMetadataRow(row) {
  if (!row) return null;
  const safeParse = (str, fallback) => {
    try { return JSON.parse(str || JSON.stringify(fallback)); } catch { return fallback; }
  };
  return {
    projectId: row.project_id,
    isbnPrint: row.isbn_print || '',
    isbnEbook: row.isbn_ebook || '',
    publisherName: row.publisher_name || '',
    publicationDate: row.publication_date || '',
    edition: row.edition || 'First Edition',
    language: row.language || 'en',
    copyrightHolder: row.copyright_holder || '',
    copyrightYear: row.copyright_year || '',
    rightsStatement: row.rights_statement || '',
    licenseType: row.license_type || 'all_rights_reserved',
    bisacCategories: safeParse(row.bisac_categories_json, []),
    keywords: safeParse(row.keywords_json, []),
    longDescription: row.long_description || '',
    shortBlurb: row.short_blurb || '',
    contributors: safeParse(row.contributors_json, []),
    frontMatter: safeParse(row.front_matter_json, {}),
    backMatter: safeParse(row.back_matter_json, {}),
    platformChecklists: safeParse(row.platform_checklists_json, {}),
    updatedAt: row.updated_at
  };
}

// List user's projects
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  const projects = rows.map(hydrateProjectSummary);
  return res.json({ projects });
});

// Create a new publication project
router.post('/', requireAuth, (req, res) => {
  try {
    const {
      title,
      subtitle = '',
      authorName,
      description = '',
      centralIdea = '',
      targetAudience = '',
      bookType,
      publicationType,
      templateId = 'blank-manuscript',
      targetWordCount = 25000,
      customChapters = null,
      coverConfig = null,
      trimSize = null,
      fontFamily = null
    } = req.body || {};

    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) {
      return res.status(400).json({ error: 'Please enter a book title before saving it.' });
    }

    const tpl = resolveTemplate(templateId);
    const resolvedBookType = publicationType || bookType || tpl.publicationType || tpl.bookType || 'book';
    const resolvedAuthor = String(authorName !== undefined ? authorName : (req.user.penName || req.user.name)).trim();
    const projectId = `proj-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const defaultCover = coverConfig || {
      layout: 'editorial_frame',
      bgColor: tpl.accentColor || '#1E293B',
      accentColor: '#D4AF37',
      textColor: '#FBF8F3',
      fontFamily: tpl.recommendedFont || 'Newsreader',
      badgeText: tpl.category ? tpl.category.toUpperCase() : 'PUBLICATION',
      backBlurb: description || centralIdea || '',
      spineColor: '#0F172A'
    };

    db.prepare(`
      INSERT INTO projects (id, user_id, title, subtitle, author_name, description, central_idea, target_audience, book_type, template_id, status, current_stage, target_word_count, cover_config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', 'manuscript', ?, ?, ?, ?)
    `).run(
      projectId,
      req.user.id,
      cleanTitle,
      String(subtitle || '').trim(),
      resolvedAuthor,
      String(description || '').trim(),
      String(centralIdea || '').trim(),
      String(targetAudience || '').trim(),
      resolvedBookType,
      tpl.id,
      Number(targetWordCount) || 25000,
      JSON.stringify(defaultCover),
      now,
      now
    );

    const stagesToCreate = Array.isArray(customChapters) && customChapters.length > 0
      ? customChapters
      : (tpl.stages && tpl.stages.length > 0 ? tpl.stages : STARTER_TEMPLATES[0].stages);

    let firstChapterId = null;
    stagesToCreate.forEach((stage, idx) => {
      const chId = `ch-${crypto.randomUUID()}`;
      if (idx === 0) firstChapterId = chId;
      const sectionType = stage.sectionType || 'chapter';
      const layoutId = stage.layoutId || 'longform-chapter';
      const structuredData = stage.structuredData || {};
      const initialHtml = syncStructuredContentToHtml(sectionType, structuredData, stage.contentHtml || '');
      const wc = countWordsFromHtml(initialHtml);
      const guidanceObj = {
        purpose: stage.purpose || '',
        accomplish: stage.accomplish || '',
        questions: stage.questions || [],
        approaches: stage.approaches || [],
        subtopics: stage.subtopics || [],
        example: stage.example || '',
        commonOmissions: stage.commonOmissions || [],
        completionCriteria: stage.completionCriteria || [],
        completedCriteria: [],
        customNotes: ''
      };

      db.prepare(`
        INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, layout_id, structured_data_json, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        chId,
        projectId,
        stage.stageKey || `stage-${idx + 1}`,
        stage.title || `Section ${idx + 1}`,
        stage.subtitle || '',
        sectionType,
        layoutId,
        JSON.stringify(structuredData),
        idx,
        initialHtml,
        stage.synopsis || stage.purpose || '',
        wc,
        stage.targetWords || 1500,
        'drafting',
        stage.isOptional ? 1 : 0,
        JSON.stringify(guidanceObj),
        now,
        now
      );

      db.prepare(`
        INSERT INTO chapter_versions (id, chapter_id, project_id, title, content_html, word_count, version_number, label, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'Initial section creation', ?)
      `).run(`ver-${crypto.randomUUID()}`, chId, projectId, stage.title || `Section ${idx + 1}`, initialHtml, wc, now);
    });

    if (firstChapterId) {
      db.prepare('UPDATE projects SET last_opened_chapter_id = ? WHERE id = ?').run(firstChapterId, projectId);
    }

    // Initialize formatting settings
    const initialTrimSize = trimSize || tpl.recommendedTrimSize || '5.5x8.5';
    const initialFont = fontFamily || tpl.recommendedFont || 'Newsreader';
    db.prepare(`
      INSERT INTO formatting_settings (project_id, preset_id, trim_size, body_font, heading_font, updated_at)
      VALUES (?, 'classic_literary', ?, ?, ?, ?)
    `).run(projectId, initialTrimSize, initialFont, initialFont, now);

    // Initialize publishing metadata
    const defaultFrontMatter = {
      dedication: { enabled: (tpl.defaultFrontMatter || []).includes('dedication'), content: '' },
      epigraph: { enabled: (tpl.defaultFrontMatter || []).includes('epigraph'), content: '' },
      foreword: { enabled: false, content: '' },
      preface: { enabled: (tpl.defaultFrontMatter || []).includes('preface'), content: '' },
      acknowledgements: { enabled: (tpl.defaultFrontMatter || []).includes('acknowledgements'), content: '' }
    };
    const defaultBackMatter = {
      afterword: { enabled: false, content: '' },
      appendices: { enabled: false, content: '' },
      bibliography: { enabled: resolvedBookType === 'informational', content: '' },
      author_bio: { enabled: true, content: req.user.bio || '' },
      further_reading: { enabled: false, content: '' }
    };

    db.prepare(`
      INSERT INTO publishing_metadata (project_id, copyright_holder, language, long_description, short_blurb, contributors_json, front_matter_json, back_matter_json, updated_at)
      VALUES (?, ?, 'en', ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      resolvedAuthor,
      String(description || '').trim(),
      String(centralIdea || '').trim(),
      JSON.stringify(resolvedAuthor ? [{ name: resolvedAuthor, role: 'Author' }] : []),
      JSON.stringify(defaultFrontMatter),
      JSON.stringify(defaultBackMatter),
      now
    );

    const userRow = db.prepare('SELECT preferences_json FROM users WHERE id = ?').get(req.user.id);
    let prefs = {};
    try { prefs = JSON.parse(userRow?.preferences_json || '{}'); } catch { prefs = {}; }
    const recentTpls = Array.isArray(prefs.recentlyUsedTemplates) ? prefs.recentlyUsedTemplates : [];
    prefs.recentlyUsedTemplates = [tpl.id, ...recentTpls.filter(id => id !== tpl.id)].slice(0, 6);
    db.prepare('UPDATE users SET last_active_project_id = ?, preferences_json = ?, updated_at = ? WHERE id = ?')
      .run(projectId, JSON.stringify(prefs), now, req.user.id);

    const createdProj = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(projectId).map(formatChapterRow);

    return res.status(201).json({
      project: hydrateProjectSummary(createdProj),
      chapters
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create publication project.', details: err.message });
  }
});

// Get full project details with strict ownership check
router.get('/:id', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.id, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const projRow = ownership.project;
  const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(projRow.id).map(formatChapterRow);
  const formatting = formatFormattingRow(db.prepare('SELECT * FROM formatting_settings WHERE project_id = ?').get(projRow.id));
  const metadata = formatMetadataRow(db.prepare('SELECT * FROM publishing_metadata WHERE project_id = ?').get(projRow.id));
  const template = resolveTemplate(projRow.template_id);

  db.prepare('UPDATE users SET last_active_project_id = ? WHERE id = ?').run(projRow.id, req.user.id);

  return res.json({
    project: hydrateProjectSummary(projRow),
    chapters,
    formatting,
    metadata,
    template,
    pageLayouts: PAGE_LAYOUT_LIBRARY,
    publicationTypes: PUBLICATION_TYPES
  });
});

// Update project details
router.put('/:id', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.id, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const cur = ownership.project;
  const {
    title,
    subtitle,
    authorName,
    description,
    centralIdea,
    targetAudience,
    bookType,
    publicationType,
    status,
    currentStage,
    targetWordCount,
    coverConfig,
    lastOpenedChapterId
  } = req.body || {};

  let mergedCover = {};
  try { mergedCover = JSON.parse(cur.cover_config_json || '{}'); } catch { mergedCover = {}; }
  if (coverConfig && typeof coverConfig === 'object') {
    mergedCover = { ...mergedCover, ...coverConfig };
  }

  const resolvedBookType = publicationType !== undefined ? String(publicationType) : (bookType !== undefined ? String(bookType) : cur.book_type);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE projects
    SET title = ?,
        subtitle = ?,
        author_name = ?,
        description = ?,
        central_idea = ?,
        target_audience = ?,
        book_type = ?,
        status = ?,
        current_stage = ?,
        target_word_count = ?,
        cover_config_json = ?,
        last_opened_chapter_id = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    title !== undefined ? String(title).trim() || cur.title : cur.title,
    subtitle !== undefined ? String(subtitle).trim() : cur.subtitle,
    authorName !== undefined ? String(authorName).trim() : cur.author_name,
    description !== undefined ? String(description).trim() : cur.description,
    centralIdea !== undefined ? String(centralIdea).trim() : cur.central_idea,
    targetAudience !== undefined ? String(targetAudience).trim() : cur.target_audience,
    resolvedBookType,
    status !== undefined ? String(status) : cur.status,
    currentStage !== undefined ? String(currentStage) : cur.current_stage,
    targetWordCount !== undefined ? Number(targetWordCount) || cur.target_word_count : cur.target_word_count,
    JSON.stringify(mergedCover),
    lastOpenedChapterId !== undefined ? lastOpenedChapterId : cur.last_opened_chapter_id,
    now,
    cur.id
  );

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(cur.id);
  return res.json({ project: hydrateProjectSummary(updated) });
});

// Switch project template without losing existing writing or structured data
router.post('/:id/switch-template', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.id, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const { templateId, appendMissingStages = false, applyRecommendedLayouts = false } = req.body || {};
  const tpl = resolveTemplate(templateId);
  if (!tpl) {
    return res.status(400).json({ error: 'Selected template was not found.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE projects
    SET template_id = ?, book_type = ?, updated_at = ?
    WHERE id = ?
  `).run(tpl.id, tpl.publicationType || tpl.bookType || ownership.project.book_type, now, ownership.project.id);

  const existingChapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(ownership.project.id);

  existingChapters.forEach((ch, idx) => {
    const stageMatch = tpl.stages[idx] || tpl.stages[0];
    if (stageMatch) {
      let currentGuidance = {};
      try { currentGuidance = JSON.parse(ch.guidance_json || '{}'); } catch { currentGuidance = {}; }
      const updatedGuidance = {
        ...stageMatch,
        completedCriteria: currentGuidance.completedCriteria || [],
        customNotes: currentGuidance.customNotes || ''
      };
      const newLayoutId = applyRecommendedLayouts && stageMatch.layoutId ? stageMatch.layoutId : ch.layout_id;
      db.prepare('UPDATE chapters SET guidance_json = ?, layout_id = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(updatedGuidance), newLayoutId, now, ch.id);
    }
  });

  if (appendMissingStages && tpl.stages.length > existingChapters.length) {
    for (let i = existingChapters.length; i < tpl.stages.length; i++) {
      const stg = tpl.stages[i];
      const chId = `ch-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, layout_id, structured_data_json, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, '', ?, 0, ?, 'planned', ?, ?, 1, ?, ?)
      `).run(
        chId,
        ownership.project.id,
        stg.stageKey || `stage-${i + 1}`,
        stg.title,
        stg.sectionType || 'chapter',
        stg.layoutId || 'longform-chapter',
        JSON.stringify(stg.structuredData || {}),
        i,
        stg.purpose || '',
        stg.targetWords || 1500,
        stg.isOptional ? 1 : 0,
        JSON.stringify({ ...stg, completedCriteria: [], customNotes: '' }),
        now,
        now
      );
    }
  }

  const updatedProj = db.prepare('SELECT * FROM projects WHERE id = ?').get(ownership.project.id);
  const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(ownership.project.id).map(formatChapterRow);

  return res.json({
    project: hydrateProjectSummary(updatedProj),
    chapters,
    template: tpl
  });
});

// Duplicate a project (with chapters, formatting, metadata, notes)
router.post('/:id/duplicate', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.id, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const orig = ownership.project;
  const newProjectId = `proj-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const newTitle = req.body?.title ? String(req.body.title).trim() : `${orig.title} (Copy)`;

  db.prepare(`
    INSERT INTO projects (id, user_id, title, subtitle, author_name, description, central_idea, target_audience, book_type, template_id, status, current_stage, target_word_count, cover_config_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
  `).run(
    newProjectId,
    req.user.id,
    newTitle,
    orig.subtitle,
    orig.author_name,
    orig.description,
    orig.central_idea,
    orig.target_audience,
    orig.book_type,
    orig.template_id,
    orig.current_stage,
    orig.target_word_count,
    orig.cover_config_json,
    now,
    now
  );

  const chapterMap = new Map();
  const origChapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(orig.id);
  let firstNewChId = null;

  origChapters.forEach((ch, idx) => {
    const newChId = `ch-${crypto.randomUUID()}`;
    if (idx === 0) firstNewChId = newChId;
    chapterMap.set(ch.id, newChId);

    db.prepare(`
      INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, layout_id, structured_data_json, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      newChId, newProjectId, ch.stage_key, ch.title, ch.subtitle, ch.section_type, ch.layout_id || 'longform-chapter', ch.structured_data_json || '{}', ch.order_index,
      ch.content_html, ch.synopsis, ch.word_count, ch.target_words, ch.status, ch.is_optional, ch.guidance_json, now, now
    );
  });

  if (firstNewChId) {
    db.prepare('UPDATE projects SET last_opened_chapter_id = ? WHERE id = ?').run(firstNewChId, newProjectId);
  }

  const origFmt = db.prepare('SELECT * FROM formatting_settings WHERE project_id = ?').get(orig.id);
  if (origFmt) {
    db.prepare(`
      INSERT INTO formatting_settings (project_id, preset_id, trim_size, margin_top_mm, margin_bottom_mm, margin_inner_mm, margin_outer_mm, body_font, heading_font, font_size_pt, line_spacing, paragraph_indent_em, paragraph_spacing_pt, chapter_drop_caps, chapter_opening_style, scene_break_ornament, page_numbering_style, running_header_left, running_header_right, include_toc, paper_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newProjectId, origFmt.preset_id, origFmt.trim_size, origFmt.margin_top_mm, origFmt.margin_bottom_mm, origFmt.margin_inner_mm, origFmt.margin_outer_mm,
      origFmt.body_font, origFmt.heading_font, origFmt.font_size_pt, origFmt.line_spacing, origFmt.paragraph_indent_em, origFmt.paragraph_spacing_pt,
      origFmt.chapter_drop_caps, origFmt.chapter_opening_style, origFmt.scene_break_ornament, origFmt.page_numbering_style,
      origFmt.running_header_left, origFmt.running_header_right, origFmt.include_toc, origFmt.paper_type, now
    );
  }

  const origMeta = db.prepare('SELECT * FROM publishing_metadata WHERE project_id = ?').get(orig.id);
  if (origMeta) {
    db.prepare(`
      INSERT INTO publishing_metadata (project_id, publisher_name, edition, language, copyright_holder, copyright_year, rights_statement, license_type, bisac_categories_json, keywords_json, long_description, short_blurb, contributors_json, front_matter_json, back_matter_json, platform_checklists_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newProjectId, origMeta.publisher_name, origMeta.edition, origMeta.language, origMeta.copyright_holder, origMeta.copyright_year,
      origMeta.rights_statement, origMeta.license_type, origMeta.bisac_categories_json, origMeta.keywords_json,
      origMeta.long_description, origMeta.short_blurb, origMeta.contributors_json, origMeta.front_matter_json, origMeta.back_matter_json,
      origMeta.platform_checklists_json, now
    );
  }

  const origNotes = db.prepare('SELECT * FROM notes WHERE project_id = ?').all(orig.id);
  for (const n of origNotes) {
    db.prepare(`
      INSERT INTO notes (id, project_id, note_type, title, content, metadata_json, linked_chapter_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `note-${crypto.randomUUID()}`,
      newProjectId,
      n.note_type,
      n.title,
      n.content,
      n.metadata_json,
      n.linked_chapter_id ? (chapterMap.get(n.linked_chapter_id) || null) : null,
      now,
      now
    );
  }

  const newProjRow = db.prepare('SELECT * FROM projects WHERE id = ?').get(newProjectId);
  return res.status(201).json({ project: hydrateProjectSummary(newProjRow) });
});

// Delete a project
router.delete('/:id', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.id, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Update formatting settings
router.put('/:id/formatting', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.id, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const cur = db.prepare('SELECT * FROM formatting_settings WHERE project_id = ?').get(req.params.id);
  const b = req.body || {};
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE formatting_settings
    SET preset_id = ?,
        trim_size = ?,
        margin_top_mm = ?,
        margin_bottom_mm = ?,
        margin_inner_mm = ?,
        margin_outer_mm = ?,
        body_font = ?,
        heading_font = ?,
        font_size_pt = ?,
        line_spacing = ?,
        paragraph_indent_em = ?,
        paragraph_spacing_pt = ?,
        chapter_drop_caps = ?,
        chapter_opening_style = ?,
        scene_break_ornament = ?,
        page_numbering_style = ?,
        running_header_left = ?,
        running_header_right = ?,
        include_toc = ?,
        paper_type = ?,
        updated_at = ?
    WHERE project_id = ?
  `).run(
    b.presetId ?? cur.preset_id,
    b.trimSize ?? cur.trim_size,
    b.marginTopMm !== undefined ? Number(b.marginTopMm) : cur.margin_top_mm,
    b.marginBottomMm !== undefined ? Number(b.marginBottomMm) : cur.margin_bottom_mm,
    b.marginInnerMm !== undefined ? Number(b.marginInnerMm) : cur.margin_inner_mm,
    b.marginOuterMm !== undefined ? Number(b.marginOuterMm) : cur.margin_outer_mm,
    b.bodyFont ?? cur.body_font,
    b.headingFont ?? cur.heading_font,
    b.fontSizePt !== undefined ? Number(b.fontSizePt) : cur.font_size_pt,
    b.lineSpacing !== undefined ? Number(b.lineSpacing) : cur.line_spacing,
    b.paragraphIndentEm !== undefined ? Number(b.paragraphIndentEm) : cur.paragraph_indent_em,
    b.paragraphSpacingPt !== undefined ? Number(b.paragraphSpacingPt) : cur.paragraph_spacing_pt,
    b.chapterDropCaps !== undefined ? (b.chapterDropCaps ? 1 : 0) : cur.chapter_drop_caps,
    b.chapterOpeningStyle ?? cur.chapter_opening_style,
    b.sceneBreakOrnament ?? cur.scene_break_ornament,
    b.pageNumberingStyle ?? cur.page_numbering_style,
    b.runningHeaderLeft ?? cur.running_header_left,
    b.runningHeaderRight ?? cur.running_header_right,
    b.includeToc !== undefined ? (b.includeToc ? 1 : 0) : cur.include_toc,
    b.paperType ?? cur.paper_type,
    now,
    req.params.id
  );

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, req.params.id);
  const updated = db.prepare('SELECT * FROM formatting_settings WHERE project_id = ?').get(req.params.id);
  return res.json({ formatting: formatFormattingRow(updated) });
});

// Update publishing metadata & front/back matter
router.put('/:id/metadata', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.id, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const cur = db.prepare('SELECT * FROM publishing_metadata WHERE project_id = ?').get(req.params.id);
  const b = req.body || {};
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE publishing_metadata
    SET isbn_print = ?,
        isbn_ebook = ?,
        publisher_name = ?,
        publication_date = ?,
        edition = ?,
        language = ?,
        copyright_holder = ?,
        copyright_year = ?,
        rights_statement = ?,
        license_type = ?,
        bisac_categories_json = ?,
        keywords_json = ?,
        long_description = ?,
        short_blurb = ?,
        contributors_json = ?,
        front_matter_json = ?,
        back_matter_json = ?,
        platform_checklists_json = ?,
        updated_at = ?
    WHERE project_id = ?
  `).run(
    b.isbnPrint !== undefined ? String(b.isbnPrint).trim() : cur.isbn_print,
    b.isbnEbook !== undefined ? String(b.isbnEbook).trim() : cur.isbn_ebook,
    b.publisherName !== undefined ? String(b.publisherName).trim() : cur.publisher_name,
    b.publicationDate !== undefined ? String(b.publicationDate).trim() : cur.publication_date,
    b.edition !== undefined ? String(b.edition).trim() : cur.edition,
    b.language !== undefined ? String(b.language).trim() : cur.language,
    b.copyrightHolder !== undefined ? String(b.copyrightHolder).trim() : cur.copyright_holder,
    b.copyrightYear !== undefined ? String(b.copyrightYear).trim() : cur.copyright_year,
    b.rightsStatement !== undefined ? String(b.rightsStatement) : cur.rights_statement,
    b.licenseType !== undefined ? String(b.licenseType) : cur.license_type,
    b.bisacCategories !== undefined ? JSON.stringify(b.bisacCategories) : cur.bisac_categories_json,
    b.keywords !== undefined ? JSON.stringify(b.keywords) : cur.keywords_json,
    b.longDescription !== undefined ? String(b.longDescription) : cur.long_description,
    b.shortBlurb !== undefined ? String(b.shortBlurb) : cur.short_blurb,
    b.contributors !== undefined ? JSON.stringify(b.contributors) : cur.contributors_json,
    b.frontMatter !== undefined ? JSON.stringify(b.frontMatter) : cur.front_matter_json,
    b.backMatter !== undefined ? JSON.stringify(b.backMatter) : cur.back_matter_json,
    b.platformChecklists !== undefined ? JSON.stringify(b.platformChecklists) : cur.platform_checklists_json,
    now,
    req.params.id
  );

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, req.params.id);
  const updated = db.prepare('SELECT * FROM publishing_metadata WHERE project_id = ?').get(req.params.id);
  return res.json({ metadata: formatMetadataRow(updated) });
});

module.exports = {
  router,
  hydrateProjectSummary,
  formatChapterRow,
  formatFormattingRow,
  formatMetadataRow,
  resolveTemplate
};
