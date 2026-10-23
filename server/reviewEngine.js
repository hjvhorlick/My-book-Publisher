const { countWordsFromHtml } = require('./db');

function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function runManuscriptReview({ project, chapters = [], formatting = {}, metadata = {}, assets = [], notes = [] }) {
  const issues = []; // Actual problems to fix before publication
  const recommendations = []; // Optional suggestions — never mark a book defective for omitting optional sections

  // 1. Project & Metadata checks
  if (!project.title || project.title.trim().toLowerCase() === 'untitled book project') {
    issues.push({
      id: 'meta-title',
      category: 'Metadata',
      severity: 'issue',
      title: 'Missing or placeholder book title',
      description: 'Your book still uses a default or blank title. Set a definitive title before exporting final files.',
      targetView: 'metadata'
    });
  }

  if (!project.author_name || !project.author_name.trim()) {
    issues.push({
      id: 'meta-author',
      category: 'Metadata',
      severity: 'issue',
      title: 'Missing author name',
      description: 'No primary author or contributor name is specified for the title page and ebook metadata.',
      targetView: 'metadata'
    });
  }

  if (!metadata.copyrightHolder || !metadata.copyrightYear) {
    recommendations.push({
      id: 'meta-copyright',
      category: 'Front Matter',
      severity: 'recommendation',
      title: 'Incomplete copyright page details',
      description: 'Consider specifying both the Copyright Holder and Copyright Year in Front Matter & Metadata.',
      targetView: 'metadata'
    });
  }

  if (!metadata.longDescription && !project.description) {
    recommendations.push({
      id: 'meta-description',
      category: 'Metadata',
      severity: 'recommendation',
      title: 'Book description / blurb is empty',
      description: 'Adding a book description helps with EPUB metadata, back-cover copy, and store preparation.',
      targetView: 'metadata'
    });
  }

  // 2. Chapters, Headings, Placeholders, and Content checks
  if (chapters.length === 0) {
    issues.push({
      id: 'ch-none',
      category: 'Structure',
      severity: 'issue',
      title: 'Manuscript has no chapters',
      description: 'Add at least one chapter to your book before exporting.',
      targetView: 'studio'
    });
  }

  const seenChapterTitles = new Map();
  const placeholderRegex = /\b(TODO|TBD|FIXME|TK|XXX|Lorem ipsum)\b|\[insert[^\]]*\]/gi;
  const assetIds = new Set(assets.map(a => a.id));

  let totalWords = 0;
  let totalCharacters = 0;
  let totalParagraphs = 0;
  let totalSentences = 0;
  const chapterStats = [];

  chapters.forEach((ch, idx) => {
    const html = ch.content_html || '';
    const plain = stripHtml(html);
    const wc = countWordsFromHtml(html);
    totalWords += wc;
    totalCharacters += plain.length;

    const pMatches = html.match(/<p[\s>]/gi);
    totalParagraphs += pMatches ? pMatches.length : (plain ? 1 : 0);
    const sMatches = plain.split(/[.!?]+\s+/).filter(Boolean);
    totalSentences += sMatches.length;

    chapterStats.push({
      id: ch.id,
      orderIndex: idx + 1,
      title: ch.title,
      wordCount: wc,
      targetWords: ch.target_words || 2500,
      status: ch.status,
      isOptional: Boolean(ch.is_optional)
    });

    // Check missing / generic chapter title for TOC
    if (!ch.title || !ch.title.trim() || /^new chapter$/i.test(ch.title.trim())) {
      issues.push({
        id: `toc-title-${ch.id}`,
        category: 'Table of Contents',
        severity: 'issue',
        chapterId: ch.id,
        chapterTitle: ch.title || `Chapter ${idx + 1}`,
        title: `Incomplete Table of Contents title in Chapter ${idx + 1}`,
        description: `Chapter ${idx + 1} is still named "${ch.title || 'Untitled'}". Give it a clear title for the Table of Contents.`,
        targetView: 'studio'
      });
    }

    // Check duplicate chapter titles
    const normTitle = (ch.title || '').trim().toLowerCase();
    if (normTitle) {
      if (seenChapterTitles.has(normTitle)) {
        issues.push({
          id: `dup-ch-title-${ch.id}`,
          category: 'Headings',
          severity: 'issue',
          chapterId: ch.id,
          chapterTitle: ch.title,
          title: `Repeated chapter heading: "${ch.title}"`,
          description: `This chapter shares the exact same title as Chapter ${seenChapterTitles.get(normTitle)}.`,
          targetView: 'studio'
        });
      } else {
        seenChapterTitles.set(normTitle, idx + 1);
      }
    }

    // Empty chapter check (distinguish optional/skipped from required!)
    if (wc === 0) {
      if (ch.is_optional || ch.status === 'skipped') {
        recommendations.push({
          id: `empty-opt-${ch.id}`,
          category: 'Structure',
          severity: 'recommendation',
          chapterId: ch.id,
          chapterTitle: ch.title,
          title: `Optional section "${ch.title}" is currently empty`,
          description: 'You can leave this optional section skipped, write it later, or remove it before final export.',
          targetView: 'studio'
        });
      } else {
        issues.push({
          id: `empty-req-${ch.id}`,
          category: 'Content',
          severity: 'issue',
          chapterId: ch.id,
          chapterTitle: ch.title,
          title: `Empty chapter: "${ch.title}"`,
          description: 'This chapter contains no text. Write content, mark it as skipped, or remove it before publication.',
          targetView: 'studio'
        });
      }
    }

    // Placeholder text detection
    const placeholderMatches = plain.match(placeholderRegex);
    if (placeholderMatches && placeholderMatches.length > 0) {
      const uniqueMatches = [...new Set(placeholderMatches.map(m => m.toUpperCase()))];
      issues.push({
        id: `placeholder-${ch.id}`,
        category: 'Editorial',
        severity: 'issue',
        chapterId: ch.id,
        chapterTitle: ch.title,
        title: `Placeholder text found in "${ch.title}"`,
        description: `Detected unfinished marker(s): ${uniqueMatches.join(', ')}. Replace or remove placeholder notes before exporting.`,
        targetView: 'studio'
      });
    }

    // Heading hierarchy & repeated subheadings inside chapter
    const headingMatches = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)];
    let prevLevel = 1;
    const subheadingSet = new Set();
    for (const match of headingMatches) {
      const level = Number(match[1]);
      const hText = stripHtml(match[2]);
      if (!hText) {
        issues.push({
          id: `empty-heading-${ch.id}`,
          category: 'Formatting',
          severity: 'issue',
          chapterId: ch.id,
          chapterTitle: ch.title,
          title: `Blank heading tag in "${ch.title}"`,
          description: 'An empty heading element was found, which can create blank entries in ebook navigation.',
          targetView: 'studio'
        });
      } else {
        const lowerH = hText.toLowerCase();
        if (subheadingSet.has(lowerH)) {
          issues.push({
            id: `repeat-sub-${ch.id}-${lowerH.slice(0, 12)}`,
            category: 'Headings',
            severity: 'issue',
            chapterId: ch.id,
            chapterTitle: ch.title,
            title: `Repeated subheading "${hText}" in "${ch.title}"`,
            description: 'The same subheading appears multiple times within this chapter.',
            targetView: 'studio'
          });
        }
        subheadingSet.add(lowerH);
      }

      if (level - prevLevel > 1 && prevLevel !== 1) {
        recommendations.push({
          id: `hierarchy-${ch.id}-${level}`,
          category: 'Formatting',
          severity: 'recommendation',
          chapterId: ch.id,
          chapterTitle: ch.title,
          title: `Inconsistent heading jump (H${prevLevel} to H${level}) in "${ch.title}"`,
          description: `Subheading "${hText || 'Untitled'}" skips a heading level. Sequential headings (H2 → H3) improve EPUB accessibility.`,
          targetView: 'studio'
        });
      }
      prevLevel = level;
    }

    // Unintended consecutive blank paragraphs
    if (/(<p>\s*(<br\s*\/?>|&nbsp;)?\s*<\/p>\s*){3,}/i.test(html)) {
      recommendations.push({
        id: `blank-paras-${ch.id}`,
        category: 'Formatting',
        severity: 'recommendation',
        chapterId: ch.id,
        chapterTitle: ch.title,
        title: `Multiple blank lines used for spacing in "${ch.title}"`,
        description: 'Using 3+ empty paragraphs for spacing can cause awkward blank gaps at the top of ebook and print pages. Use Scene Breaks or paragraph spacing settings instead.',
        targetView: 'studio'
      });
    }

    // Check embedded asset references in chapter
    const assetRefs = [...html.matchAll(/data-asset-id=["']([^"']+)["']/gi)];
    for (const ref of assetRefs) {
      const refId = ref[1];
      if (!assetIds.has(refId)) {
        issues.push({
          id: `missing-asset-${ch.id}-${refId}`,
          category: 'Assets',
          severity: 'issue',
          chapterId: ch.id,
          chapterTitle: ch.title,
          title: `Missing image reference in "${ch.title}"`,
          description: `Referenced asset (${refId}) was removed from the project library. Replace or remove the broken figure.`,
          targetView: 'studio'
        });
      }
    }
  });

  // 3. Asset licensing & accessibility checks
  assets.forEach(a => {
    if (!a.alt_text || !a.alt_text.trim()) {
      recommendations.push({
        id: `asset-alt-${a.id}`,
        category: 'Accessibility',
        severity: 'recommendation',
        title: `Image "${a.original_name}" is missing alternative text`,
        description: 'Adding descriptive alt text ensures your EPUB ebook meets accessibility guidelines for screen readers.',
        targetView: 'assets'
      });
    }
    if (a.license_type === 'unknown' || a.license_type === 'editorial_only') {
      issues.push({
        id: `asset-license-${a.id}`,
        category: 'Rights & Licensing',
        severity: 'issue',
        title: `Unverified commercial license for image "${a.original_name}"`,
        description: `This asset is marked as "${a.license_type}". Verify commercial publishing rights before distributing your book.`,
        targetView: 'assets'
      });
    } else if (a.license_type === 'stock_provider_license') {
      recommendations.push({
        id: `asset-stock-license-${a.id}`,
        category: 'Rights & Licensing',
        severity: 'recommendation',
        title: `Review the stock license for image "${a.original_name}"`,
        description: `Confirm the current provider license and restrictions before publication${a.license_url ? ` (${a.license_url})` : ''}. Creator credit and the source page are saved with this asset.`,
        targetView: 'assets'
      });
    }
  });

  // 4. Layout & Design checks
  if (formatting.margin_inner_mm && formatting.margin_inner_mm < 13) {
    issues.push({
      id: 'layout-gutter',
      category: 'Layout',
      severity: 'issue',
      title: `Inner (gutter) margin is very narrow (${formatting.margin_inner_mm} mm)`,
      description: 'Print-on-demand bindings typically require at least 15–20 mm of inner gutter margin so text is not lost in the spine.',
      targetView: 'design'
    });
  }

  // 5. Optional Front & Back Matter recommendations
  const fm = metadata.frontMatter || {};
  const bm = metadata.backMatter || {};
  const anyFmEnabled = Object.values(fm).some(v => v && v.enabled && v.content && v.content.trim());
  if (!anyFmEnabled) {
    recommendations.push({
      id: 'opt-front-matter',
      category: 'Front Matter',
      severity: 'recommendation',
      title: 'Optional front matter sections (Dedication, Preface, Epigraph) are not enabled',
      description: 'This is completely optional. If you wish to include a Dedication or Preface, you can enable them in Front & Back Matter.',
      targetView: 'metadata'
    });
  }

  if ((project.book_type === 'academic' || project.book_type === 'nonfiction') && (!bm.bibliography || !bm.bibliography.enabled || !bm.bibliography.content?.trim())) {
    const researchNotesCount = notes.filter(n => n.note_type === 'research').length;
    if (researchNotesCount > 0) {
      recommendations.push({
        id: 'opt-bibliography',
        category: 'Back Matter',
        severity: 'recommendation',
        title: `You have ${researchNotesCount} research note(s) that could be listed in a Bibliography`,
        description: 'Consider enabling the Bibliography section in Back Matter to compile your cited sources.',
        targetView: 'metadata'
      });
    }
  }

  const wordsPerPage = formatting.trim_size === '6x9' ? 300 : formatting.trim_size === '7x10' ? 380 : 250;
  const estimatedPages = Math.max(1, Math.ceil(totalWords / wordsPerPage) + 4);
  const readingTimeMinutes = Math.max(1, Math.ceil(totalWords / 225));
  const avgSentenceLength = totalSentences > 0 ? Math.round((totalWords / totalSentences) * 10) / 10 : 0;

  return {
    summary: {
      issueCount: issues.length,
      recommendationCount: recommendations.length,
      readyForExport: issues.filter(i => i.id === 'ch-none').length === 0,
      publicationReadinessScore: Math.max(10, 100 - issues.length * 12 - Math.min(20, recommendations.length * 3))
    },
    statistics: {
      totalWords,
      totalCharacters,
      totalChapters: chapters.length,
      completedChapters: chapters.filter(c => c.status === 'completed').length,
      totalParagraphs,
      totalSentences,
      avgSentenceLength,
      estimatedPages,
      readingTimeMinutes,
      chapterStats
    },
    issues,
    recommendations
  };
}

module.exports = {
  runManuscriptReview
};
