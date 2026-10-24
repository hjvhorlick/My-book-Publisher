const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { STARTER_TEMPLATES } = require('./templatesData');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'publisher.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}

const RICH_TEXT_ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'strong', 'b', 'em', 'i', 'u', 'span', 'ul', 'ol', 'li',
  'blockquote', 'h1', 'h2', 'h3', 'h4'
]);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeRichHtmlServer(value = '') {
  let html = String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*\/?\s*>/gi, '');

  return html.replace(/<\/?([a-z0-9]+)\b([^>]*)>/gi, (tag, rawName, rawAttributes) => {
    const name = String(rawName).toLowerCase();
    if (!RICH_TEXT_ALLOWED_TAGS.has(name)) return '';
    if (/^<\//.test(tag)) return name === 'br' ? '' : `</${name}>`;
    if (name === 'br') return '<br />';
    const styleMatch = String(rawAttributes || '').match(/\bstyle\s*=\s*(["'])(.*?)\1/i);
    const acceptedStyles = [];
    if (styleMatch) {
      for (const declaration of styleMatch[2].split(';')) {
        const colon = declaration.indexOf(':');
        if (colon < 0) continue;
        const property = declaration.slice(0, colon).trim().toLowerCase();
        const styleValue = declaration.slice(colon + 1).trim();
        if (property === 'text-align' && /^(left|center|right|justify)$/i.test(styleValue)) {
          acceptedStyles.push(`text-align:${styleValue.toLowerCase()}`);
        } else if (property === 'color' && /^(#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\))$/i.test(styleValue)) {
          acceptedStyles.push(`color:${styleValue}`);
        } else if (property === 'font-weight' && /^(bold|[1-9]00)$/i.test(styleValue)) {
          acceptedStyles.push(`font-weight:${styleValue}`);
        } else if (property === 'font-style' && /^(italic|normal)$/i.test(styleValue)) {
          acceptedStyles.push(`font-style:${styleValue}`);
        } else if (property === 'text-decoration' && /^(underline|line-through|none)$/i.test(styleValue)) {
          acceptedStyles.push(`text-decoration:${styleValue}`);
        }
      }
    }
    return `<${name}${acceptedStyles.length ? ` style="${escapeHtml(acceptedStyles.join(';'))}"` : ''}>`;
  });
}

function toRichHtml(value) {
  const text = String(value || '');
  if (!text.trim()) return '';
  if (/<\/?[a-z][^>]*>/i.test(text)) return sanitizeRichHtmlServer(text);
  return `<p>${escapeHtml(text).replace(/\r\n?/g, '\n').replace(/\n/g, '<br />')}</p>`;
}

function countWordsFromHtml(html = '') {
  const text = String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

function syncStructuredContentToHtml(sectionType, structuredData = {}, existingHtml = '') {
  if (!structuredData || Object.keys(structuredData).length === 0) {
    return existingHtml || '';
  }

  if (sectionType === 'recipe') {
    const parts = [];
    if (structuredData.headnote) {
      parts.push(`<blockquote>${toRichHtml(structuredData.headnote)}</blockquote>`);
    }
    const metaBadges = [
      structuredData.course && `Course: ${structuredData.course}`,
      structuredData.prepTime && `Prep: ${structuredData.prepTime}`,
      structuredData.cookTime && `Cook: ${structuredData.cookTime}`,
      structuredData.servings && `Yield: ${structuredData.servings}`,
      structuredData.difficulty && `Difficulty: ${structuredData.difficulty}`
    ].filter(Boolean);
    if (metaBadges.length > 0) {
      parts.push(`<p><strong>${escapeHtml(metaBadges.join('  •  '))}</strong></p>`);
    }
    if (structuredData.ingredientsHtml) {
      parts.push('<h2>Ingredients</h2>');
      parts.push(toRichHtml(structuredData.ingredientsHtml));
    } else if (Array.isArray(structuredData.ingredients) && structuredData.ingredients.length > 0) {
      parts.push('<h2>Ingredients</h2>');
      parts.push(
        `<ul>${structuredData.ingredients
          .map((ing) => `<li><strong>${escapeHtml([ing.quantity, ing.unit].filter(Boolean).join(' '))}</strong> ${escapeHtml(ing.item || '')}${ing.group ? ` <em>(${escapeHtml(ing.group)})</em>` : ''}</li>`)
          .join('')}</ul>`
      );
    }
    if (structuredData.stepsHtml) {
      parts.push('<h2>Preparation &amp; Method</h2>');
      parts.push(toRichHtml(structuredData.stepsHtml));
    } else if (Array.isArray(structuredData.steps) && structuredData.steps.length > 0) {
      parts.push('<h2>Preparation &amp; Method</h2>');
      parts.push(`<ol>${structuredData.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`);
    } else if (typeof structuredData.steps === 'string' && structuredData.steps.trim()) {
      parts.push('<h2>Preparation &amp; Method</h2>');
      parts.push(toRichHtml(structuredData.steps));
    }
    if (structuredData.chefNotes) {
      parts.push('<h2>Chef’s Note</h2>');
      parts.push(toRichHtml(structuredData.chefNotes));
    }
    return parts.join('\n');
  }

  if (sectionType === 'magazine_article' && !existingHtml) {
    const parts = [];
    if (structuredData.kicker) parts.push(`<p><strong>${escapeHtml(structuredData.kicker)}</strong></p>`);
    if (structuredData.deck) parts.push(`<h3>${escapeHtml(structuredData.deck)}</h3>`);
    if (structuredData.byline) parts.push(`<p><em>${escapeHtml(structuredData.byline)}</em></p>`);
    if (structuredData.pullQuote) parts.push(`<blockquote>${toRichHtml(structuredData.pullQuote)}</blockquote>`);
    if (structuredData.bodyText) parts.push(toRichHtml(structuredData.bodyText));
    return parts.join('\n') || existingHtml;
  }

  return existingHtml;
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      pen_name TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      reset_token TEXT DEFAULT NULL,
      reset_expires_at TEXT DEFAULT NULL,
      subscription_tier TEXT DEFAULT 'studio_free',
      preferences_json TEXT NOT NULL DEFAULT '{}',
      last_active_project_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_provider_settings (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      encrypted_api_key TEXT NOT NULL,
      model TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      request_count INTEGER NOT NULL DEFAULT 0,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT DEFAULT NULL,
      last_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, provider),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS image_provider_settings (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('pexels', 'pixabay')),
      encrypted_api_key TEXT NOT NULL,
      last_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, provider),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      book_type TEXT NOT NULL,
      tagline TEXT DEFAULT '',
      description TEXT DEFAULT '',
      intended_audience TEXT DEFAULT '',
      accent_color TEXT DEFAULT '#4A5568',
      recommended_trim_size TEXT DEFAULT '5.5x8.5',
      recommended_font TEXT DEFAULT 'Newsreader',
      stages_json TEXT NOT NULL DEFAULT '[]',
      enabled_tools_json TEXT NOT NULL DEFAULT '[]',
      default_front_matter_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      author_name TEXT DEFAULT '',
      description TEXT DEFAULT '',
      central_idea TEXT DEFAULT '',
      target_audience TEXT DEFAULT '',
      book_type TEXT NOT NULL DEFAULT 'book',
      template_id TEXT NOT NULL DEFAULT 'blank-manuscript',
      status TEXT NOT NULL DEFAULT 'in_progress',
      current_stage TEXT NOT NULL DEFAULT 'manuscript',
      target_word_count INTEGER NOT NULL DEFAULT 40000,
      cover_config_json TEXT NOT NULL DEFAULT '{}',
      introduction_json TEXT NOT NULL DEFAULT '{}',
      last_opened_chapter_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      stage_key TEXT DEFAULT '',
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      section_type TEXT NOT NULL DEFAULT 'chapter',
      layout_id TEXT NOT NULL DEFAULT 'longform-chapter',
      structured_data_json TEXT NOT NULL DEFAULT '{}',
      order_index INTEGER NOT NULL DEFAULT 0,
      content_html TEXT NOT NULL DEFAULT '',
      synopsis TEXT DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      target_words INTEGER NOT NULL DEFAULT 2500,
      status TEXT NOT NULL DEFAULT 'drafting',
      is_optional INTEGER NOT NULL DEFAULT 0,
      guidance_json TEXT NOT NULL DEFAULT '{}',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapter_versions (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_html TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      version_number INTEGER NOT NULL DEFAULT 1,
      label TEXT DEFAULT 'Autosave snapshot',
      created_at TEXT NOT NULL,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      note_type TEXT NOT NULL DEFAULT 'research',
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      linked_chapter_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (linked_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      data_url TEXT NOT NULL,
      caption TEXT DEFAULT '',
      alt_text TEXT DEFAULT '',
      source_url TEXT DEFAULT '',
      creator_attribution TEXT DEFAULT '',
      license_url TEXT DEFAULT '',
      license_type TEXT NOT NULL DEFAULT 'own_work',
      placement_notes TEXT DEFAULT '',
      alignment TEXT NOT NULL DEFAULT 'center',
      width_percent INTEGER NOT NULL DEFAULT 80,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS formatting_settings (
      project_id TEXT PRIMARY KEY,
      preset_id TEXT NOT NULL DEFAULT 'classic_literary',
      trim_size TEXT NOT NULL DEFAULT '5.5x8.5',
      margin_top_mm REAL NOT NULL DEFAULT 19,
      margin_bottom_mm REAL NOT NULL DEFAULT 19,
      margin_inner_mm REAL NOT NULL DEFAULT 22,
      margin_outer_mm REAL NOT NULL DEFAULT 16,
      body_font TEXT NOT NULL DEFAULT 'Newsreader',
      heading_font TEXT NOT NULL DEFAULT 'Newsreader',
      font_size_pt REAL NOT NULL DEFAULT 11.5,
      line_spacing REAL NOT NULL DEFAULT 1.45,
      paragraph_indent_em REAL NOT NULL DEFAULT 1.5,
      paragraph_spacing_pt REAL NOT NULL DEFAULT 0,
      chapter_drop_caps INTEGER NOT NULL DEFAULT 1,
      chapter_opening_style TEXT NOT NULL DEFAULT 'classic_centered',
      scene_break_ornament TEXT NOT NULL DEFAULT '* * *',
      page_numbering_style TEXT NOT NULL DEFAULT 'bottom_center',
      running_header_left TEXT NOT NULL DEFAULT 'author',
      running_header_right TEXT NOT NULL DEFAULT 'book_title',
      include_toc INTEGER NOT NULL DEFAULT 1,
      paper_type TEXT NOT NULL DEFAULT 'cream',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS publishing_metadata (
      project_id TEXT PRIMARY KEY,
      isbn_print TEXT DEFAULT '',
      isbn_ebook TEXT DEFAULT '',
      publisher_name TEXT DEFAULT '',
      publication_date TEXT DEFAULT '',
      edition TEXT DEFAULT 'First Edition',
      language TEXT NOT NULL DEFAULT 'en',
      copyright_holder TEXT DEFAULT '',
      copyright_year TEXT DEFAULT '',
      rights_statement TEXT DEFAULT 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form without prior written permission of the copyright holder.',
      license_type TEXT DEFAULT 'all_rights_reserved',
      bisac_categories_json TEXT NOT NULL DEFAULT '[]',
      keywords_json TEXT NOT NULL DEFAULT '[]',
      long_description TEXT DEFAULT '',
      short_blurb TEXT DEFAULT '',
      contributors_json TEXT NOT NULL DEFAULT '[]',
      front_matter_json TEXT NOT NULL DEFAULT '{}',
      back_matter_json TEXT NOT NULL DEFAULT '{}',
      platform_checklists_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Ensure new columns exist on existing databases
  const chCols = db.prepare('PRAGMA table_info(chapters)').all().map(c => c.name);
  if (!chCols.includes('layout_id')) {
    db.exec(`ALTER TABLE chapters ADD COLUMN layout_id TEXT NOT NULL DEFAULT 'longform-chapter';`);
  }
  if (!chCols.includes('structured_data_json')) {
    db.exec(`ALTER TABLE chapters ADD COLUMN structured_data_json TEXT NOT NULL DEFAULT '{}';`);
  }

  const assetCols = db.prepare('PRAGMA table_info(assets)').all().map((column) => column.name);
  if (!assetCols.includes('license_url')) {
    db.exec(`ALTER TABLE assets ADD COLUMN license_url TEXT NOT NULL DEFAULT '';`);
  }

  // The full-page Introduction (words of expression / dedication) editor stores its
  // content on the project row; migrate databases created before the column existed.
  const projCols = db.prepare('PRAGMA table_info(projects)').all().map((column) => column.name);
  if (!projCols.includes('introduction_json')) {
    db.exec(`ALTER TABLE projects ADD COLUMN introduction_json TEXT NOT NULL DEFAULT '{}';`);
  }

  // Gemini 2.5 Flash-Lite and Gemini 3.7 Flash are no longer the current
  // stable target. Move existing Gemini settings to the active 3.8 Flash model.
  db.prepare(`
    UPDATE ai_provider_settings
    SET model = 'gemini-3.8-flash', updated_at = ?
    WHERE provider = 'gemini'
      AND (model LIKE 'gemini-2.5-%' OR model = 'gemini-3.7-flash')
  `).run(new Date().toISOString());

  if (process.env.GEMINI_API_KEY) {
    try {
      const { encryptCredential, decryptCredential } = require('./aiCredentialCrypto');
      const claraRow = db.prepare('SELECT encrypted_api_key FROM ai_provider_settings WHERE user_id = ? AND provider = ?').get('user-demo-clara', 'gemini');
      let shouldSeedKey = false;
      if (!claraRow) {
        shouldSeedKey = true;
      } else {
        try {
          const dec = decryptCredential(claraRow.encrypted_api_key);
          if (dec.includes(' ') || dec.length > 80 || dec.length < 15) {
            shouldSeedKey = true;
          }
        } catch {
          shouldSeedKey = true;
        }
      }
      if (shouldSeedKey) {
        const encKey = encryptCredential(process.env.GEMINI_API_KEY);
        db.prepare(`
          INSERT INTO ai_provider_settings (user_id, provider, encrypted_api_key, model, priority, created_at, updated_at)
          VALUES ('user-demo-clara', 'gemini', ?, 'gemini-3.8-flash', 1, ?, ?)
          ON CONFLICT(user_id, provider) DO UPDATE SET encrypted_api_key = excluded.encrypted_api_key, last_error = '', updated_at = excluded.updated_at
        `).run(encKey, new Date().toISOString(), new Date().toISOString());
      }
    } catch {}
  }

  seedDemoAccountIfNeeded();
}

function seedDemoAccountIfNeeded() {
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('clara.vance@example.com');
  const now = new Date().toISOString();
  const userId = 'user-demo-clara';

  if (!existingUser) {
    const { hash, salt } = hashPassword('StudioAuthor2026!');
    const defaultPrefs = {
      theme: 'light',
      editorFont: 'Newsreader',
      editorFontSize: 18,
      editorLineHeight: 1.75,
      editorWidth: 'comfortable',
      aiConsentAccepted: true,
      recentlyUsedTemplates: ['culinary-cookbook', 'editorial-magazine', 'illustrated-storybook', 'informational-reference']
    };

    db.prepare(`
      INSERT INTO users (id, email, name, pen_name, bio, password_hash, password_salt, subscription_tier, preferences_json, last_active_project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      'clara.vance@example.com',
      'Clara Vance',
      'C. E. Vance',
      'Clara Vance is a creative director, culinary author, and literary editor.',
      hash,
      salt,
      'studio_pro',
      JSON.stringify(defaultPrefs),
      'proj-demo-cookbook',
      now,
      now
    );
  }

  // Seed Sample 1: Artisan Cookbook (if not yet present)
  const hasCookbook = db.prepare('SELECT id FROM projects WHERE id = ?').get('proj-demo-cookbook');
  if (!hasCookbook) {
    const cookTpl = STARTER_TEMPLATES.find(t => t.id === 'culinary-cookbook');
    const cookCover = {
      layout: 'editorial_frame',
      bgColor: '#78350F',
      accentColor: '#FBBF24',
      textColor: '#FFFBEB',
      fontFamily: 'Newsreader',
      badgeText: 'SEASONAL RECIPES & KITCHEN CRAFT',
      backBlurb: 'Forty recipes celebrating roasted roots, wild herbs, slow-simmered broths, and rustic hearth baking.',
      spineColor: '#451A03'
    };

    db.prepare(`
      INSERT INTO projects (id, user_id, title, subtitle, author_name, description, central_idea, target_audience, book_type, template_id, status, current_stage, target_word_count, cover_config_json, last_opened_chapter_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', 'manuscript', 25000, ?, 'ch-demo-cook-2', ?, ?)
    `).run(
      'proj-demo-cookbook',
      userId,
      'The Botanical Table',
      'Seasonal Recipes, Roasted Roots & Herb-Infused Gatherings',
      'Clara Vance',
      'An artisan cookbook with structured recipes, pantry matrices, prep/cook timings, and step-by-step culinary techniques.',
      'Simple seasonal ingredients elevated by high-heat roasting, herb oils, and unhurried hospitality.',
      'Home cooks and lovers of seasonal kitchen craft.',
      'cookbook',
      'culinary-cookbook',
      JSON.stringify(cookCover),
      now,
      now
    );

    cookTpl.stages.forEach((stg, idx) => {
      const chId = `ch-demo-cook-${idx + 1}`;
      const html = syncStructuredContentToHtml(stg.sectionType, stg.structuredData, `<p>${stg.example || stg.purpose}</p>`);
      const wc = countWordsFromHtml(html);
      db.prepare(`
        INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, layout_id, structured_data_json, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
        VALUES (?, 'proj-demo-cookbook', ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)
      `).run(
        chId,
        stg.stageKey,
        stg.title,
        stg.sectionType,
        stg.layoutId || 'recipe-classic-card',
        JSON.stringify(stg.structuredData || {}),
        idx,
        html,
        stg.purpose,
        wc,
        stg.targetWords || 800,
        idx === 1 ? 'completed' : 'drafting',
        JSON.stringify(stg),
        now,
        now
      );
    });

    db.prepare(`
      INSERT INTO formatting_settings (project_id, preset_id, trim_size, body_font, heading_font, font_size_pt, line_spacing, chapter_drop_caps, chapter_opening_style, paper_type, updated_at)
      VALUES ('proj-demo-cookbook', 'modern_nonfiction', '7.5x9.5', 'Newsreader', 'Inter', 11, 1.45, 0, 'modern_left', 'white', ?)
    `).run(now);

    db.prepare(`
      INSERT INTO publishing_metadata (project_id, publisher_name, edition, language, copyright_holder, copyright_year, bisac_categories_json, keywords_json, long_description, short_blurb, contributors_json, front_matter_json, back_matter_json, platform_checklists_json, updated_at)
      VALUES ('proj-demo-cookbook', 'Hearthstone Kitchen Press', 'First Edition', 'en', 'Clara Vance', '2026', '["COOKING / Seasonal"]', '["cookbook", "seasonal recipes", "botanical kitchen"]', ?, 'Seasonal recipes and kitchen craft.', '[{"name":"Clara Vance","role":"Author"}]', '{}', '{}', '{}', ?)
    `).run(cookCover.backBlurb, now);
  }

  // Seed Sample 2: Editorial Magazine Issue (if not yet present)
  const hasMagazine = db.prepare('SELECT id FROM projects WHERE id = ?').get('proj-demo-magazine');
  if (!hasMagazine) {
    const magTpl = STARTER_TEMPLATES.find(t => t.id === 'editorial-magazine');
    const magCover = {
      layout: 'editorial_frame',
      bgColor: '#7F1D1D',
      accentColor: '#FDE68A',
      textColor: '#FFFFFF',
      fontFamily: 'Inter',
      badgeText: 'ISSUE 04 • AUTUMN / WINTER',
      backBlurb: 'FORMA is an independent quarterly magazine devoted to architecture, daylighting, and tactile craft.',
      spineColor: '#450A0A'
    };

    db.prepare(`
      INSERT INTO projects (id, user_id, title, subtitle, author_name, description, central_idea, target_audience, book_type, template_id, status, current_stage, target_word_count, cover_config_json, last_opened_chapter_id, created_at, updated_at)
      VALUES ('proj-demo-magazine', ?, 'FORMA Quarterly — Issue 04', 'Architecture, Daylight & The Tactile Workshop', 'Clara Vance, Editor', 'An independent editorial magazine featuring two-column layouts, pull-quotes, architectural dossiers, and visual spreads.', 'Celebrating physical materials and quiet daylight in contemporary architecture.', 'Designers, architects, and visual readers.', 'magazine', 'editorial-magazine', 'in_progress', 'design', 15000, ?, 'ch-demo-mag-2', ?, ?)
    `).run(userId, JSON.stringify(magCover), now, now);

    magTpl.stages.forEach((stg, idx) => {
      const chId = `ch-demo-mag-${idx + 1}`;
      const bodyHtml = `<h2>${stg.structuredData?.headline || stg.title}</h2><p class="lead">${stg.structuredData?.deck || ''}</p><p>${stg.example}</p><blockquote>${stg.structuredData?.pullQuote || ''}</blockquote><p>Across coastal studios from Bergen to Kyoto, craftspeople are returning to joinery that breathes with the seasons, pairing lime plaster and unlacquered brass with generous northern skylights.</p>`;
      const wc = countWordsFromHtml(bodyHtml);
      db.prepare(`
        INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, layout_id, structured_data_json, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
        VALUES (?, 'proj-demo-magazine', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'drafting', 0, ?, 1, ?, ?)
      `).run(
        chId,
        stg.stageKey,
        stg.title,
        stg.structuredData?.deck || '',
        stg.sectionType,
        stg.layoutId || 'magazine-cover-feature',
        JSON.stringify(stg.structuredData || {}),
        idx,
        bodyHtml,
        stg.purpose,
        wc,
        stg.targetWords || 1500,
        JSON.stringify(stg),
        now,
        now
      );
    });

    db.prepare(`
      INSERT INTO formatting_settings (project_id, preset_id, trim_size, body_font, heading_font, font_size_pt, line_spacing, chapter_drop_caps, chapter_opening_style, paper_type, updated_at)
      VALUES ('proj-demo-magazine', 'modern_nonfiction', '8.5x11', 'Inter', 'Newsreader', 10.5, 1.4, 1, 'modern_left', 'white', ?)
    `).run(now);

    db.prepare(`
      INSERT INTO publishing_metadata (project_id, publisher_name, edition, language, copyright_holder, copyright_year, bisac_categories_json, keywords_json, long_description, short_blurb, contributors_json, front_matter_json, back_matter_json, platform_checklists_json, updated_at)
      VALUES ('proj-demo-magazine', 'FORMA Studio Press', 'Issue 04', 'en', 'FORMA Media', '2026', '["DESIGN / Editorial"]', '["magazine", "architecture", "design"]', ?, 'Quarterly architecture and craft magazine.', '[{"name":"Clara Vance","role":"Editor"}]', '{}', '{}', '{}', ?)
    `).run(magCover.backBlurb, now);
  }

  // Seed Sample 3: Nonfiction / Self-Help Book (if not yet present)
  const hasForgiveness = db.prepare('SELECT id FROM projects WHERE id = ?').get('proj-demo-forgiveness');
  if (!hasForgiveness) {
    const p1Id = 'proj-demo-forgiveness';
    const shTemplate = STARTER_TEMPLATES.find(t => t.id === 'self-help-transformation');
    const p1Cover = {
      layout: 'editorial_frame',
      bgColor: '#13382E',
      accentColor: '#D4AF37',
      textColor: '#FBF8F3',
      fontFamily: 'Newsreader',
      badgeText: 'A PRACTICAL & COMPASSIONATE GUIDE',
      backBlurb: 'What if forgiveness is not about erasing the past, but about reclaiming your future?',
      spineColor: '#0E2921'
    };

    db.prepare(`
      INSERT INTO projects (id, user_id, title, subtitle, author_name, description, central_idea, target_audience, book_type, template_id, status, current_stage, target_word_count, cover_config_json, last_opened_chapter_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'book', 'self-help-transformation', 'in_progress', 'manuscript', 35000, ?, 'ch-demo-forgiveness-1', ?, ?)
    `).run(
      p1Id,
      userId,
      'The Architecture of Forgiveness',
      'Rebuilding Trust, Releasing Resentment, and Reclaiming Peace',
      'Clara Vance',
      'An empathetic, practical exploration of how human beings process hurt, set healthy boundaries, and practice forgiveness.',
      'Forgiveness is a deliberate architecture of honesty, boundaries, and gradual release.',
      'Readers navigating personal healing.',
      JSON.stringify(p1Cover),
      now,
      now
    );

    const ch1Html = `<h2>The Myth of the Sudden Erasure</h2><p>Forgiveness is often sold to us as a sudden, sweeping erasure of pain. When a bridge collapses in winter, engineers do not stand on the riverbank and wish the stones back into an arch. They survey the current and test the bedrock.</p><blockquote>“To forgive is not to declare that the fracture never happened; it is to decide that the fracture will no longer serve as the foundation of your house.”</blockquote>`;
    const wc = countWordsFromHtml(ch1Html);
    db.prepare(`
      INSERT INTO chapters (id, project_id, stage_key, title, subtitle, section_type, layout_id, structured_data_json, order_index, content_html, synopsis, word_count, target_words, status, is_optional, guidance_json, version, created_at, updated_at)
      VALUES ('ch-demo-forgiveness-1', ?, 'sh-empathy', 'Chapter 1: Meeting the Reader Where They Are', 'Dismantling the Myths Around Letting Go', 'chapter', 'longform-chapter', '{}', 0, ?, 'Validate the reader’s struggle with forgiveness.', ?, 2500, 'completed', 0, ?, 1, ?, ?)
    `).run(p1Id, ch1Html, wc, JSON.stringify(shTemplate.stages[0]), now, now);

    db.prepare(`
      INSERT INTO formatting_settings (project_id, preset_id, trim_size, body_font, heading_font, font_size_pt, line_spacing, chapter_drop_caps, chapter_opening_style, updated_at)
      VALUES (?, 'classic_literary', '5.5x8.5', 'Newsreader', 'Newsreader', 11.5, 1.5, 1, 'classic_centered', ?)
    `).run(p1Id, now);

    db.prepare(`
      INSERT INTO publishing_metadata (project_id, publisher_name, edition, language, copyright_holder, copyright_year, bisac_categories_json, keywords_json, long_description, short_blurb, contributors_json, front_matter_json, back_matter_json, platform_checklists_json, updated_at)
      VALUES (?, 'Hearthstone Literary Press', 'First Edition', 'en', 'Clara Vance', '2026', '["SELF-HELP / Personal Growth"]', '["forgiveness", "healing"]', ?, 'A compassionate guide to rebuilding peace.', '[{"name":"Clara Vance","role":"Author"}]', '{}', '{}', '{}', ?)
    `).run(p1Id, p1Cover.backBlurb, now);
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const { encryptCredential } = require('./aiCredentialCrypto');
      const enc = encryptCredential(process.env.GEMINI_API_KEY);
      db.prepare(`
        INSERT INTO ai_provider_settings (
          user_id, provider, encrypted_api_key, model, priority,
          request_count, prompt_tokens, completion_tokens, total_tokens,
          last_used_at, last_error, created_at, updated_at
        ) VALUES ('user-demo-clara', 'gemini', ?, 'gemini-3.8-flash', 1, 0, 0, 0, 0, NULL, '', ?, ?)
        ON CONFLICT(user_id, provider) DO UPDATE SET
          encrypted_api_key = excluded.encrypted_api_key,
          last_error = '',
          updated_at = excluded.updated_at
      `).run(enc, now, now);
    } catch {
      // ignore
    }
  }
}

module.exports = {
  db,
  initDatabase,
  hashPassword,
  verifyPassword,
  countWordsFromHtml,
  sanitizeRichHtmlServer,
  syncStructuredContentToHtml
};
