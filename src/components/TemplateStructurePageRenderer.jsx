import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getTemplatePageStructures } from '../data/templatePageStructures';
import { getAiFieldProfile } from '../data/aiPromptCatalog';
import RichTextField from './RichTextField';
import AiFieldButton from './AiFieldButton';
import {
  normalizeRichHtml,
  richHtmlToPlainText
} from '../utils/richText';

const DEFAULT_COPY = {
  photobook: { note: '' },
  cookbook: { ingredients: '', method: '', note: '' },
  magazine: { article: '', quote: '', highlights: '' },
  storybook: { story: '' },
  informational: { overview: '', tip: '', table: '' },
  book: { prose: '' }
};

function StudioTabletShell({ children }) {
  return (
    <div
      className="rounded-[34px] p-4 sm:p-6 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(145deg, #6D4C30 0%, #523720 48%, #3D2714 100%)',
        boxShadow:
          '0 26px 60px rgba(0,0,0,0.58), inset 0 2px 0 rgba(255,255,255,0.18)'
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(8deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 2px, transparent 2px, transparent 14px)'
        }}
      />
      <div className="relative rounded-[26px] p-3 sm:p-4 bg-[#0B0F17] border-[3px] border-slate-700/90 shadow-[0_24px_55px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-center mb-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-600" />
        </div>
        <div className="rounded-[18px] overflow-hidden relative shadow-inner">
          {children}
        </div>
        <div className="flex items-center justify-center mt-2">
          <div className="w-28 h-1 rounded-full bg-slate-600/80" />
        </div>
      </div>
    </div>
  );
}

/**
 * The third-level page design selected for an individual book page.
 * Layout, border, image frame and card treatments all use the selected template's
 * palette and typography; five category-specific structures give each page a genuinely different layout.
 */
export default function TemplateStructurePageRenderer({
  project,
  chapter,
  chapterIndex = 0,
  totalChapters = 1,
  pageIndex = 0,
  totalPages = 1,
  chapterSummaries = [],
  categoryId = 'photobook',
  visualTemplate = {},
  structureIndex = 0,
  isFlipped = false,
  editable = true,
  aiConfigured = false,
  onSaveChapter,
  onRegisterSave,
  onUpdateTitle,
  onUpdateBlock,
  onBackToIndex,
  getCuratedPhotoSlots,
  renderPhotoSlot,
  fontFamily
}) {
  if (!project || !chapter) return null;

  const currentStructureIndex = ((Number(structureIndex) || 0) % 5 + 5) % 5;
  const structures = getTemplatePageStructures(categoryId, visualTemplate);
  const structure = structures[currentStructureIndex];
  const incomingStructuredData = chapter.structuredData || {};
  const [draftTitle, setDraftTitle] = useState(chapter.title || '');
  const [draftSubtitle, setDraftSubtitle] = useState(chapter.subtitle || '');
  const [draftData, setDraftData] = useState(incomingStructuredData);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const saveCallbackRef = useRef(onSaveChapter);
  const flushPromiseRef = useRef(null);
  const flushDraftRef = useRef(null);
  const sd = draftData;
  const palette = {
    pageBg: visualTemplate.pageBg || '#FCF8F1',
    pageText: visualTemplate.pageText || '#263142',
    border: visualTemplate.borderColor || '#B68745',
    accent: visualTemplate.accentColor || visualTemplate.borderColor || '#8F6534',
    font: fontFamily || visualTemplate.fontFamily || 'Georgia, serif'
  };
  const detailSlotCount = Math.max(structure.photoSlots || 1, 1);
  const copy = DEFAULT_COPY[categoryId] || DEFAULT_COPY.photobook;
  const textColor = palette.pageText;

  useEffect(() => {
    saveCallbackRef.current = onSaveChapter;
  }, [onSaveChapter]);

  // Keep drafts synchronized when a new page or an uploaded image is opened, but don't
  // replace text while the creator is typing.
  useEffect(() => {
    if (!hasDraftChanges) {
      setDraftTitle(chapter.title || '');
      setDraftSubtitle(chapter.subtitle || '');
      setDraftData(chapter.structuredData || {});
    }
  }, [chapter.updatedAt, chapter.title, chapter.subtitle]);

  const buildPhotoSlots = (source, count) => {
    const existingCount = Array.isArray(source?.captions) ? source.captions.length : 0;
    const slotCount = Math.max(count, existingCount);
    const defaults = getCuratedPhotoSlots ? getCuratedPhotoSlots(slotCount) : [];
    return Array.from({ length: slotCount }, (_, index) => {
      const base = defaults[index] || {};
      const current = Array.isArray(source?.captions) ? source.captions[index] || {} : {};
      return {
        ...base,
        ...current,
        imageUrl:
          current.imageUrl ||
          (index === 0 ? source?.heroImageUrl : '') ||
          base.imageUrl
      };
    });
  };

  const photoSlots = buildPhotoSlots(draftData, detailSlotCount);

  const saveBlock = (key, value) => {
    if (!editable) return;
    setDraftData((previous) => ({ ...previous, [key]: value }));
    setHasDraftChanges(true);
  };

  const saveCaption = (index, key, value) => {
    if (!editable) return;
    setDraftData((previous) => {
      const currentSlots = buildPhotoSlots(previous, detailSlotCount);
      const nextSlots = currentSlots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [key]: value } : slot
      );
      return { ...previous, captions: nextSlots };
    });
    setHasDraftChanges(true);
  };

  const updateTitle = (value) => {
    if (!editable) return;
    setDraftTitle(value);
    setHasDraftChanges(true);
  };

  const updateSubtitle = (value) => {
    if (!editable) return;
    setDraftSubtitle(value);
    setHasDraftChanges(true);
  };

  const buildSavePatch = (titleValue, subtitleValue, dataValue) => {
    const recipeIngredientText = Array.isArray(dataValue.ingredients)
      ? dataValue.ingredients.map((item) =>
          typeof item === 'string'
            ? item
            : `${item.quantity || item.amount || ''} ${item.unit || ''} ${item.item || ''}`.trim()
        ).join('\n')
      : '';
    const asFieldHtml = (field) => {
      if (Array.isArray(field)) return normalizeRichHtml(field.join('\n'));
      return normalizeRichHtml(field || '');
    };
    let contentBlocks;
    if (categoryId === 'cookbook') {
      const ingredients = asFieldHtml(dataValue.ingredientsHtml || recipeIngredientText);
      const steps = asFieldHtml(dataValue.stepsHtml || dataValue.steps);
      const chefNotes = asFieldHtml(dataValue.chefNotes);
      contentBlocks = [
        ingredients && `<h2>Ingredients</h2>${ingredients}`,
        steps && `<h2>Preparation Steps</h2>${steps}`,
        chefNotes && `<h2>Chef’s Note</h2>${chefNotes}`
      ];
    } else {
      const fieldsByCategory = {
        photobook: [dataValue.curatorialNote, ...(Array.isArray(dataValue.captions) ? dataValue.captions.map((photo) => photo?.title) : [])],
        magazine: [dataValue.articleBody, dataValue.pullQuote, dataValue.sidebarContent],
        storybook: [dataValue.storyText, dataValue.moral],
        informational: [dataValue.overview, dataValue.calloutBody, dataValue.roadmapSteps, dataValue.comparisonLeft, dataValue.comparisonRight, dataValue.tableNotes],
        book: [dataValue.chapterText, dataValue.epigraph, dataValue.marginNote, dataValue.pullQuote]
      }[categoryId] || [];
      contentBlocks = fieldsByCategory.map(asFieldHtml);
    }
    const contentHtml = contentBlocks.filter(Boolean).join('');

    const pageContentData = { ...dataValue };
    delete pageContentData.pageStructure;
    delete pageContentData.mosaicVariant;
    delete pageContentData.isFlipped;
    return {
      title: titleValue,
      subtitle: subtitleValue,
      sectionType: chapter.sectionType,
      layoutId: visualTemplate.layoutId,
      // The API merges this partial data object, preserving independent page-layout controls.
      structuredData: pageContentData,
      contentHtml
    };
  };

  const flushDraft = useCallback(() => {
    if (!editable || !chapter?.id || !saveCallbackRef.current) {
      return Promise.resolve();
    }
    if (flushPromiseRef.current) {
      return flushPromiseRef.current.then(() => flushDraftRef.current?.());
    }
    if (!hasDraftChanges) return Promise.resolve();

    setHasDraftChanges(false);
    const pending = Promise.resolve()
      .then(() =>
        saveCallbackRef.current(
          chapter.id,
          buildSavePatch(draftTitle, draftSubtitle, draftData)
        )
      )
      .catch((error) => {
        setHasDraftChanges(true);
        throw error;
      })
      .finally(() => {
        if (flushPromiseRef.current === pending) flushPromiseRef.current = null;
      });
    flushPromiseRef.current = pending;
    return pending;
  }, [
    editable,
    hasDraftChanges,
    chapter.id,
    chapter.subtitle,
    chapter.sectionType,
    draftTitle,
    draftSubtitle,
    draftData,
    visualTemplate.layoutId,
    categoryId
  ]);

  const handleDraftBlur = useCallback(() => {
    void flushDraft().catch((error) => {
      console.error('Could not save this page design:', error);
    });
  }, [flushDraft]);

  useEffect(() => {
    flushDraftRef.current = flushDraft;
  }, [flushDraft]);

  useEffect(() => {
    if (!onRegisterSave) return undefined;
    onRegisterSave(() => flushDraftRef.current?.());
    return () => onRegisterSave(null);
  }, [onRegisterSave]);

  useEffect(() => {
    if (!editable || !hasDraftChanges || !onSaveChapter || !chapter?.id) return undefined;

    const timer = setTimeout(() => {
      void flushDraft().catch((error) => {
        console.error('Could not save this page design:', error);
      });
    }, 650);
    return () => clearTimeout(timer);
  }, [
    editable,
    hasDraftChanges,
    draftTitle,
    draftSubtitle,
    draftData,
    chapter.id,
    chapter.subtitle,
    chapter.sectionType,
    visualTemplate.layoutId,
    categoryId,
    flushDraft,
    onSaveChapter
  ]);

  const fieldStyle = {
    color: textColor,
    fontFamily: palette.font
  };

  const updateText = (field, value) => {
    saveBlock(field, value);
  };

  const makeAiContext = (fieldKey, options = {}) => ({
    project,
    bookTitle: project.title,
    topic: project.centralIdea || '',
    chapter: { ...chapter, title: draftTitle || chapter.title, subtitle: draftSubtitle || chapter.subtitle },
    chapterTitle: draftTitle || chapter.title,
    chapterIndex,
    totalChapters,
    pageIndex,
    pageHeading: draftTitle || chapter.title,
    pageSubtitle: draftSubtitle || chapter.subtitle,
    chapterSummaries,
    categoryId,
    templateName: visualTemplate.name,
    fieldKey,
    fieldLabel: options.fieldLabel,
    format: options.format,
    fieldContext: options.fieldContext,
    maxWords: options.maxWords
  });

  const textArea = (field, value, options = {}) => {
    const profile = getAiFieldProfile(categoryId, field);
    const fieldLabel = options.fieldLabel || profile.label;
    const maxWords = options.maxWords || Math.max(20, Math.min(
      profile.maxWords,
      (options.rows || 4) * 12
    ));
    const placeholder = options.placeholder || (aiConfigured
      ? `Write ${fieldLabel.toLowerCase()} here, or click “Write with AI”.`
      : `Write ${fieldLabel.toLowerCase()} here. Set up AI in the header to draft it automatically.`);
    return (
      <RichTextField
        rows={options.rows || 4}
        readOnly={!editable}
        value={value ?? ''}
        onChange={(html) => updateText(field, html)}
        onBlur={handleDraftBlur}
        placeholder={placeholder}
        className={`focus:outline-none break-words ${options.className || ''}`}
        style={{
          ...fieldStyle,
          lineHeight: options.lineHeight || '1.55',
          ...options.style
        }}
        ariaLabel={options.ariaLabel || fieldLabel}
        aiConfigured={aiConfigured}
        aiContext={makeAiContext(field, { ...options, fieldLabel, maxWords })}
      />
    );
  };

  const textInputField = (field, label, value, options = {}) => {
    const profile = getAiFieldProfile(categoryId, field);
    const fieldLabel = options.fieldLabel || label || profile.label;
    const currentValue = String(value ?? '');
    const maxWords = options.maxWords || profile.maxWords;
    return (
      <label className="block min-w-0 text-[9px] font-bold uppercase tracking-wide opacity-80">
        {label}
        <div className="mt-1 flex min-w-0 items-center gap-1">
          <input
            type="text"
            value={currentValue}
            onChange={(event) => saveBlock(field, event.target.value)}
            onBlur={handleDraftBlur}
            placeholder={options.placeholder || `Add ${label.toLowerCase()}`}
            aria-label={fieldLabel}
            className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs font-normal normal-case"
            style={{ color: palette.pageText, borderColor: `${palette.border}66`, backgroundColor: `${palette.pageBg}CC` }}
          />
          <AiFieldButton
            enabled={aiConfigured && editable}
            compact
            context={makeAiContext(field, {
              fieldLabel,
              fieldContext: options.fieldContext,
              maxWords
            })}
            currentValue={currentValue}
            onInsert={(text, mode) => {
              const generated = richHtmlToPlainText(text).replace(/\s+/g, ' ').trim();
              saveBlock(field, mode === 'append' ? `${currentValue} ${generated}`.trim() : generated);
            }}
          />
        </div>
      </label>
    );
  };

  const titleInput = (
    <div className="space-y-1.5">
      <textarea
        rows={2}
        readOnly={!editable}
        aria-label={pageIndex === 0 ? 'Chapter title' : 'Page heading'}
        value={draftTitle}
        onChange={(event) => updateTitle(event.target.value)}
        onBlur={handleDraftBlur}
        placeholder={pageIndex === 0 ? `Chapter ${chapterIndex + 1} title` : `Page ${pageIndex + 1} heading`}
        className="w-full resize-none break-words bg-transparent font-bold focus:outline-none"
        style={{
          ...fieldStyle,
          color: currentStructureIndex === 1 ? '#FFFFFF' : palette.accent
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-medium opacity-75">{draftTitle.trim().split(/\s+/).filter(Boolean).length} words</span>
        <AiFieldButton
          enabled={aiConfigured && editable}
          context={makeAiContext('chapterTitle', {
            maxWords: Math.min(getAiFieldProfile(categoryId, 'chapterTitle').maxWords, 10)
          })}
          currentValue={draftTitle}
          compact
          onInsert={(text, mode) => {
            const generatedTitle = richHtmlToPlainText(text).replace(/\s+/g, ' ').trim();
            updateTitle(mode === 'append' ? `${draftTitle} ${generatedTitle}`.trim() : generatedTitle);
          }}
        />
      </div>
      <div className="mt-2 border-t pt-2" style={{ borderColor: `${palette.border}55` }}>
        <div className="mb-1 text-left text-[9px] font-extrabold uppercase tracking-wider opacity-75">Subtitle / page deck · optional</div>
        <RichTextField
          rows={2}
          value={draftSubtitle}
          readOnly={!editable}
          onChange={updateSubtitle}
          onBlur={handleDraftBlur}
          placeholder={aiConfigured
            ? 'Add a short subtitle, or click “Write with AI”.'
            : 'Add a short subtitle. Set up AI in the header to draft it automatically.'}
          className="text-left text-xs"
          style={{ ...fieldStyle, lineHeight: '1.45' }}
          ariaLabel="Page subtitle editor"
          aiConfigured={aiConfigured}
          aiContext={makeAiContext('pageSubtitle', {
            fieldLabel: 'Page subtitle or deck',
            maxWords: Math.min(getAiFieldProfile(categoryId, 'pageSubtitle').maxWords, 30)
          })}
        />
      </div>
    </div>
  );

  const updateRecipeLines = (field, value) => {
    if (field === 'ingredients') {
      const ingredients = value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ amount: '', unit: '', item: line }));
      updateText(field, ingredients);
    } else {
      updateText(field, value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean));
    }
  };

  const recipeIngredientsArea = (rows = 8) => (
    <RichTextField
      rows={rows}
      readOnly={!editable}
      value={sd.ingredientsHtml || ingredientsText}
      onChange={(html) => {
        saveBlock('ingredientsHtml', html);
        updateRecipeLines('ingredients', richHtmlToPlainText(html));
      }}
      onBlur={handleDraftBlur}
      placeholder={aiConfigured
        ? 'Add one ingredient per line, or click “Write with AI”.'
        : 'Add one ingredient per line. Set up AI in the header to draft them.'}
      className="text-xs sm:text-sm"
      style={{ ...fieldStyle, lineHeight: '1.65' }}
      ariaLabel="Recipe ingredients editor"
      aiConfigured={aiConfigured}
      aiContext={makeAiContext('ingredients', { maxWords: Math.max(20, Math.min(100, rows * 12)) })}
    />
  );

  const recipeMethodArea = (rows = 8, extraStyle = {}) => (
    <RichTextField
      rows={rows}
      readOnly={!editable}
      value={methodText}
      onChange={(html) => {
        saveBlock('stepsHtml', html);
        updateRecipeLines('steps', richHtmlToPlainText(html));
      }}
      onBlur={handleDraftBlur}
      placeholder={aiConfigured
        ? 'Add numbered preparation steps, or click “Write with AI”.'
        : 'Add numbered preparation steps. Set up AI in the header to draft them.'}
      className="text-xs sm:text-sm"
      style={{ ...fieldStyle, lineHeight: '1.65', ...extraStyle }}
      ariaLabel="Recipe method editor"
      aiConfigured={aiConfigured}
      aiContext={makeAiContext('steps', { maxWords: Math.max(20, Math.min(180, rows * 12)) })}
    />
  );

  const ingredientsText = Array.isArray(sd.ingredients)
    ? sd.ingredients
        .map((item) =>
          typeof item === 'string'
            ? item
            : `${item.quantity || item.amount || ''} ${item.unit || ''} ${item.item || ''}`.trim()
        )
        .join('\n')
    : copy.ingredients || '';
  const methodText = sd.stepsHtml || (Array.isArray(sd.steps)
    ? sd.steps.join('\n')
    : sd.steps || copy.method || '');

  const articleText =
    sd.articleBody ||
    (chapter.contentHtml || '').replace(/<[^>]+>/g, '').trim() ||
    copy.article || '';
  const storyText = sd.storyText || copy.story || '';
  const guideText = sd.overview || copy.overview || '';
  const proseText =
    sd.chapterText ||
    (chapter.contentHtml || '').replace(/<[^>]+>/g, '').trim() ||
    copy.prose || '';

  const categoryPhotoCounts = {
    photobook: detailSlotCount,
    cookbook: detailSlotCount,
    magazine: detailSlotCount,
    storybook: detailSlotCount,
    informational: detailSlotCount,
    book: detailSlotCount
  };
  const totalPhotoSlots = categoryPhotoCounts[categoryId] || detailSlotCount;

  const imageFrameStyle = (shape = 'rect') => {
    const baseRadius =
      visualTemplate.borderStyle?.includes('rounded') ||
      visualTemplate.borderStyle?.includes('ornate')
        ? '14px'
        : visualTemplate.borderStyle?.includes('polaroid')
        ? '4px'
        : '8px';
    const radius =
      shape === 'arch'
        ? '100px 100px 12px 12px'
        : shape === 'oval'
        ? '48% 48% 10px 10px'
        : shape === 'square'
        ? '3px'
        : baseRadius;
    const border =
      currentStructureIndex === 0
        ? `3px double ${palette.border}`
        : currentStructureIndex === 1
        ? `3px solid ${palette.accent}`
        : currentStructureIndex === 2
        ? `3px solid ${palette.border}`
        : currentStructureIndex === 3
        ? `5px solid ${palette.accent}`
        : `2px dashed ${palette.border}`;
    return {
      border,
      borderRadius: currentStructureIndex === 4 ? '2px' : radius,
      backgroundColor: palette.pageBg,
      boxShadow:
        currentStructureIndex === 2 || currentStructureIndex === 4
          ? `0 0 0 2px ${palette.pageBg}, 0 0 0 4px ${palette.border}66, 0 8px 18px rgba(0,0,0,0.2)`
          : currentStructureIndex === 3
          ? `0 10px 24px ${palette.accent}33`
          : '0 7px 16px rgba(0,0,0,0.2)'
    };
  };

  const renderPhoto = (
    index,
    heightClass = 'h-48',
    shape = 'rect',
    totalCount = totalPhotoSlots,
    label = true
  ) => {
    const slot = photoSlots[index] || {};
    const imageUrl =
      slot.imageUrl ||
      (index === 0 ? sd.heroImageUrl : '') ||
      undefined;
    return (
      <div
        key={`photo-slot-${index}-${totalCount}`}
        className="min-w-0"
        style={{
          backgroundColor: palette.pageBg,
          border: `1px solid ${palette.border}88`,
          padding: currentStructureIndex === 0 ? '5px' : '4px',
          boxShadow:
            currentStructureIndex === 2
              ? '0 8px 16px rgba(0,0,0,0.24)'
              : '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {renderPhotoSlot &&
          renderPhotoSlot({
            imageUrl,
            fallbackIndex: index,
            target: {
              type: 'captionSlot',
              index,
              totalCount,
              onImageChange: (url) => saveCaption(index, 'imageUrl', url)
            },
            heightClass,
            frameStyle: imageFrameStyle(shape)
          })}
        {label && (
          <div className="mt-1.5">
            <RichTextField
              rows={1}
              value={slot.title || ''}
              readOnly={!editable}
              onChange={(html) => saveCaption(index, 'title', html)}
              onBlur={handleDraftBlur}
              placeholder={aiConfigured
                ? `Photo ${index + 1} caption. Click “Write with AI” to draft it.`
                : `Photo ${index + 1} caption. Set up AI in the header to draft it.`}
              className="text-center text-[10px] font-bold sm:text-xs"
              compactToolbar
              style={{ color: palette.accent, fontFamily: palette.font, lineHeight: '1.35' }}
              ariaLabel={`Photo ${index + 1} caption editor`}
              aiConfigured={aiConfigured}
              aiContext={makeAiContext('photoCaption', {
                fieldLabel: `Photo ${index + 1} caption`,
                fieldContext: slot.location || slot.altText || slot.description || '',
                maxWords: Math.min(getAiFieldProfile(categoryId, 'photoCaption').maxWords, 18)
              })}
            />
            {editable && (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="text"
                  value={slot.location || ''}
                  onChange={(event) => saveCaption(index, 'location', event.target.value)}
                  onBlur={handleDraftBlur}
                  placeholder="Place or short photo note (optional)"
                  aria-label={`Photo ${index + 1} place or note`}
                  className="min-w-0 flex-1 rounded-md border px-2 py-1 text-[10px]"
                  style={{ color: palette.pageText, borderColor: `${palette.border}66`, backgroundColor: `${palette.pageBg}CC` }}
                />
                <AiFieldButton
                  enabled={aiConfigured && editable}
                  compact
                  context={makeAiContext('photoLocation', {
                    fieldLabel: `Photo ${index + 1} place or note`,
                    fieldContext: [slot.title, slot.altText, slot.description].filter(Boolean).join(' · '),
                    maxWords: 14
                  })}
                  currentValue={slot.location || ''}
                  onInsert={(text, mode) => {
                    const generated = richHtmlToPlainText(text).replace(/\s+/g, ' ').trim();
                    saveCaption(index, 'location', mode === 'append'
                      ? `${slot.location || ''} ${generated}`.trim()
                      : generated);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const cardStyle = (variant = currentStructureIndex) => {
    if (variant === 0) {
      return {
        backgroundColor: `${palette.accent}12`,
        border: `1px solid ${palette.border}99`,
        borderLeft: `5px solid ${palette.accent}`,
        borderRadius: '10px'
      };
    }
    if (variant === 1) {
      return {
        backgroundColor: `${palette.accent}10`,
        border: `1.5px solid ${palette.border}`,
        borderTop: `5px solid ${palette.accent}`,
        borderRadius: '8px 8px 14px 14px'
      };
    }
    if (variant === 2) {
      return {
        backgroundColor: `${palette.accent}12`,
        border: `3px double ${palette.border}`,
        borderRadius: '18px 18px 8px 8px',
        boxShadow: `inset 0 0 0 2px ${palette.pageBg}, 0 7px 15px rgba(0,0,0,0.13)`
      };
    }
    if (variant === 3) {
      return {
        background: `linear-gradient(110deg, ${palette.accent}20, ${palette.pageBg} 65%)`,
        border: `1px solid ${palette.border}88`,
        borderLeft: `7px solid ${palette.accent}`,
        borderRadius: '3px 18px 18px 3px',
        boxShadow: `0 8px 18px ${palette.accent}20`
      };
    }
    return {
      backgroundColor: `${palette.accent}0D`,
      border: `2px dotted ${palette.border}`,
      borderRadius: '4px',
      boxShadow: `inset 0 0 0 3px ${palette.pageBg}, inset 0 0 0 4px ${palette.accent}25`
    };
  };

  const card = (heading, content, options = {}) => (
    <section
      className={`p-3.5 sm:p-4 overflow-hidden ${options.className || ''}`}
      style={{ ...cardStyle(options.variant), ...options.style }}
    >
      {heading && (
        <div
          className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest mb-1.5"
          style={{ color: palette.accent }}
        >
          {currentStructureIndex === 2 || currentStructureIndex === 4 ? '✦ ' : currentStructureIndex === 3 ? '▰ ' : '❖ '}
          {heading}
        </div>
      )}
      {content}
    </section>
  );

  const header = (
    <div
      className={`relative mb-4 px-3 sm:px-5 py-3 ${
        currentStructureIndex === 1
          ? 'text-white rounded-t-2xl'
          : currentStructureIndex === 3
          ? 'text-left'
          : 'text-center'
      }`}
      style={
        currentStructureIndex === 1
          ? { backgroundColor: palette.accent, borderBottom: `4px double ${palette.border}` }
          : currentStructureIndex === 0
          ? { borderBottom: `2px solid ${palette.border}`, color: palette.pageText }
          : currentStructureIndex === 2
          ? { borderBottom: `4px double ${palette.border}`, color: palette.pageText }
          : currentStructureIndex === 3
          ? { borderLeft: `6px solid ${palette.accent}`, borderBottom: `1px solid ${palette.border}88`, color: palette.pageText }
          : { border: `1px dashed ${palette.border}AA`, borderRadius: '18px', color: palette.pageText }
      }
    >
      <div className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.16em]">
        <span className="truncate opacity-80">
          {currentStructureIndex === 0
            ? 'CLASSICAL PAGE DESIGN'
            : currentStructureIndex === 1
            ? 'FEATURE LAYOUT'
            : currentStructureIndex === 2
            ? 'ILLUSTRATED EDITION'
            : currentStructureIndex === 3
            ? 'PANORAMA SPREAD'
            : 'COLLECTOR’S FOLIO'}
        </span>
        <span className="shrink-0">PAGE {pageIndex + 1}</span>
      </div>
      <div
        className={`mt-1 ${
          currentStructureIndex === 0 || currentStructureIndex === 3
            ? 'text-left text-lg sm:text-2xl'
            : currentStructureIndex === 1
            ? 'text-center text-xl sm:text-3xl'
            : 'text-center text-xl sm:text-2xl'
        } font-bold leading-tight`}
      >
        {titleInput}
      </div>
      {(currentStructureIndex === 2 || currentStructureIndex === 4) && (
        <div
          className={`absolute ${currentStructureIndex === 2 ? 'left-1/2 -translate-x-1/2 -bottom-3 w-6 h-6 rounded-full' : 'right-2 -bottom-2 w-5 h-5 rounded-sm'} flex items-center justify-center text-[10px] font-black text-white shadow`}
          style={{ backgroundColor: palette.accent, border: `2px solid ${palette.pageBg}` }}
        >
          {currentStructureIndex === 2 ? '✦' : 'V'}
        </div>
      )}
    </div>
  );

  const backButton = onBackToIndex ? (
    <button
      type="button"
      onClick={onBackToIndex}
      className="mb-3 px-3 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold"
      style={{
        backgroundColor: `${palette.accent}18`,
        color: palette.accent,
        border: `1px solid ${palette.border}88`
      }}
    >
      ↑ Back to Index Page
    </button>
  ) : null;

  const photoPage = () => {
    if (currentStructureIndex === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          <div className={`md:col-span-7 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
            {renderPhoto(0, 'h-64 sm:h-[330px]', 'rect', 3)}
          </div>
          <div className={`md:col-span-5 grid grid-rows-2 gap-3 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
            {renderPhoto(1, 'h-32 sm:h-40', 'square', 3)}
            {renderPhoto(2, 'h-32 sm:h-40', 'square', 3)}
          </div>
          <div className="md:col-span-12">
            {card(
              'Curatorial Note',
              textArea('curatorialNote', sd.curatorialNote || copy.note, {
                rows: 2,
                className: 'text-xs sm:text-sm'
              })
            )}
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 1) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-40 sm:h-52', 'rect', 4)}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
            {[1, 2, 3].map((idx) => renderPhoto(idx, 'h-28 sm:h-36', 'arch', 4))}
          </div>
          {card(
            'Ribbon-Crowned Story Card',
            textArea('curatorialNote', sd.curatorialNote || copy.note, {
              rows: 2,
              className: 'text-xs sm:text-sm'
            })
          )}
        </div>
      );
    }
    if (currentStructureIndex === 3) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-52 sm:h-64', 'rect', 4)}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((index) => renderPhoto(index, 'h-28 sm:h-36', 'square', 4))}
          </div>
          {card('Panorama Caption Bar', textArea('curatorialNote', sd.curatorialNote || copy.note, { rows: 3, className: 'text-xs sm:text-sm' }), { style: { borderLeft: `7px solid ${palette.accent}`, borderRadius: '4px 18px 18px 4px' } })}
        </div>
      );
    }
    if (currentStructureIndex === 4) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, index) => renderPhoto(index, 'h-28 sm:h-36', index % 2 === 0 ? 'square' : 'arch', 6))}
          </div>
          {card('Collector’s Note', textArea('curatorialNote', sd.curatorialNote || copy.note, { rows: 3, className: 'text-xs sm:text-sm' }), { variant: 4, className: 'max-w-3xl mx-auto' })}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        <div className={`md:col-span-7 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
          {renderPhoto(0, 'h-64 sm:h-[320px]', 'square', 5)}
        </div>
        <div className={`md:col-span-5 grid grid-rows-2 gap-3 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
          {renderPhoto(1, 'h-28 sm:h-36', 'arch', 5)}
          {renderPhoto(2, 'h-28 sm:h-36', 'arch', 5)}
        </div>
        <div className="md:col-span-4">{renderPhoto(3, 'h-28 sm:h-36', 'square', 5)}</div>
        <div className="md:col-span-4">{renderPhoto(4, 'h-28 sm:h-36', 'square', 5)}</div>
        <div className="md:col-span-4">
          {card(
            'Medallion Scroll',
            textArea('curatorialNote', sd.curatorialNote || copy.note, {
              rows: 3,
              className: 'text-xs'
            })
          )}
        </div>
      </div>
    );
  };

  const cookbookPage = () => {
    const recipeDetailsContext = [ingredientsText, richHtmlToPlainText(methodText), sd.chefNotes]
      .filter(Boolean)
      .join('\n')
      .slice(0, 500);
    const recipeHeader = (
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest"
            style={{
              color: palette.accent,
              backgroundColor: `${palette.accent}16`,
              border: `1px solid ${palette.border}88`
            }}
          >
            {sd.course || 'RECIPE DETAILS'}
          </span>
          {sd.servings && <span className="text-[10px] font-bold">Serves {sd.servings}</span>}
          {sd.prepTime && <span className="text-[10px] font-bold">Prep {sd.prepTime}</span>}
          {sd.cookTime && <span className="text-[10px] font-bold">Cook {sd.cookTime}</span>}
          {sd.difficulty && <span className="text-[10px] font-bold">{sd.difficulty}</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl border p-2 sm:grid-cols-5" style={{ borderColor: `${palette.border}55`, backgroundColor: `${palette.accent}08` }}>
          {textInputField('course', 'Course', sd.course, { placeholder: 'Main, dessert…', maxWords: 4, fieldContext: recipeDetailsContext })}
          {textInputField('servings', 'Serves', sd.servings, { placeholder: '4 people', maxWords: 6, fieldContext: recipeDetailsContext })}
          {textInputField('prepTime', 'Prep time', sd.prepTime, { placeholder: 'Approx. time', maxWords: 6, fieldContext: recipeDetailsContext })}
          {textInputField('cookTime', 'Cook time', sd.cookTime, { placeholder: 'Approx. time', maxWords: 6, fieldContext: recipeDetailsContext })}
          {textInputField('difficulty', 'Difficulty', sd.difficulty, { placeholder: 'Simple, moderate…', maxWords: 3, fieldContext: recipeDetailsContext })}
        </div>
      </div>
    );
    const recipeCards = (showPhoto = true) => (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className={`md:col-span-5 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
          {showPhoto && renderPhoto(0, 'h-64 sm:h-80', 'arch', 1)}
        </div>
        <div className={`md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
          {card(
            'Ingredients',
            recipeIngredientsArea(8)
          )}
          {card('Method', recipeMethodArea(8))}
        </div>
      </div>
    );
    if (currentStructureIndex === 0) {
      return (
        <div>
          {recipeHeader}
          {recipeCards(true)}
          <div className="mt-3">
            {card('Chef’s Note', textArea('chefNotes', sd.chefNotes || copy.note, { rows: 2, className: 'text-xs' }))}
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 1) {
      return (
        <div className="space-y-4">
          {recipeHeader}
          {renderPhoto(0, 'h-36 sm:h-48', 'rect', 2)}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {card('Ingredients', recipeIngredientsArea(7))}
            {card('Method', recipeMethodArea(7))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
            {renderPhoto(1, 'h-28 sm:h-36', 'arch', 2)}
            {card('Kitchen Tip', textArea('chefNotes', sd.chefNotes || copy.note, { rows: 3, className: 'text-xs' }))}
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 3) {
      return (
        <div className="space-y-4">
          {recipeHeader}
          {renderPhoto(0, 'h-48 sm:h-60', 'arch', 2)}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <div className="md:col-span-5">
              {card('Ingredients', recipeIngredientsArea(8), { variant: 3 })}
            </div>
            <div className="md:col-span-7 space-y-3">
              {renderPhoto(1, 'h-28 sm:h-36', 'square', 2)}
              {card('Preparation Timeline', recipeMethodArea(6, { lineHeight: '1.7' }), { variant: 3 })}
            </div>
          </div>
          {card('Chef’s Note', textArea('chefNotes', sd.chefNotes || copy.note, { rows: 2, className: 'text-xs' }), { style: { borderLeft: `7px solid ${palette.accent}` } })}
        </div>
      );
    }
    if (currentStructureIndex === 4) {
      return (
        <div className="space-y-4">
          {recipeHeader}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => renderPhoto(index, 'h-32 sm:h-40', index === 1 ? 'arch' : 'square', 3))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <div className="md:col-span-4">{card('Kitchen Notebook · Ingredients', recipeIngredientsArea(9), { variant: 4 })}</div>
            <div className="md:col-span-8">{card('Method & Tasting Notes', recipeMethodArea(9), { variant: 4 })}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {recipeHeader}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((idx) => renderPhoto(idx, 'h-32 sm:h-40', idx === 1 ? 'arch' : 'square', 3))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            {card('Ingredients Scroll', recipeIngredientsArea(8))}
          </div>
          <div className="md:col-span-7">
            {card('Preparation & Chef’s Note', recipeMethodArea(8))}
          </div>
        </div>
      </div>
    );
  };

  const magazinePage = () => {
    if (currentStructureIndex === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className={`md:col-span-7 space-y-3 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
            {card(
              'Feature Story',
              textArea('articleBody', articleText, { rows: 9, className: 'text-xs sm:text-sm' })
            )}
            {card(
              'Pull Quote',
              textArea('pullQuote', sd.pullQuote || copy.quote, {
                rows: 3,
                className: 'text-center italic text-sm sm:text-base'
              })
            )}
          </div>
          <div className={`md:col-span-5 space-y-3 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
            {renderPhoto(0, 'h-56 sm:h-72', 'rect', 2)}
            {renderPhoto(1, 'h-32 sm:h-40', 'arch', 2)}
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 1) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-44 sm:h-56', 'rect', 2)}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className={`md:col-span-8 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
              {card('Editorial Feature', textArea('articleBody', articleText, { rows: 8, className: 'text-xs sm:text-sm' }))}
            </div>
            <div className={`md:col-span-4 space-y-3 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
              {card('Ribbon Quote', textArea('pullQuote', sd.pullQuote || copy.quote, { rows: 4, className: 'text-xs italic text-center' }))}
              {card('Dates & Highlights', textArea('sidebarContent', sd.sidebarContent || copy.highlights, { rows: 4, className: 'text-xs' }))}
            </div>
          </div>
          {renderPhoto(1, 'h-24 sm:h-32', 'arch', 2)}
        </div>
      );
    }
    if (currentStructureIndex === 3) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-48 sm:h-60', 'rect', 3)}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className={`md:col-span-8 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
              {card('Lead Feature', textArea('articleBody', articleText, { rows: 10, className: 'text-xs sm:text-sm' }), { variant: 3 })}
            </div>
            <aside className={`md:col-span-4 space-y-3 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
              {renderPhoto(1, 'h-28 sm:h-36', 'arch', 3)}
              {card('Insight Sidebar', textArea('sidebarContent', sd.sidebarContent || copy.highlights, { rows: 4, className: 'text-xs' }), { variant: 3 })}
              {renderPhoto(2, 'h-24 sm:h-28', 'square', 3)}
            </aside>
          </div>
          {card('Pull Quote', textArea('pullQuote', sd.pullQuote || copy.quote, { rows: 2, className: 'text-center italic text-sm' }), { style: { borderTop: `5px solid ${palette.accent}` } })}
        </div>
      );
    }
    if (currentStructureIndex === 4) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((index) => renderPhoto(index, 'h-32 sm:h-40', index % 2 === 0 ? 'square' : 'arch', 4))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-4">
              {card('Coverline Quote', textArea('pullQuote', sd.pullQuote || copy.quote, { rows: 7, className: 'text-center italic text-sm sm:text-base' }), { variant: 4 })}
            </div>
            <div className="md:col-span-8">
              {card('The Full Story', textArea('articleBody', articleText, { rows: 10, className: 'text-xs sm:text-sm' }), { variant: 4 })}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          {renderPhoto(0, 'h-40 sm:h-52', 'square', 2)}
          {renderPhoto(1, 'h-40 sm:h-52', 'arch', 2)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-4">
            {card('Medallion Pull Quote', textArea('pullQuote', sd.pullQuote || copy.quote, { rows: 5, className: 'text-center italic text-xs sm:text-sm' }))}
          </div>
          <div className="md:col-span-8">
            {card('Photo Essay & Dispatch', textArea('articleBody', articleText, { rows: 8, className: 'text-xs sm:text-sm' }))}
          </div>
        </div>
      </div>
    );
  };

  const storybookPage = () => {
    if (currentStructureIndex === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          <div className={`md:col-span-6 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
            {renderPhoto(0, 'h-72 sm:h-96', 'arch', 1)}
          </div>
          <div className={`md:col-span-6 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
            {card('Story Scroll', textArea('storyText', storyText, { rows: 13, className: 'text-sm sm:text-base text-center' }))}
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 1) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-52 sm:h-64', 'rect', 1)}
          {card('Ribbon-Crowned Story', textArea('storyText', storyText, { rows: 10, className: 'text-sm sm:text-base text-center' }))}
        </div>
      );
    }
    if (currentStructureIndex === 3) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-56 sm:h-72', 'rect', 1)}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-3">
              {card('A Story Moment', <div className="text-center text-3xl" style={{ color: palette.accent }}>✦</div>, { variant: 3 })}
            </div>
            <div className="md:col-span-9">
              {card('The Reading Scroll', textArea('storyText', storyText, { rows: 10, className: 'text-sm sm:text-base' }), { variant: 3 })}
            </div>
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 4) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => renderPhoto(index, 'h-36 sm:h-44', index === 1 ? 'oval' : 'arch', 3))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-8">
              {card('Adventure Vignettes', textArea('storyText', storyText, { rows: 9, className: 'text-sm sm:text-base' }), { variant: 4 })}
            </div>
            <div className="md:col-span-4">
              {card('Moral Medallion', textArea('moral', sd.moral || '', { rows: 5, className: 'text-center italic text-xs sm:text-sm', placeholder: 'Add the story takeaway here, or click “Write with AI”.' }), { variant: 4 })}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderPhoto(0, 'h-44 sm:h-56', 'arch', 2)}
          {renderPhoto(1, 'h-44 sm:h-56', 'oval', 2)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-4">
            {card('Illuminated Tale', <div className="text-center text-xl font-black" style={{ color: palette.accent }}>✦</div>)}
          </div>
          <div className="md:col-span-8">
            {card('The Adventure Continues', textArea('storyText', storyText, { rows: 8, className: 'text-sm sm:text-base' }))}
          </div>
        </div>
      </div>
    );
  };

  const guidePage = () => {
    if (currentStructureIndex === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className={`md:col-span-6 space-y-3 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
            {card('Key Takeaways', textArea('calloutBody', sd.calloutBody || '', { rows: 4, className: 'text-xs sm:text-sm font-bold' }))}
            {renderPhoto(0, 'h-44 sm:h-56', 'rect', 1)}
          </div>
          <div className={`md:col-span-6 space-y-3 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
            {card('Overview & Procedure', textArea('overview', guideText, { rows: 5, className: 'text-xs sm:text-sm' }))}
            {card('Reference Table', textArea('tableNotes', sd.tableNotes || copy.table, { rows: 6, className: 'text-xs font-mono' }))}
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 1) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-44 sm:h-56', 'rect', 1)}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className={`md:col-span-7 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
              {card('Step-by-Step Guide', textArea('overview', guideText, { rows: 9, className: 'text-xs sm:text-sm' }))}
            </div>
            <div className={`md:col-span-5 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
              {card('Workshop Tip', textArea('calloutBody', sd.calloutBody || copy.tip, { rows: 6, className: 'text-xs sm:text-sm' }))}
            </div>
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 3) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-44 sm:h-56', 'rect', 2)}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            <div className="md:col-span-8">
              {card('Three-Stage Roadmap', textArea('roadmapSteps', sd.roadmapSteps || '', { rows: 9, className: 'text-xs sm:text-sm' }), { variant: 3 })}
            </div>
            <div className="md:col-span-4 space-y-3">
              {renderPhoto(1, 'h-28 sm:h-36', 'square', 2)}
              {card('Workshop Callout', textArea('calloutBody', sd.calloutBody || copy.tip, { rows: 5, className: 'text-xs' }), { variant: 3 })}
            </div>
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 4) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderPhoto(0, 'h-40 sm:h-52', 'square', 2)}
            {renderPhoto(1, 'h-40 sm:h-52', 'arch', 2)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {card('Option A · Field Notes', textArea('comparisonLeft', sd.comparisonLeft || '', { rows: 6, className: 'text-xs sm:text-sm' }), { variant: 4 })}
            {card('Option B · Field Notes', textArea('comparisonRight', sd.comparisonRight || '', { rows: 6, className: 'text-xs sm:text-sm' }), { variant: 4 })}
          </div>
          {card('Decision Checklist & Reference Matrix', textArea('tableNotes', sd.tableNotes || copy.table, { rows: 5, className: 'text-xs font-mono' }), { variant: 4 })}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderPhoto(0, 'h-40 sm:h-52', 'square', 2)}
          {renderPhoto(1, 'h-40 sm:h-52', 'arch', 2)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-5">
            {card('Master Checklist', textArea('calloutBody', sd.calloutBody || copy.tip, { rows: 5, className: 'text-xs sm:text-sm' }))}
          </div>
          <div className="md:col-span-7">
            {card('Comparison Matrix', textArea('tableNotes', sd.tableNotes || copy.table, { rows: 6, className: 'text-xs font-mono' }))}
          </div>
        </div>
      </div>
    );
  };

  const bookPage = () => {
    if (currentStructureIndex === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className={`md:col-span-5 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
            {renderPhoto(0, 'h-64 sm:h-80', 'arch', 1)}
          </div>
          <div className={`md:col-span-7 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
            {card('Chapter Manuscript', textArea('chapterText', proseText, { rows: 12, className: 'text-sm sm:text-base' }))}
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 1) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-40 sm:h-52', 'rect', 1)}
          {card('Chapter Epigraph', textArea('epigraph', sd.epigraph || '', { rows: 2, className: 'text-center italic text-sm sm:text-base' }))}
          {card('The Chapter', textArea('chapterText', proseText, { rows: 9, className: 'text-sm sm:text-base' }))}
        </div>
      );
    }
    if (currentStructureIndex === 3) {
      return (
        <div className="space-y-4">
          {renderPhoto(0, 'h-48 sm:h-60', 'rect', 1)}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className={`md:col-span-9 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
              {card('Manuscript Reading Column', textArea('chapterText', proseText, { rows: 13, className: 'text-sm sm:text-base' }), { variant: 3 })}
            </div>
            <div className={`md:col-span-3 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
              {card('Margin Note', textArea('marginNote', sd.marginNote || '', { rows: 6, className: 'text-xs italic' }), { variant: 3 })}
            </div>
          </div>
        </div>
      );
    }
    if (currentStructureIndex === 4) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => renderPhoto(index, 'h-32 sm:h-40', index === 1 ? 'square' : 'oval', 3))}
          </div>
          {card('Epigraph', textArea('epigraph', sd.epigraph || '', { rows: 2, className: 'text-center italic text-sm sm:text-base' }), { variant: 4, className: 'max-w-3xl mx-auto' })}
          {card('Literary Prose', textArea('chapterText', proseText, { rows: 10, className: 'text-sm sm:text-base' }), { variant: 4 })}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className={`md:col-span-4 space-y-3 ${isFlipped ? 'md:order-2' : 'md:order-1'}`}>
          {renderPhoto(0, 'h-48 sm:h-64', 'oval', 2)}
          {card('Wax-Seal Quote', textArea('pullQuote', sd.pullQuote || '', { rows: 4, className: 'text-center italic text-xs sm:text-sm' }))}
        </div>
        <div className={`md:col-span-8 ${isFlipped ? 'md:order-1' : 'md:order-2'}`}>
          {renderPhoto(1, 'h-32 sm:h-40', 'square', 2)}
          <div className="mt-3">
            {card('Literary Prose', textArea('chapterText', proseText, { rows: 9, className: 'text-sm sm:text-base' }))}
          </div>
        </div>
      </div>
    );
  };

  const renderStructureContent = () => {
    switch (categoryId) {
      case 'photobook':
        return photoPage();
      case 'cookbook':
        return cookbookPage();
      case 'magazine':
        return magazinePage();
      case 'storybook':
        return storybookPage();
      case 'informational':
        return guidePage();
      case 'book':
        return bookPage();
      default:
        return photoPage();
    }
  };

  const additionalPageContent = () => {
    const sections = [];
    const addTextField = (heading, field, options = {}) => {
      sections.push(card(heading, textArea(field, sd[field] || '', {
        rows: options.rows || 4,
        className: options.className || 'text-xs sm:text-sm',
        placeholder: options.placeholder
      }), { variant: options.variant ?? currentStructureIndex }));
    };

    if (categoryId === 'photobook' && ![0, 1].includes(currentStructureIndex)) {
      addTextField('Curatorial Note', 'curatorialNote', { rows: 3 });
    }

    if (categoryId === 'cookbook' && ![0, 1, 3].includes(currentStructureIndex)) {
      addTextField('Chef’s Note', 'chefNotes', { rows: 3 });
    }

    if (categoryId === 'magazine') {
      if (![1, 3].includes(currentStructureIndex)) {
        addTextField('Sidebar & Highlights', 'sidebarContent', { rows: 4 });
      }
      sections.push(card('Feature Kicker & Byline', (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wide opacity-70">Kicker</div>
            {textArea('kicker', sd.kicker || '', { rows: 1, maxWords: 8, placeholder: 'Short section label' })}
          </div>
          <div className="block text-[9px] font-bold uppercase tracking-wide opacity-70">
            <label htmlFor="magazine-byline">Byline</label>
            <div className="mt-1 flex items-center gap-1">
              <input
                id="magazine-byline"
                type="text"
                value={sd.byline || ''}
                onChange={(event) => saveBlock('byline', event.target.value)}
                onBlur={handleDraftBlur}
                placeholder="Author credit, if supplied"
                className="min-w-0 flex-1 rounded-md border px-2 py-2 text-xs font-normal normal-case"
                style={{ color: palette.pageText, borderColor: `${palette.border}66`, backgroundColor: `${palette.pageBg}CC` }}
              />
              <AiFieldButton
                enabled={aiConfigured && editable}
                compact
                context={makeAiContext('byline', {
                  fieldLabel: 'Magazine byline',
                  fieldContext: project.authorName || project.penName || '',
                  maxWords: 8
                })}
                currentValue={sd.byline || ''}
                onInsert={(text, mode) => {
                  const generated = richHtmlToPlainText(text).replace(/\s+/g, ' ').trim();
                  saveBlock('byline', mode === 'append' ? `${sd.byline || ''} ${generated}`.trim() : generated);
                }}
              />
            </div>
          </div>
        </div>
      )));
    }

    if (categoryId === 'storybook') {
      if (currentStructureIndex !== 4) addTextField('Story Takeaway', 'moral', { rows: 3 });
      addTextField('Illustration / Scene Note', 'illustrationPrompt', { rows: 3 });
    }

    if (categoryId === 'informational') {
      if (![0, 1].includes(currentStructureIndex)) addTextField('Guide Overview', 'overview', { rows: 5 });
      if (currentStructureIndex === 4) addTextField('Action Tip / Callout', 'calloutBody', { rows: 4 });
      if (![0, 2, 4].includes(currentStructureIndex)) addTextField('Reference Notes', 'tableNotes', { rows: 5 });
      if (currentStructureIndex !== 3) addTextField('Roadmap / Checklist Steps', 'roadmapSteps', { rows: 5 });
      if (currentStructureIndex !== 4) {
        addTextField('Comparison Option A', 'comparisonLeft', { rows: 4 });
        addTextField('Comparison Option B', 'comparisonRight', { rows: 4 });
      }
      addTextField('Callout Heading', 'calloutTitle', { rows: 1, maxWords: 12 });
    }

    if (categoryId === 'book') {
      if (![1, 4].includes(currentStructureIndex)) addTextField('Epigraph', 'epigraph', { rows: 2 });
      if (currentStructureIndex !== 3) addTextField('Margin Note', 'marginNote', { rows: 3 });
      if (currentStructureIndex !== 2) addTextField('Pull Quote', 'pullQuote', { rows: 2 });
    }

    if (photoSlots.length > detailSlotCount) {
      sections.push(card('Saved Photo Boxes Outside This Layout', (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {photoSlots.slice(detailSlotCount).map((_, offset) => {
            const index = detailSlotCount + offset;
            return renderPhoto(index, 'h-28 sm:h-36', index % 2 ? 'square' : 'rect', photoSlots.length);
          })}
        </div>
      )));
    }

    return sections.length > 0
      ? <div className="mt-4 space-y-3">{sections.map((section, index) => React.cloneElement(section, { key: `additional-page-field-${index}` }))}</div>
      : null;
  };

  const structureFrame =
    currentStructureIndex === 0
      ? {
          border: `5px double ${palette.border}`,
          boxShadow: `inset 0 0 0 4px ${palette.pageBg}, inset 0 0 0 6px ${palette.border}55`
        }
      : currentStructureIndex === 1
      ? {
          border: `3px solid ${palette.accent}`,
          boxShadow: `inset 0 0 0 5px ${palette.border}44`
        }
      : currentStructureIndex === 2
      ? {
          borderTop: `5px double ${palette.border}`,
          borderBottom: `5px double ${palette.border}`,
          borderLeft: `4px solid ${palette.accent}`,
          borderRight: `4px solid ${palette.accent}`,
          boxShadow: `inset 0 0 0 3px ${palette.border}22`
        }
      : currentStructureIndex === 3
      ? {
          borderTop: `8px solid ${palette.accent}`,
          borderBottom: `2px solid ${palette.border}`,
          borderLeft: `2px solid ${palette.border}`,
          borderRight: `2px solid ${palette.border}`,
          boxShadow: `inset 0 0 0 5px ${palette.accent}12`
        }
      : {
          border: `3px dotted ${palette.border}`,
          boxShadow: `inset 0 0 0 5px ${palette.pageBg}, inset 0 0 0 7px ${palette.accent}28`
        };

  return (
    <StudioTabletShell>
      <article
        className="relative min-h-[560px] p-5 sm:p-8 md:p-10 overflow-hidden"
        style={{
          backgroundColor: palette.pageBg,
          color: palette.pageText,
          fontFamily: palette.font,
          ...structureFrame
        }}
      >
        {/* The matching template's page border, corner ornament and distinct structure details */}
        {currentStructureIndex === 0 && (
          <>
            <span className="pointer-events-none absolute top-2 left-3 text-sm font-black" style={{ color: palette.border }}>❧</span>
            <span className="pointer-events-none absolute top-2 right-3 text-sm font-black" style={{ color: palette.border }}>❧</span>
            <span className="pointer-events-none absolute bottom-2 left-3 text-sm font-black" style={{ color: palette.border }}>❧</span>
            <span className="pointer-events-none absolute bottom-2 right-3 text-sm font-black" style={{ color: palette.border }}>❧</span>
          </>
        )}
        {currentStructureIndex === 1 && (
          <div className="pointer-events-none absolute top-0 inset-x-0 h-2" style={{ backgroundColor: palette.accent }} />
        )}
        {currentStructureIndex === 2 && (
          <>
            <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: palette.accent, border: `2px solid ${palette.border}` }}>✦</div>
            <span className="pointer-events-none absolute top-3 left-3 text-[9px] font-black" style={{ color: palette.border }}>◆</span>
            <span className="pointer-events-none absolute top-3 right-3 text-[9px] font-black" style={{ color: palette.border }}>◆</span>
          </>
        )}
        {currentStructureIndex === 3 && (
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-20 h-2 rounded-b-full" style={{ backgroundColor: palette.accent }} />
        )}
        {currentStructureIndex === 4 && (
          <>
            <span className="pointer-events-none absolute top-3 left-3 text-xs font-black" style={{ color: palette.accent }}>✧</span>
            <span className="pointer-events-none absolute bottom-3 right-3 text-xs font-black" style={{ color: palette.accent }}>✧</span>
          </>
        )}

        {backButton}
        {header}
        <div className="relative z-10">
          {renderStructureContent()}
          {additionalPageContent()}
        </div>

        <div
          className="mt-5 pt-2 text-center text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em]"
          style={{ color: palette.accent, borderTop: `1px solid ${palette.border}66` }}
        >
          Layout {currentStructureIndex + 1} · Chapter {chapterIndex + 1} · Page {pageIndex + 1} of {totalPages}
        </div>
      </article>
    </StudioTabletShell>
  );
}
