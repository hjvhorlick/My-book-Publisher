import { richHtmlToPlainText } from './richText';

function hasText(value) {
  if (typeof value === 'string') return richHtmlToPlainText(value).trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== false;
}

function lines(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return String(item ?? '');
      const step = item.step || item.number || '';
      const label = item.label || item.item || item.name || item.term || item.prompt || '';
      const detail = item.detail || item.definition || item.description || item.notes || '';
      const amount = [item.quantity || item.amount, item.unit, label].filter(Boolean).join(' ');
      return [step ? `${step}.` : '', amount, detail].filter(Boolean).join(' — ');
    }).filter(Boolean).join('\n');
  }
  return typeof value === 'string' ? value : '';
}

function imageReference(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.imageUrl || value.photoUrl || value.dataUrl || value.fileUrl || value.assetUrl || value.url || value.src || '').trim();
}

function migratePhotoSlots(data) {
  const existing = Array.isArray(data.captions) && data.captions.length > 0
    ? data.captions
    : Array.isArray(data.photos) && data.photos.length > 0
      ? data.photos
      : Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : data.captions && typeof data.captions === 'object'
          ? [data.captions]
          : Array.isArray(data.captions)
            ? data.captions
            : null;
  if (!existing) return data.captions;
  return existing.map((photo) => {
    const item = typeof photo === 'string'
      ? (/^(data:image\/|blob:|https?:\/\/|\/)/i.test(photo.trim())
        ? { imageUrl: photo }
        : { title: photo })
      : (photo || {});
    return {
      ...item,
      title: item.title || item.caption || item.captionText || item.description || '',
      location: item.location || item.altText || item.alt || '',
      imageUrl: imageReference(item.imageUrl || item.photoUrl || item.dataUrl || item.fileUrl || item.assetUrl || item.url || item.src || item.image)
    };
  });
}

function tableToText(table) {
  if (!table || typeof table !== 'object') return '';
  const header = Array.isArray(table.headers) ? table.headers.join(' | ') : '';
  const rows = Array.isArray(table.rows)
    ? table.rows.map((row) => Array.isArray(row) ? row.join(' | ') : String(row || '')).join('\n')
    : '';
  return [table.caption, header, rows].filter(Boolean).join('\n');
}

/**
 * Map text and artwork saved by the former template-specific page editors into the
 * common structured-page editor. Original fields are retained so this is additive,
 * not a destructive migration. The returned object is safe to render immediately and
 * can be persisted by the caller as part of the normal page autosave.
 */
export function migrateLegacyPageStructuredData(chapter, categoryId) {
  const source = chapter?.structuredData && typeof chapter.structuredData === 'object'
    ? chapter.structuredData
    : {};
  const data = { ...source };
  const original = JSON.stringify(data);
  const content = String(chapter?.contentHtml || '');
  const photos = migratePhotoSlots(data);
  if (photos && photos !== data.captions) data.captions = photos;

  const hasCurrentStructure = data.pageStructure !== null && data.pageStructure !== undefined && String(data.pageStructure).trim() !== '' && Number.isInteger(Number(data.pageStructure)) && Number(data.pageStructure) >= 0 && Number(data.pageStructure) < 5;
  if (!hasCurrentStructure) {
    const legacyStructure = [data.pageStructure, data.pageStructureIndex, data.layoutIndex, data.layoutVariant, data.mosaicVariant]
      .map((value) => Number(value))
      .find((value) => Number.isInteger(value) && value >= 0);
    if (legacyStructure !== undefined) data.pageStructure = legacyStructure % 5;
  }

  if (!hasText(data.heroImageUrl)) {
    const legacyHero = imageReference(data.photoUrl || data.illustrationUrl || data.diagramUrl || data.imageUrl || data.heroImage);
    if (legacyHero) data.heroImageUrl = legacyHero;
  } else if (typeof data.heroImageUrl !== 'string') {
    data.heroImageUrl = imageReference(data.heroImageUrl);
  }
  if (!hasText(data.secondaryImageUrl)) {
    const legacySecondary = imageReference(data.secondaryPhotoUrl || data.secondaryImage);
    if (legacySecondary) data.secondaryImageUrl = legacySecondary;
  } else if (typeof data.secondaryImageUrl !== 'string') {
    data.secondaryImageUrl = imageReference(data.secondaryImageUrl);
  }

  switch (categoryId) {
    case 'photobook':
      if (!hasText(data.curatorialNote) && hasText(content)) {
        const contentText = richHtmlToPlainText(content).replace(/\s+/g, ' ').trim();
        const captionText = (Array.isArray(data.captions) ? data.captions : [])
          .flatMap((photo) => [photo?.title, photo?.caption, photo?.location, photo?.technical])
          .map((value) => richHtmlToPlainText(value || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join(' ');
        if (contentText && contentText !== captionText) data.curatorialNote = content;
      }
      break;
    case 'cookbook':
      if (!hasText(data.ingredientsHtml) && hasText(data.ingredients)) {
        data.ingredientsHtml = lines(data.ingredients);
      }
      if (!hasText(data.stepsHtml)) {
        const method = data.steps || data.method || data.instructions;
        if (hasText(method)) data.stepsHtml = lines(method);
      }
      if (!hasText(data.chefNotes)) {
        data.chefNotes = data.headnote || data.pairingSuggestion || '';
      }
      if (!hasText(data.stepsHtml) && !hasText(data.steps) && !hasText(data.method) && !hasText(data.instructions) && hasText(content)) {
        data.stepsHtml = content;
      }
      break;
    case 'magazine':
      if (!hasText(data.articleBody)) {
        data.articleBody = data.bodyText || data.article || content || '';
      }
      if (!hasText(data.sidebarContent)) {
        data.sidebarContent = lines(data.sidebarItems || data.highlights || data.datesAndHighlights);
      }
      if (!hasText(data.pullQuote) && data.quote) data.pullQuote = data.quote;
      break;
    case 'storybook':
      if (!hasText(data.storyText)) {
        data.storyText = data.narrative || data.bodyText || data.story || content || '';
      }
      if (!hasText(data.moral) && data.lesson) data.moral = data.lesson;
      break;
    case 'informational':
      if (!hasText(data.overview)) {
        data.overview = data.frameworkSummary || data.instructions || data.bodyText || data.objective || content || '';
      }
      if (!hasText(data.calloutBody)) {
        data.calloutBody = lines(data.learningObjectives || data.keyTakeaways || data.tip || data.helpfulTip);
      }
      if (!hasText(data.calloutTitle)) {
        data.calloutTitle = data.tipTitle || data.calloutHeading || '';
      }
      if (!hasText(data.tableNotes)) {
        const referenceText = typeof data.referenceTable === 'string'
          ? data.referenceTable
          : tableToText(data.referenceTable);
        data.tableNotes = referenceText || tableToText(data.dataTable) || lines(data.keyTerms);
      }
      if (!hasText(data.roadmapSteps)) {
        data.roadmapSteps = lines(data.diagramNodes || data.checklistItems || data.roadmap);
      }
      const comparisonOptions = Array.isArray(data.comparisonOptions)
        ? data.comparisonOptions
        : data.comparisonOptions && typeof data.comparisonOptions === 'object'
          ? [data.comparisonOptions.left || data.comparisonOptions.optionA, data.comparisonOptions.right || data.comparisonOptions.optionB]
          : [];
      if (!hasText(data.comparisonLeft) && comparisonOptions[0] !== undefined) {
        data.comparisonLeft = lines(comparisonOptions[0]);
      }
      if (!hasText(data.comparisonRight) && comparisonOptions[1] !== undefined) {
        data.comparisonRight = lines(comparisonOptions[1]);
      }
      break;
    case 'book':
      if (!hasText(data.chapterText)) {
        data.chapterText = data.manuscript || data.bodyText || data.prose || content || '';
      }
      if (!hasText(data.epigraph) && data.openingQuote) data.epigraph = data.openingQuote;
      if (!hasText(data.marginNote) && data.authorNote) data.marginNote = data.authorNote;
      break;
    default:
      if (!hasText(data.chapterText) && hasText(content)) data.chapterText = content;
  }

  return {
    structuredData: data,
    changed: JSON.stringify(data) !== original
  };
}
