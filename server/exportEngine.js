const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber
} = require('docx');
const PDFDocument = require('pdfkit');
const JSZip = require('jszip');
const { sanitizeRichHtmlServer } = require('./db');

const TRIM_DIMENSIONS_INCHES = {
  '5x8': { width: 5, height: 8, label: '5" × 8" (127 × 203 mm)' },
  '5.25x8': { width: 5.25, height: 8, label: '5.25" × 8" (133 × 203 mm)' },
  '5.5x8.5': { width: 5.5, height: 8.5, label: '5.5" × 8.5" Digest (140 × 216 mm)' },
  '6x9': { width: 6, height: 9, label: '6" × 9" US Trade (152 × 229 mm)' },
  '7x10': { width: 7, height: 10, label: '7" × 10" Reference / Technical (178 × 254 mm)' },
  '7.5x9.5': { width: 7.5, height: 9.5, label: '7.5" × 9.5" Culinary Crown (191 × 241 mm)' },
  '8.5x8.5': { width: 8.5, height: 8.5, label: '8.5" × 8.5" Storybook Square (216 × 216 mm)' },
  '10x8': { width: 10, height: 8, label: '10" × 8" Landscape Monograph (254 × 203 mm)' },
  '8.5x11': { width: 8.5, height: 11, label: '8.5" × 11" Magazine / Workbook Folio (216 × 279 mm)' }
};

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
}

function enrichSinglePageHtmlForExport(ch) {
  let sd = ch.structuredData || {};
  if (!ch.structuredData && ch.structured_data_json) {
    try { sd = JSON.parse(ch.structured_data_json || '{}'); } catch { sd = {}; }
  }
  const sectionType = ch.sectionType || ch.section_type || 'chapter';
  const baseHtml = ch.contentHtml ?? ch.content_html ?? '';

  if (!sd || Object.keys(sd).length === 0) return baseHtml;

  const extra = [];
  if (sectionType === 'recipe') {
    if (sd.headnote && !baseHtml.includes(sd.headnote)) {
      extra.push(`<p><em>${sd.headnote}</em></p>`);
    }
    const meta = [
      sd.course && `Course: ${sd.course}`,
      sd.prepTime && `Prep: ${sd.prepTime}`,
      sd.cookTime && `Cook: ${sd.cookTime}`,
      sd.servings && `Yield: ${sd.servings}`,
      sd.difficulty && `Difficulty: ${sd.difficulty}`
    ].filter(Boolean);
    if (meta.length > 0 && !baseHtml.includes('Prep:')) {
      extra.push(`<p><strong>${meta.join(' • ')}</strong></p>`);
    }
    if (Array.isArray(sd.ingredients) && sd.ingredients.length > 0 && !baseHtml.includes('Ingredients')) {
      extra.push(`<h2>Ingredients</h2>`);
      sd.ingredients.forEach(ing => {
        extra.push(`<li><strong>${[ing.quantity, ing.unit].filter(Boolean).join(' ')}</strong> ${ing.item || ''}</li>`);
      });
    }
    if (Array.isArray(sd.steps) && sd.steps.length > 0 && !baseHtml.includes('Preparation')) {
      extra.push(`<h2>Preparation Steps</h2>`);
      sd.steps.forEach((step, idx) => {
        extra.push(`<p><strong>Step ${idx + 1}:</strong> ${step}</p>`);
      });
    }
    if (sd.chefNotes && !baseHtml.includes(sd.chefNotes)) {
      extra.push(`<blockquote>Chef’s Note: ${sd.chefNotes}</blockquote>`);
    }
    return extra.length > 0 ? `${extra.join('\n')}\n${baseHtml}` : baseHtml;
  }

  if (sectionType === 'magazine_article') {
    if (sd.kicker) extra.push(`<p><strong>[${sd.kicker}]</strong></p>`);
    if (sd.byline) extra.push(`<p><em>${sd.byline}</em></p>`);
    if (sd.pullQuote && !baseHtml.includes(sd.pullQuote)) extra.push(`<blockquote>${sd.pullQuote}</blockquote>`);
    if (Array.isArray(sd.sidebarItems) && sd.sidebarItems.length > 0) {
      extra.push(`<h3>${sd.sidebarTitle || 'Sidebar Dossier'}</h3>`);
      sd.sidebarItems.forEach(item => extra.push(`<li>${item}</li>`));
    }
    return `${extra.join('\n')}\n${baseHtml}`;
  }

  if (sectionType === 'informational_unit') {
    if ((sd.calloutTitle || sd.calloutBody) && !(sd.calloutBody && baseHtml.includes(sd.calloutBody))) {
      extra.push(`<blockquote><strong>${sd.calloutType || 'Callout'}: ${sd.calloutTitle || ''}</strong> — ${sd.calloutBody || ''}</blockquote>`);
    }
    if (sd.dataTable && Array.isArray(sd.dataTable.rows)) {
      extra.push(`<h3>${sd.dataTable.caption || 'Reference Data Table'}</h3>`);
      if (Array.isArray(sd.dataTable.headers)) {
        extra.push(`<p><strong>${sd.dataTable.headers.join(' | ')}</strong></p>`);
      }
      sd.dataTable.rows.forEach(row => {
        if (Array.isArray(row)) extra.push(`<li>${row.join(' — ')}</li>`);
      });
    }
    if (Array.isArray(sd.keyTerms) && sd.keyTerms.length > 0) {
      extra.push(`<h3>Key Terms</h3>`);
      sd.keyTerms.forEach(kt => extra.push(`<li><strong>${kt.term}:</strong> ${kt.definition}</li>`));
    }
    return `${baseHtml}\n${extra.join('\n')}`;
  }

  if (sectionType === 'storybook_spread') {
    if (sd.illustrationPrompt) {
      extra.push(`<figure><figcaption>[Illustration Plate: ${sd.illustrationPrompt}]</figcaption></figure>`);
    }
    if (sd.storyText && !baseHtml.includes(sd.storyText)) {
      extra.push(`<p>${sd.storyText}</p>`);
    }
    return `${extra.join('\n')}\n${baseHtml}`;
  }

  if (sectionType === 'photo_spread') {
    if (sd.curatorialNote && !baseHtml.includes(sd.curatorialNote)) extra.push(`<p><em>${sd.curatorialNote}</em></p>`);
    if (Array.isArray(sd.photos)) {
      sd.photos.forEach(p => {
        extra.push(`<p><strong>${p.title || 'Plate'}</strong> (${p.location || ''} ${p.cameraSpec ? `• ${p.cameraSpec}` : ''}) — ${p.caption || ''}</p>`);
      });
    }
    return `${extra.join('\n')}\n${baseHtml}`;
  }

  if (sectionType === 'workbook_exercise') {
    if (sd.frameworkSummary) extra.push(`<p>${sd.frameworkSummary}</p>`);
    if (Array.isArray(sd.checklistItems) && sd.checklistItems.length > 0) {
      extra.push(`<h3>Action Checklist</h3>`);
      sd.checklistItems.forEach(item => extra.push(`<li>[ ] ${item}</li>`));
    }
    if (Array.isArray(sd.reflectionPrompts) && sd.reflectionPrompts.length > 0) {
      extra.push(`<h3>Reflection Prompts</h3>`);
      sd.reflectionPrompts.forEach((rp, i) => {
        extra.push(`<p><strong>${i + 1}. ${rp.prompt}</strong></p>`);
        extra.push(`<p>____________________________________________________________________</p>`);
      });
    }
    return `${baseHtml}\n${extra.join('\n')}`;
  }

  return baseHtml;
}


function enrichChapterHtmlForExport(ch) {
  let structuredData = ch.structuredData || {};
  if (!ch.structuredData && ch.structured_data_json) {
    try { structuredData = JSON.parse(ch.structured_data_json || '{}'); } catch { structuredData = {}; }
  }

  const pages = Array.isArray(structuredData.pages) ? structuredData.pages : null;
  const chapterSubtitle = safeSubtitleMarkup(ch.subtitle || '');
  if (!pages || pages.length === 0) {
    return `${chapterSubtitle}${enrichSinglePageHtmlForExport({ ...ch, structuredData })}`;
  }

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return pages.map((page, index) => {
    const pageContent = {
      ...ch,
      title: index === 0 ? ch.title : page?.title || '',
      contentHtml: page?.contentHtml ?? (index === 0 ? ch.contentHtml ?? ch.content_html ?? '' : ''),
      structuredData: page?.structuredData && typeof page.structuredData === 'object'
        ? page.structuredData
        : {}
    };
    const pageHeading = index === 0
      ? ''
      : `<h2>${escapeHtml(page?.title || `Page ${index + 1}`)}</h2>`;
    const pageSubtitle = index === 0
      ? chapterSubtitle
      : safeSubtitleMarkup(page?.subtitle || '', 'page-subtitle');
    return `${pageHeading}${pageSubtitle}${enrichSinglePageHtmlForExport(pageContent)}`;
  }).join('\n');
}

function parseCssColor(value = '') {
  const color = String(value).trim();
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color.toUpperCase();
  const rgb = color.match(/^rgba?\((\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/i);
  if (!rgb) return '';
  return `#${rgb.slice(1, 4).map((channel) => Math.max(0, Math.min(255, Number(channel))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function parseInlineRuns(html = '') {
  const runs = [];
  const stack = [{ tag: '', bold: false, italic: false, underline: false, color: '' }];
  const tokens = /<\/?([a-z0-9]+)\b([^>]*)>|([^<]+)|</gi;
  let match;

  while ((match = tokens.exec(String(html || ''))) !== null) {
    if (match[3] !== undefined) {
      const text = decodeHtmlEntities(match[3]);
      if (!text) continue;
      const style = stack[stack.length - 1];
      const previous = runs[runs.length - 1];
      if (previous && previous.bold === style.bold && previous.italic === style.italic && previous.underline === style.underline && previous.color === style.color) {
        previous.text += text;
      } else {
        runs.push({ text, bold: style.bold, italic: style.italic, underline: style.underline, color: style.color });
      }
      continue;
    }

    if (!match[1]) continue;
    const tag = match[1].toLowerCase();
    const isClosing = /^<\//.test(match[0]);
    if (tag === 'br') {
      if (!isClosing) {
        const style = stack[stack.length - 1];
        runs.push({ text: '\n', bold: style.bold, italic: style.italic, underline: style.underline, color: style.color });
      }
      continue;
    }
    if (isClosing) {
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].tag === tag) {
          stack.length = index;
          break;
        }
      }
      continue;
    }

    const parent = stack[stack.length - 1];
    const styleMatch = String(match[2] || '').match(/\bstyle\s*=\s*(["'])(.*?)\1/i);
    const inlineStyle = styleMatch?.[2] || '';
    const fontWeight = inlineStyle.match(/(?:^|;)\s*font-weight\s*:\s*([^;]+)/i)?.[1] || '';
    const fontStyle = inlineStyle.match(/(?:^|;)\s*font-style\s*:\s*([^;]+)/i)?.[1] || '';
    const decoration = inlineStyle.match(/(?:^|;)\s*text-decoration\s*:\s*([^;]+)/i)?.[1] || '';
    const colorValue = inlineStyle.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1] || '';
    stack.push({
      tag,
      bold: parent.bold || ['strong', 'b'].includes(tag) || /^(bold|[6-9]00)$/i.test(fontWeight.trim()),
      italic: parent.italic || ['em', 'i'].includes(tag) || /^italic$/i.test(fontStyle.trim()),
      underline: parent.underline || tag === 'u' || /underline/i.test(decoration),
      color: parseCssColor(colorValue) || parent.color
    });
    if (/\/\s*>$/.test(match[0])) stack.pop();
  }

  return runs.filter((run) => run.text);
}

function parseTextAlignment(attributes = '') {
  const style = String(attributes).match(/\bstyle\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
  const alignment = style.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\b/i)?.[1];
  return alignment ? alignment.toLowerCase() : '';
}

function parseHtmlBlocks(html = '') {
  const blocks = [];
  const cleaned = String(html || '').trim();
  if (!cleaned) return blocks;

  const blockRegex = /<(h1|h2|h3|h4|p|div|blockquote|li|figure)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  let foundAny = false;

  while ((match = blockRegex.exec(cleaned)) !== null) {
    foundAny = true;
    const tag = match[1].toLowerCase();
    const attributes = match[2] || '';
    const inner = match[3];

    if (tag === 'figure') {
      const captionMatch = inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
      const captionText = captionMatch ? decodeHtmlEntities(captionMatch[1].replace(/<[^>]+>/g, '').trim()) : '';
      blocks.push({ type: 'figure', text: captionText || '[Illustration]' });
      continue;
    }

    const runs = parseInlineRuns(inner);
    const plainText = runs.map((run) => run.text).join('').replace(/\s+/g, ' ').trim();
    if (!plainText) continue;

    blocks.push({
      type: tag,
      text: plainText,
      runs: runs.length > 0 ? runs : [{ text: plainText, bold: false, italic: false, underline: false, color: '' }],
      align: parseTextAlignment(attributes)
    });
  }

  if (!foundAny) {
    const runs = parseInlineRuns(cleaned);
    const plainText = runs.map((run) => run.text).join('').replace(/\s+/g, ' ').trim();
    if (plainText) {
      blocks.push({
        type: 'p',
        text: plainText,
        runs: runs.length > 0 ? runs : [{ text: plainText, bold: false, italic: false, underline: false, color: '' }],
        align: ''
      });
    }
  }

  return blocks;
}

function safeSubtitleMarkup(value, className = 'chapter-subtitle') {
  const safeHtml = sanitizeRichHtmlServer(String(value || ''));
  return safeHtml.trim()
    ? `<div class="${className}" style="text-align:center">${safeHtml}</div>`
    : '';
}

function subtitlePlainText(value) {
  const safeHtml = sanitizeRichHtmlServer(String(value || ''));
  return parseHtmlBlocks(safeHtml).map((block) => block.text).filter(Boolean).join(' ').trim();
}

function collectOrderedSections({ project, chapters = [], metadata = {} }) {
  const activeChapters = chapters.filter(c => c.status !== 'skipped');
  const fm = metadata?.frontMatter || {};
  const bm = metadata?.backMatter || {};

  const frontSections = [];
  if (fm.dedication?.enabled && fm.dedication?.content?.trim()) {
    frontSections.push({ title: 'Dedication', contentHtml: `<p>${fm.dedication.content}</p>`, kind: 'front' });
  }
  if (fm.epigraph?.enabled && fm.epigraph?.content?.trim()) {
    frontSections.push({ title: 'Epigraph', contentHtml: `<blockquote>${fm.epigraph.content}</blockquote>`, kind: 'front' });
  }
  if (fm.foreword?.enabled && fm.foreword?.content?.trim()) {
    frontSections.push({ title: 'Foreword', contentHtml: `<p>${fm.foreword.content.replace(/\n+/g, '</p><p>')}</p>`, kind: 'front' });
  }
  if (fm.preface?.enabled && fm.preface?.content?.trim()) {
    frontSections.push({ title: 'Preface', contentHtml: `<p>${fm.preface.content.replace(/\n+/g, '</p><p>')}</p>`, kind: 'front' });
  }
  if (fm.acknowledgements?.enabled && fm.acknowledgements?.content?.trim()) {
    frontSections.push({ title: 'Acknowledgements', contentHtml: `<p>${fm.acknowledgements.content.replace(/\n+/g, '</p><p>')}</p>`, kind: 'front' });
  }

  const backSections = [];
  if (bm.afterword?.enabled && bm.afterword?.content?.trim()) {
    backSections.push({ title: 'Afterword', contentHtml: `<p>${bm.afterword.content.replace(/\n+/g, '</p><p>')}</p>`, kind: 'back' });
  }
  if (bm.appendices?.enabled && bm.appendices?.content?.trim()) {
    backSections.push({ title: 'Appendices', contentHtml: `<p>${bm.appendices.content.replace(/\n+/g, '</p><p>')}</p>`, kind: 'back' });
  }
  if (bm.bibliography?.enabled && bm.bibliography?.content?.trim()) {
    backSections.push({ title: 'Bibliography & References', contentHtml: `<p>${bm.bibliography.content.replace(/\n+/g, '</p><p>')}</p>`, kind: 'back' });
  }
  if (bm.further_reading?.enabled && bm.further_reading?.content?.trim()) {
    backSections.push({ title: 'Further Reading', contentHtml: `<p>${bm.further_reading.content.replace(/\n+/g, '</p><p>')}</p>`, kind: 'back' });
  }
  if (bm.author_bio?.enabled && bm.author_bio?.content?.trim()) {
    backSections.push({ title: 'About the Creator', contentHtml: `<p>${bm.author_bio.content.replace(/\n+/g, '</p><p>')}</p>`, kind: 'back' });
  }

  return {
    frontSections,
    bodyChapters: activeChapters.length > 0 ? activeChapters : chapters,
    backSections
  };
}

// 1. Generate Real DOCX Buffer
async function generateDocxExport({ project, chapters = [], formatting = {}, metadata = {} }) {
  const trim = TRIM_DIMENSIONS_INCHES[formatting.trimSize || '5.5x8.5'] || TRIM_DIMENSIONS_INCHES['5.5x8.5'];
  const fontSizeHalfPt = Math.round((Number(formatting.fontSizePt) || 11.5) * 2);
  const { frontSections, bodyChapters, backSections } = collectOrderedSections({ project, chapters, metadata });

  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 240 },
      children: [new TextRun({ text: project.title || 'Untitled Publication', bold: true, size: 48 })]
    })
  );

  if (project.subtitle) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
        children: [new TextRun({ text: project.subtitle, italics: true, size: 28 })]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 400 },
      children: [new TextRun({ text: `By ${project.author_name || 'Author'}`, size: 26 })]
    })
  );

  if (metadata?.publisherName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1600 },
        children: [new TextRun({ text: metadata.publisherName, size: 22 })]
      })
    );
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  const copyrightYear = metadata?.copyrightYear || new Date().getFullYear();
  const copyrightHolder = metadata?.copyrightHolder || project.author_name || 'The Creator';
  children.push(
    new Paragraph({
      spacing: { before: 2000, after: 200 },
      children: [new TextRun({ text: `Copyright © ${copyrightYear} by ${copyrightHolder}`, size: 20 })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: metadata?.rightsStatement || 'All rights reserved.', size: 18 })]
    })
  );
  if (metadata?.isbnPrint) {
    children.push(new Paragraph({ children: [new TextRun({ text: `Print ISBN: ${metadata.isbnPrint}`, size: 18 })] }));
  }
  if (metadata?.isbnEbook) {
    children.push(new Paragraph({ children: [new TextRun({ text: `eBook ISBN: ${metadata.isbnEbook}`, size: 18 })] }));
  }

  if (formatting.includeToc !== false) {
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
        children: [new TextRun({ text: 'Contents', bold: true, size: 32 })]
      })
    );
    frontSections.forEach(s => {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: s.title, italics: true, size: 22 })] }));
    });
    bodyChapters.forEach((ch, idx) => {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `${idx + 1}. ${ch.title}`, size: 22 })] }));
    });
    backSections.forEach(s => {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: s.title, italics: true, size: 22 })] }));
    });
  }

  const docxAlignment = (alignment) => ({
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED
  })[alignment] || undefined;
  const docxTextRuns = (block, defaults = {}) => (block.runs || [{ text: block.text }]).map((run) => new TextRun({
    text: run.text,
    bold: defaults.bold || run.bold,
    italics: defaults.italic || run.italic,
    underline: run.underline ? { type: 'single' } : undefined,
    color: run.color ? run.color.replace(/^#/, '').slice(0, 6) : undefined,
    size: defaults.size || fontSizeHalfPt
  }));

  const appendSectionBlocks = (title, subtitle, htmlContent) => {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: formatting.chapterOpeningStyle === 'modern_left' ? AlignmentType.LEFT : AlignmentType.CENTER,
        spacing: { before: 600, after: subtitle ? 120 : 360 },
        children: [new TextRun({ text: title, bold: true, size: 34 })]
      })
    );
    if (subtitle) {
      children.push(
        new Paragraph({
          alignment: formatting.chapterOpeningStyle === 'modern_left' ? AlignmentType.LEFT : AlignmentType.CENTER,
          spacing: { after: 360 },
          children: [new TextRun({ text: subtitle, italics: true, size: 24 })]
        })
      );
    }

    const blocks = parseHtmlBlocks(htmlContent);
    if (blocks.length === 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      return;
    }

    blocks.forEach(b => {
      if (b.type === 'h1' || b.type === 'h2') {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment: docxAlignment(b.align),
            spacing: { before: 280, after: 140 },
            children: docxTextRuns(b, { bold: true, size: 28 })
          })
        );
      } else if (b.type === 'h3' || b.type === 'h4') {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            alignment: docxAlignment(b.align),
            spacing: { before: 220, after: 100 },
            children: docxTextRuns(b, { bold: true, size: 24 })
          })
        );
      } else if (b.type === 'blockquote') {
        children.push(
          new Paragraph({
            alignment: docxAlignment(b.align),
            indent: { left: 720, right: 720 },
            spacing: { before: 180, after: 180 },
            children: docxTextRuns(b, { italic: true })
          })
        );
      } else if (b.type === 'li') {
        children.push(
          new Paragraph({
            alignment: docxAlignment(b.align),
            bullet: { level: 0 },
            spacing: { after: 100 },
            children: docxTextRuns(b)
          })
        );
      } else {
        children.push(
          new Paragraph({
            alignment: docxAlignment(b.align),
            spacing: { after: 160, line: Math.round((Number(formatting.lineSpacing) || 1.45) * 240) },
            indent: { firstLine: Math.round((Number(formatting.paragraphIndentEm) || 1.2) * 240) },
            children: docxTextRuns(b)
          })
        );
      }
    });
  };

  frontSections.forEach(s => appendSectionBlocks(s.title, '', s.contentHtml));
  bodyChapters.forEach(ch => appendSectionBlocks(ch.title, '', enrichChapterHtmlForExport(ch)));
  backSections.forEach(s => appendSectionBlocks(s.title, '', s.contentHtml));

  const doc = new Document({
    creator: project.author_name || 'Folio & Quill Studio',
    title: project.title,
    description: project.description || '',
    sections: [
      {
        properties: {
          page: {
            size: {
              width: Math.round(trim.width * 1440),
              height: Math.round(trim.height * 1440)
            },
            margin: {
              top: Math.round(((formatting.marginTopMm || 19) / 25.4) * 1440),
              bottom: Math.round(((formatting.marginBottomMm || 19) / 25.4) * 1440),
              left: Math.round(((formatting.marginInnerMm || 22) / 25.4) * 1440),
              right: Math.round(((formatting.marginOuterMm || 16) / 25.4) * 1440)
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${project.title} — ${project.author_name || ''}`, size: 16, italics: true })]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })]
              })
            ]
          })
        },
        children
      }
    ]
  });

  return Packer.toBuffer(doc);
}

// 2. Generate Real Typeset PDF Buffer
async function generatePdfExport({ project, chapters = [], formatting = {}, metadata = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const trim = TRIM_DIMENSIONS_INCHES[formatting.trimSize || '5.5x8.5'] || TRIM_DIMENSIONS_INCHES['5.5x8.5'];
      const pageWidthPt = Math.round(trim.width * 72);
      const pageHeightPt = Math.round(trim.height * 72);

      const mmToPt = (mm) => Math.round((Number(mm) / 25.4) * 72);
      const margins = {
        top: mmToPt(formatting.marginTopMm || 19),
        bottom: mmToPt(formatting.marginBottomMm || 19),
        left: mmToPt(formatting.marginInnerMm || 22),
        right: mmToPt(formatting.marginOuterMm || 16)
      };

      const fontSize = Number(formatting.fontSizePt) || 11.5;
      const lineGap = Math.max(2, Math.round((Number(formatting.lineSpacing || 1.45) - 1) * fontSize));
      const { frontSections, bodyChapters, backSections } = collectOrderedSections({ project, chapters, metadata });

      const doc = new PDFDocument({
        size: [pageWidthPt, pageHeightPt],
        margins,
        bufferPages: true,
        info: {
          Title: project.title || 'Untitled Publication',
          Author: project.author_name || 'Author',
          Subject: project.subtitle || project.description || '',
          Keywords: (metadata?.keywords || []).join(', ')
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let coverConfig = {};
      try {
        coverConfig = typeof project.coverConfig === 'object'
          ? project.coverConfig
          : JSON.parse(project.cover_config_json || '{}');
      } catch {
        coverConfig = {};
      }
      const tplPageBg = coverConfig.pageBg || '#FFFFFF';
      const tplPageText = coverConfig.pageText || '#1E293B';
      const tplBorderColor = coverConfig.borderColor || '#4F46E5';
      const tplAccent = coverConfig.accentColor || '#4F46E5';

      const renderPdfTextBlock = (block, defaults = {}, prefix = '') => {
        const sourceRuns = block.runs?.length ? block.runs : [{ text: block.text || '' }];
        const runs = prefix ? [{ text: prefix }, ...sourceRuns] : sourceRuns;
        runs.forEach((run, index) => {
          const bold = Boolean(defaults.bold || run.bold);
          const italic = Boolean(defaults.italic || run.italic);
          const fontName = bold && italic ? 'Times-BoldItalic' : bold ? 'Times-Bold' : italic ? 'Times-Italic' : 'Times-Roman';
          doc.font(fontName).fontSize(defaults.fontSize || fontSize).fillColor(run.color || tplPageText);
          const options = {
            lineGap,
            continued: index < runs.length - 1,
            underline: Boolean(run.underline)
          };
          if (index === 0) {
            options.align = block.align || defaults.align || 'left';
            if (defaults.indent) options.indent = defaults.indent;
          }
          doc.text(run.text, options);
        });
        doc.fillColor(tplPageText);
      };

      const decorateCurrentPdfPage = () => {
        doc.save();
        if (tplPageBg && tplPageBg.toUpperCase() !== '#FFFFFF') {
          doc.rect(0, 0, pageWidthPt, pageHeightPt).fill(tplPageBg);
        }
        doc.lineWidth(2.5).strokeColor(tplBorderColor).rect(18, 18, pageWidthPt - 36, pageHeightPt - 36).stroke();
        if (coverConfig.borderStyle === 'double-gold') {
          doc.lineWidth(1).strokeColor(tplBorderColor).rect(23, 23, pageWidthPt - 46, pageHeightPt - 46).stroke();
        }
        doc.restore();
        doc.fillColor(tplPageText);
      };

      decorateCurrentPdfPage();
      doc.on('pageAdded', decorateCurrentPdfPage);

      doc.moveDown(4);
      doc.font('Times-Bold').fontSize(24).text(project.title || 'Untitled Publication', { align: 'center' });
      if (project.subtitle) {
        doc.moveDown(0.5);
        doc.font('Times-Italic').fontSize(14).text(project.subtitle, { align: 'center' });
      }
      doc.moveDown(4);
      doc.font('Times-Roman').fontSize(13).text(project.author_name || 'Author', { align: 'center' });
      if (metadata?.publisherName) {
        doc.moveDown(6);
        doc.font('Times-Roman').fontSize(10).text(metadata.publisherName, { align: 'center' });
      }

      doc.addPage();
      doc.moveDown(10);
      const copyrightYear = metadata?.copyrightYear || new Date().getFullYear();
      const copyrightHolder = metadata?.copyrightHolder || project.author_name || 'The Creator';
      doc.font('Times-Roman').fontSize(9.5).text(`Copyright © ${copyrightYear} by ${copyrightHolder}`, { lineGap: 3 });
      doc.moveDown(0.5);
      doc.text(metadata?.rightsStatement || 'All rights reserved.', { lineGap: 3 });
      if (metadata?.isbnPrint) {
        doc.moveDown(0.5);
        doc.text(`Print ISBN: ${metadata.isbnPrint}`);
      }
      if (metadata?.isbnEbook) {
        doc.text(`eBook ISBN: ${metadata.isbnEbook}`);
      }

      if (formatting.includeToc !== false) {
        doc.addPage();
        if (typeof doc.addNamedDestination === 'function') {
          doc.addNamedDestination('book-index');
        }
        doc.moveDown(1);
        doc.font('Times-Bold').fontSize(18).fillColor(tplAccent).text('Index & Contents', { align: 'center' });
        doc.fillColor(tplPageText);
        doc.moveDown(0.4);
        doc.font('Times-Italic').fontSize(10.5).text('Choose a chapter to find its opening page', { align: 'center' });
        doc.moveDown(1.5);
        doc.font('Times-Roman').fontSize(11.5);
        frontSections.forEach(s => {
          doc.font('Times-Italic').text(s.title, { lineGap: 4 });
        });
        bodyChapters.forEach((ch, idx) => {
          doc.font('Times-Bold').fillColor(tplAccent).text(`Chapter ${idx + 1}:  ${ch.title}`, {
            lineGap: 7,
            goTo: `chapter-dest-${idx + 1}`,
            underline: true
          });
        });
        doc.fillColor(tplPageText);
        backSections.forEach(s => {
          doc.font('Times-Italic').text(s.title, { lineGap: 4 });
        });
      }

      const renderSection = (title, subtitle, htmlContent, destName = null) => {
        doc.addPage();
        if (destName && typeof doc.addNamedDestination === 'function') {
          doc.addNamedDestination(destName);
        }
        if (formatting.includeToc !== false) {
          doc.font('Times-Bold').fontSize(9.5).fillColor(tplAccent).text('↑ Back to Chapter Index', {
            align: 'right',
            goTo: 'book-index',
            underline: true
          });
          doc.fillColor(tplPageText);
        }
        doc.moveDown(1);
        const headerAlign = formatting.chapterOpeningStyle === 'modern_left' ? 'left' : 'center';
        doc.font('Times-Bold').fontSize(17).fillColor(tplAccent).text(title, { align: headerAlign });
        doc.fillColor(tplPageText);
        if (subtitle) {
          doc.moveDown(0.3);
          doc.font('Times-Italic').fontSize(12).text(subtitle, { align: headerAlign });
        }
        doc.moveDown(1.2);

        const blocks = parseHtmlBlocks(htmlContent);
        blocks.forEach((block) => {
          if (block.type === 'h1' || block.type === 'h2') {
            doc.moveDown(0.7);
            renderPdfTextBlock(block, { bold: true, fontSize: 13.5, align: 'left' });
            doc.moveDown(0.25);
          } else if (block.type === 'h3' || block.type === 'h4') {
            doc.moveDown(0.5);
            renderPdfTextBlock(block, { bold: true, italic: true, fontSize: 12, align: 'left' });
            doc.moveDown(0.2);
          } else if (block.type === 'blockquote') {
            doc.moveDown(0.4);
            renderPdfTextBlock(block, { italic: true, indent: 18, align: 'left' });
            doc.moveDown(0.4);
          } else if (block.type === 'li') {
            renderPdfTextBlock(block, { indent: 14, align: 'left' }, '•  ');
            doc.moveDown(0.2);
          } else {
            renderPdfTextBlock(block, {
              indent: Math.round((Number(formatting.paragraphIndentEm) || 1.2) * fontSize),
              align: 'justify'
            });
            doc.moveDown(0.35);
          }
        });
      };

      frontSections.forEach(s => renderSection(s.title, '', s.contentHtml));
      bodyChapters.forEach((ch, idx) => renderSection(ch.title, '', enrichChapterHtmlForExport(ch), `chapter-dest-${idx + 1}`));
      backSections.forEach(s => renderSection(s.title, '', s.contentHtml));

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        if (i < 2) continue;
        doc.switchToPage(i);
        if (formatting.pageNumberingStyle !== 'none') {
          doc.font('Times-Roman').fontSize(9).text(
            String(i - 1),
            margins.left,
            pageHeightPt - margins.bottom + 12,
            { width: pageWidthPt - margins.left - margins.right, align: 'center', lineBreak: false }
          );
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// 3. Generate Valid Reflowable EPUB 3 Archive Buffer
async function generateEpubExport({ project, chapters = [], formatting = {}, metadata = {}, assets = [] }) {
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.folder('META-INF').file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS');
  const { frontSections, bodyChapters, backSections } = collectOrderedSections({ project, chapters, metadata });

  const escapeXml = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const sanitizeXhtmlBody = (html = '') => {
    const blocks = parseHtmlBlocks(html);
    if (blocks.length === 0) return '<p>&#160;</p>';
    const renderRuns = (block) => (block.runs || [{ text: block.text }]).map((run) => {
      let text = escapeXml(run.text || '');
      if (run.underline) text = `<u>${text}</u>`;
      if (run.italic) text = `<em>${text}</em>`;
      if (run.bold) text = `<strong>${text}</strong>`;
      if (run.color) text = `<span style="color:${escapeXml(run.color)}">${text}</span>`;
      return text;
    }).join('');
    const alignmentAttribute = (block) => (
      ['left', 'center', 'right', 'justify'].includes(block.align)
        ? ` style="text-align:${block.align}"`
        : ''
    );
    return blocks
      .map((block) => {
        const content = renderRuns(block);
        const align = alignmentAttribute(block);
        if (block.type === 'h1' || block.type === 'h2') return `<h2${align}>${content}</h2>`;
        if (block.type === 'h3' || block.type === 'h4') return `<h3${align}>${content}</h3>`;
        if (block.type === 'blockquote') return `<blockquote${align}><p>${content}</p></blockquote>`;
        if (block.type === 'li') return `<p class="bullet-item"${align}>• ${content}</p>`;
        return `<p${align}>${content}</p>`;
      })
      .join('\n');
  };

  let coverConfig = {};
  try {
    coverConfig = typeof project.coverConfig === 'object'
      ? project.coverConfig
      : JSON.parse(project.cover_config_json || '{}');
  } catch {
    coverConfig = {};
  }
  const epubPageBg = coverConfig.pageBg || '#FFFFFF';
  const epubPageText = coverConfig.pageText || '#1a1a1a';
  const epubBorderColor = coverConfig.borderColor || '#4F46E5';
  const epubAccentColor = coverConfig.accentColor || '#4F46E5';
  const epubBorderRule = coverConfig.borderStyle === 'double-gold'
    ? `4px double ${epubBorderColor}`
    : `3px solid ${epubBorderColor}`;
  const epubRadius = coverConfig.borderStyle === 'rounded-frame' ? '20px' : '10px';

  const css = `body {
  font-family: "${coverConfig.fontFamily || formatting.bodyFont || 'Georgia'}", Georgia, serif;
  line-height: ${formatting.lineSpacing || 1.5};
  margin: 3%;
  background-color: ${epubPageBg};
  color: ${epubPageText};
}
.template-page-frame {
  background-color: ${epubPageBg};
  color: ${epubPageText};
  border: ${epubBorderRule};
  border-radius: ${epubRadius};
  padding: 1.5em;
}
.template-heading-banner {
  background-color: ${epubAccentColor};
  color: #FFFFFF;
  padding: 0.6em 1em;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 1.2em;
}
h1, h2, h3 {
  font-family: "${coverConfig.fontFamily || formatting.headingFont || 'Georgia'}", Georgia, serif;
  line-height: 1.25;
  margin-top: 0.8em;
  margin-bottom: 0.5em;
}
h1 {
  text-align: center;
  font-size: 1.55em;
}
.subtitle {
  text-align: center;
  font-style: italic;
  opacity: 0.85;
  margin-bottom: 1.5em;
}
.chapter-subtitle, .page-subtitle {
  text-align: center;
  font-style: italic;
  opacity: 0.9;
  margin-bottom: 1em;
}
.chapter-subtitle p, .page-subtitle p {
  text-align: center;
  text-indent: 0;
}
p {
  margin-top: 0;
  margin-bottom: ${formatting.paragraphSpacingPt || 6}pt;
  text-indent: ${formatting.paragraphIndentEm || 1.2}em;
  text-align: justify;
}
blockquote {
  margin: 1.2em 1em;
  padding: 0.8em 1em;
  border-left: 4px solid ${epubAccentColor};
  font-style: italic;
}
a {
  color: ${epubAccentColor};
  font-weight: bold;
}
.title-page {
  text-align: center;
  margin-top: 12%;
}
.title-page p {
  text-indent: 0;
  text-align: center;
}
`;
  oebps.file('styles.css', css);

  const manifestItems = [
    `<item id="css" href="styles.css" media-type="text/css"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`
  ];
  const spineItems = [];
  const navLinks = [];

  assets.forEach((asset, idx) => {
    const match = (asset.data_url || '').match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (match) {
      const mime = match[1];
      const base64Data = match[2];
      const safeFile = `images/asset-${idx + 1}-${asset.filename.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      oebps.file(safeFile, Buffer.from(base64Data, 'base64'));
      manifestItems.push(`<item id="img-${idx + 1}" href="${safeFile}" media-type="${mime}"/>`);
    }
  });

  const copyrightYear = metadata?.copyrightYear || new Date().getFullYear();
  const copyrightHolder = metadata?.copyrightHolder || project.author_name || 'The Creator';
  const titleXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(metadata?.language || 'en')}">
<head>
  <title>${escapeXml(project.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="title-page">
    <h1>${escapeXml(project.title)}</h1>
    ${project.subtitle ? `<p class="subtitle">${escapeXml(project.subtitle)}</p>` : ''}
    <p>By ${escapeXml(project.author_name || 'Author')}</p>
    ${metadata?.publisherName ? `<p>${escapeXml(metadata.publisherName)}</p>` : ''}
    <hr/>
    <p>Copyright &#169; ${escapeXml(copyrightYear)} by ${escapeXml(copyrightHolder)}</p>
    <p>${escapeXml(metadata?.rightsStatement || 'All rights reserved.')}</p>
  </div>
</body>
</html>`;
  oebps.file('title.xhtml', titleXhtml);
  manifestItems.push(`<item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>`);
  spineItems.push(`<itemref idref="title-page"/>`);
  navLinks.push({ id: 'title-page', href: 'title.xhtml', title: 'Title Page' });

  const allOrdered = [
    ...frontSections.map((s, i) => ({ file: `front-${i + 1}.xhtml`, id: `front-${i + 1}`, anchor: `start-front-${i + 1}`, title: s.title, subtitle: '', html: s.contentHtml })),
    ...bodyChapters.map((c, i) => ({ file: `chapter-${i + 1}.xhtml`, id: `chapter-${i + 1}`, anchor: `start-chapter-${i + 1}`, title: c.title, subtitle: subtitlePlainText(c.subtitle), subtitleInBody: true, html: enrichChapterHtmlForExport(c) })),
    ...backSections.map((s, i) => ({ file: `back-${i + 1}.xhtml`, id: `back-${i + 1}`, anchor: `start-back-${i + 1}`, title: s.title, subtitle: '', html: s.contentHtml }))
  ];

  // Clickable Chapter Index (Table of Contents) inserted right after the Title Page
  const indexPageXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(metadata?.language || 'en')}">
<head>
  <title>Index &amp; Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section id="book-index" class="template-page-frame">
    <div class="template-heading-banner">
      <h1>Index &amp; Contents</h1>
    </div>
    <p class="subtitle">Select a chapter to jump to its opening page</p>
    <ol>
      ${allOrdered.map((sec, idx) => `<li><a href="${sec.file}#${sec.anchor}">Chapter ${idx + 1}: ${escapeXml(sec.title)}</a>${sec.subtitle ? ` — <em>${escapeXml(sec.subtitle)}</em>` : ''}</li>`).join('\n      ')}
    </ol>
  </section>
</body>
</html>`;
  oebps.file('index-toc.xhtml', indexPageXhtml);
  manifestItems.push(`<item id="index-toc" href="index-toc.xhtml" media-type="application/xhtml+xml"/>`);
  spineItems.push(`<itemref idref="index-toc"/>`);
  navLinks.push({ id: 'index-toc', href: 'index-toc.xhtml', title: 'Index & Contents' });

  allOrdered.forEach(sec => {
    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(metadata?.language || 'en')}">
<head>
  <title>${escapeXml(sec.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section id="${sec.anchor}" class="template-page-frame">
    <div class="template-heading-banner">
      <h1>${escapeXml(sec.title)}</h1>
    </div>
    ${sec.subtitle && !sec.subtitleInBody ? `<p class="subtitle">${escapeXml(sec.subtitle)}</p>` : ''}
    ${sanitizeXhtmlBody(sec.html)}
    <p style="margin-top:2em; text-align:center; text-indent:0;"><a href="index-toc.xhtml#book-index">&#8593; Back to Index</a></p>
  </section>
</body>
</html>`;
    oebps.file(sec.file, xhtml);
    manifestItems.push(`<item id="${sec.id}" href="${sec.file}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${sec.id}"/>`);
    navLinks.push({ id: sec.id, href: `${sec.file}#${sec.anchor}`, title: sec.title });
  });

  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(metadata?.language || 'en')}">
<head>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${navLinks.map(l => `<li><a href="${l.href}">${escapeXml(l.title)}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
  oebps.file('nav.xhtml', navXhtml);

  const bookUid = metadata?.isbnEbook || `urn:uuid:${project.id}`;
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(bookUid)}"/>
  </head>
  <docTitle><text>${escapeXml(project.title)}</text></docTitle>
  <navMap>
    ${navLinks.map((l, idx) => `<navPoint id="navPoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${escapeXml(l.title)}</text></navLabel>
      <content src="${l.href}"/>
    </navPoint>`).join('\n    ')}
  </navMap>
</ncx>`;
  oebps.file('toc.ncx', ncx);

  const modifiedIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(bookUid)}</dc:identifier>
    <dc:title>${escapeXml(project.title)}${project.subtitle ? `: ${escapeXml(project.subtitle)}` : ''}</dc:title>
    <dc:creator>${escapeXml(project.author_name || 'Author')}</dc:creator>
    <dc:language>${escapeXml(metadata?.language || 'en')}</dc:language>
    <dc:description>${escapeXml(metadata?.longDescription || project.description || '')}</dc:description>
    <dc:publisher>${escapeXml(metadata?.publisherName || 'Independent')}</dc:publisher>
    <meta property="dcterms:modified">${modifiedIso}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
  oebps.file('content.opf', opf);

  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
}

// 4. Platform-Specific Publishing Readiness & Print Cover Spine Calculator
function calculatePublishingSpecs({ project, chapters = [], formatting = {}, metadata = {}, assets = [] }) {
  const totalWords = chapters.reduce((acc, c) => acc + (c.word_count || 0), 0);
  const trim = TRIM_DIMENSIONS_INCHES[formatting.trimSize || '5.5x8.5'] || TRIM_DIMENSIONS_INCHES['5.5x8.5'];
  const wordsPerPage = formatting.trimSize === '6x9' ? 300 : formatting.trimSize === '7x10' || formatting.trimSize === '8.5x11' ? 380 : 250;
  const estimatedPageCount = Math.max(24, Math.ceil(totalWords / wordsPerPage) + Math.max(6, chapters.length * 2));

  const paperFactor = formatting.paperType === 'white' ? 0.002252 : 0.0025;
  const spineWidthInches = Number((estimatedPageCount * paperFactor).toFixed(3));
  const spineWidthMm = Number((spineWidthInches * 25.4).toFixed(2));
  const bleedInches = 0.125;
  const fullCoverWidthInches = Number((trim.width * 2 + spineWidthInches + bleedInches * 2).toFixed(3));
  const fullCoverHeightInches = Number((trim.height + bleedInches * 2).toFixed(3));

  const spineAllowsText = estimatedPageCount >= 79;
  const isVisualFormat = ['magazine', 'cookbook', 'storybook', 'photobook', 'workbook', 'informational'].includes(project.book_type);

  return {
    estimatedPageCount,
    totalWords,
    trimSize: formatting.trimSize || '5.5x8.5',
    trimLabel: trim.label,
    paperType: formatting.paperType || 'cream',
    spineWidthInches,
    spineWidthMm,
    bleedInches,
    fullCoverWidthInches,
    fullCoverHeightInches,
    spineAllowsText,
    formatBehaviorNotes: [
      {
        format: 'Print-Ready PDF',
        behavior: 'Fixed-Page Geometry — Preserves exact trim dimensions, running headers, margins, recipe cards, and page pagination.'
      },
      {
        format: 'EPUB 3 eBook',
        behavior: 'Reflowable Layout — Multi-column magazine spreads, recipe sidebars, and facing-page plates linearize into single-column responsive sections so readers can resize fonts on e-readers.'
      },
      {
        format: 'DOCX Manuscript',
        behavior: 'Editable Word Document — Exports structured headings, ingredient lists, data tables, and callouts as standard Word styles for copy-editing.'
      }
    ],
    warnings: [
      isVisualFormat
        ? `Visual Publication Notice: "${project.title}" uses visual/structured layouts (${project.book_type}). Print PDF preserves fixed trim size (${trim.label}), while EPUB 3 linearizes multi-column spreads into reflowable e-reader sections.`
        : null,
      estimatedPageCount < 79
        ? `At ~${estimatedPageCount} estimated pages, print-on-demand platforms (like Amazon KDP) do not allow text on the spine (79+ pages required).`
        : null,
      !metadata?.isbnPrint
        ? 'No Print ISBN entered yet. You can either provide your own agency ISBN or select a platform-assigned ISBN during upload.'
        : null
    ].filter(Boolean),
    platforms: {
      amazonKdp: {
        name: 'Amazon Kindle Direct Publishing (KDP)',
        ebookFormat: 'EPUB (Reflowable) or DOCX',
        printFormat: 'Print-Ready PDF (Interior) + Full-Wrap Cover PDF',
        requirements: [
          {
            label: 'Publication Title & Primary Creator Name configured',
            passed: Boolean(project.title && project.author_name)
          },
          {
            label: 'Publication contains drafted pages or structured sections',
            passed: chapters.length > 0 && (totalWords >= 50 || isVisualFormat)
          },
          {
            label: 'Up to 7 search keywords & BISAC categories prepared',
            passed: (metadata?.keywords || []).length > 0 && (metadata?.bisacCategories || []).length > 0
          },
          {
            label: 'Publication description / back-cover blurb drafted',
            passed: Boolean((metadata?.longDescription || project.description || '').trim())
          },
          {
            label: 'Inner gutter margin ≥ 15 mm for print binding',
            passed: Number(formatting.marginInnerMm || 22) >= 15
          }
        ]
      },
      koboWritingLife: {
        name: 'Kobo Writing Life & Apple Books',
        ebookFormat: 'EPUB 3 (Reflowable)',
        requirements: [
          {
            label: 'Valid EPUB 3 structure with Navigation TOC (nav.xhtml)',
            passed: chapters.length > 0
          },
          {
            label: 'Metadata (Title, Creator, Language, Description) complete',
            passed: Boolean(project.title && project.author_name && (metadata?.longDescription || project.description))
          },
          {
            label: 'Embedded assets include alt text for accessibility',
            passed: assets.every(a => Boolean(a.alt_text && a.alt_text.trim()))
          }
        ]
      }
    }
  };
}

module.exports = {
  generateDocxExport,
  generatePdfExport,
  generateEpubExport,
  calculatePublishingSpecs,
  TRIM_DIMENSIONS_INCHES
};
