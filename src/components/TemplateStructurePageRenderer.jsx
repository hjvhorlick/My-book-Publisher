import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getTemplatePageStructures } from '../data/templatePageStructures';
import { getAiFieldProfile } from '../data/aiPromptCatalog';
import { getImageSlotRule } from '../data/slotRules';
import {
  resolveTemplateDesign,
  headingTreatment,
  getOrnament,
  withAlpha,
  toRoman,
  readableInk
} from '../data/designSystem';
import { PageFrame, PageTitleFrame, BlockFrame, PageNumberLine } from './DesignFrame';
import RichTextField from './RichTextField';
import {
  normalizeRichHtml,
  richHtmlToPlainText
} from '../utils/richText';

/**
 * Card headings are editing labels that name each designed section while
 * the author works. Only genuinely reader-facing headings may appear on a
 * published page, mapped here to their printed wording. Everything else
 * ("Ribbon-Crowned Story Card", "Chapter Manuscript", …) is design
 * vocabulary and is hidden in the clean preview and never exported.
 */
const PRINT_CARD_HEADINGS = {
  Ingredients: 'Ingredients',
  'Ingredients Scroll': 'Ingredients',
  'Kitchen Notebook · Ingredients': 'Ingredients',
  Method: 'Method',
  'Preparation & Chef’s Note': 'Method',
  'Method & Tasting Notes': 'Method',
  'Preparation Timeline': 'Preparation',
  'Chef’s Note': 'Chef’s Note',
  'Kitchen Tip': 'Kitchen Tip',
  'Dates & Highlights': 'Dates & Highlights',
  'Sidebar & Highlights': 'Highlights',
  'Key Takeaways': 'Key Takeaways',
  'Overview & Procedure': 'Overview',
  'Guide Overview': 'Overview',
  'Reference Table': 'Reference Table',
  'Reference Notes': 'Reference Notes',
  'Step-by-Step Guide': 'Step-by-Step Guide',
  'Workshop Tip': 'Workshop Tip',
  'Action Tip / Callout': 'Tip',
  'Three-Stage Roadmap': 'Roadmap',
  'Roadmap / Checklist Steps': 'Roadmap',
  'Master Checklist': 'Checklist',
  'Decision Checklist & Reference Matrix': 'Checklist & Reference',
  'Comparison Matrix': 'Comparison Matrix',
  'Option A · Field Notes': 'Option A',
  'Option B · Field Notes': 'Option B',
  'Comparison Option A': 'Option A',
  'Comparison Option B': 'Option B'
};

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
  onOpenAiSettings,
  onSaveChapter,
  onRegisterSave,
  onRegisterPreview,
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
  const previewPatchRef = useRef(null);
  const sd = draftData;
  // The design spec is the single source of decoration: template palette,
  // page border, block borders, heading treatment, ornament and page-number
  // style. `project.coverConfig.design` carries the author's own choices.
  const design = resolveTemplateDesign(
    visualTemplate,
    project?.coverConfig?.design || {},
    { fontFamily: fontFamily || project?.coverConfig?.fontFamily || visualTemplate.fontFamily }
  );
  const palette = {
    pageBg: design.pageBg,
    pageText: design.bodyText,
    border: design.borderInk,
    accent: design.accentInk,
    font: design.fontStack
  };
  const heading = headingTreatment(design);
  const designOrnament = getOrnament(design.ornamentId);
  const getDesignOrnament = () => designOrnament;
  const detailSlotCount = Math.max(structure.photoSlots || 1, 1);
  const copy = DEFAULT_COPY[categoryId] || DEFAULT_COPY.photobook;
  const textColor = palette.pageText;
  const kickerNumber = design.pageNumbers === 'roman' ? toRoman(chapterIndex + 1) : String(chapterIndex + 1);
  const KICKER_BY_CATEGORY = {
    photobook: 'PLATE',
    cookbook: 'RECIPE',
    magazine: 'FEATURE',
    storybook: 'STORY',
    informational: 'PART',
    book: 'CHAPTER',
    workbook: 'WORKSHEET'
  };
  const pageKicker = (() => {
    const custom = sd.kicker;
    if (custom && String(custom).trim()) return String(custom).trim();
    return `${KICKER_BY_CATEGORY[categoryId] || 'CHAPTER'} ${kickerNumber}`;
  })();

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

  // The Preview button beside Save Page reads the page through this getter.
  // It returns the same patch a save would send — but nothing is written —
  // so the preview shows the current unsaved words exactly as designed.
  previewPatchRef.current = () => buildSavePatch(draftTitle, draftSubtitle, draftData);

  useEffect(() => {
    if (!onRegisterPreview) return undefined;
    onRegisterPreview(() => previewPatchRef.current?.() || null);
    return () => onRegisterPreview(null);
  }, [onRegisterPreview]);

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
    const placeholder = options.placeholder || `Tap Edit to write the ${fieldLabel.toLowerCase()}…`;
    // The first paragraph of the page's main reading block may open with an
    // illuminated capital — a signature of the classic sample templates.
    const MAIN_BODY_FIELDS = new Set(['chapterText', 'storyText', 'articleBody', 'overview']);
    const useDropCap = (options.dropCap ?? MAIN_BODY_FIELDS.has(field)) && design.dropCap && !options.noDropCap;
    return (
      <RichTextField
        rows={options.rows || 4}
        readOnly={!editable}
        value={value ?? ''}
        onChange={(html) => updateText(field, html)}
        onBlur={handleDraftBlur}
        placeholder={placeholder}
        className={`focus:outline-none break-words ${useDropCap ? 'fq-dropcap' : ''}${useDropCap && design.dropCapStyle === 'boxed' ? ' fq-dropcap--boxed' : ''} ${options.className || ''}`}
        style={{
          ...fieldStyle,
          lineHeight: options.lineHeight || '1.55',
          ...(useDropCap
            ? {
              '--fq-dropcap-color': design.accentInk,
              '--fq-dropcap-bg': design.accentInk,
              '--fq-dropcap-ink': readableInk('#FFFFFF', design.accentInk, { fallback: '#FFFFFF', min: 3 })
            }
            : null),
          ...options.style
        }}
        ariaLabel={options.ariaLabel || fieldLabel}
        aiConfigured={aiConfigured}
        aiContext={makeAiContext(field, { ...options, fieldLabel, maxWords })}
        onOpenAiSettings={onOpenAiSettings}
      />
    );
  };

  const textInputField = (field, label, value, options = {}) => {
    const profile = getAiFieldProfile(categoryId, field);
    const fieldLabel = options.fieldLabel || label || profile.label;
    const currentValue = String(value ?? '');
    const maxWords = options.maxWords || profile.maxWords;
    if (!editable) {
      return currentValue.trim()
        ? (
          <div className="min-w-0 text-xs">
            <span className="font-bold">{label}:</span> {currentValue}
          </div>
        )
        : null;
    }
    return (
      <div className="min-w-0 pt-1">
        <div className="text-[9px] font-bold uppercase tracking-wide opacity-80">{label}</div>
        <RichTextField
          rows={1}
          plainText
          readOnly={!editable}
          value={currentValue}
          onChange={(text) => saveBlock(field, text)}
          onBlur={handleDraftBlur}
          placeholder={options.placeholder || `Tap Edit to add ${label.toLowerCase()}…`}
          ariaLabel={fieldLabel}
          className="text-xs"
          style={{ color: palette.pageText, fontFamily: palette.font }}
          aiConfigured={aiConfigured}
          aiContext={makeAiContext(field, {
            fieldLabel,
            fieldContext: options.fieldContext,
            maxWords
          })}
          onOpenAiSettings={onOpenAiSettings}
        />
      </div>
    );
  };

  const titleInput = (
    <div className="space-y-1.5">
      <RichTextField
        rows={1}
        plainText
        readOnly={!editable}
        ariaLabel={pageIndex === 0 ? 'Chapter title' : 'Page heading'}
        value={draftTitle}
        onChange={updateTitle}
        onBlur={handleDraftBlur}
        placeholder={pageIndex === 0 ? `Tap Edit to name Chapter ${chapterIndex + 1}…` : `Tap Edit to add a heading for page ${pageIndex + 1}…`}
        className="w-full break-words font-bold"
        style={{
          ...fieldStyle,
          color: heading.titleStyle.color,
          fontFamily: heading.titleStyle.fontFamily,
          textTransform: heading.titleTransform === 'uppercase' ? 'uppercase' : 'none',
          letterSpacing: heading.titleStyle.letterSpacing
        }}
        aiConfigured={aiConfigured}
        aiContext={makeAiContext('chapterTitle', {
          fieldLabel: pageIndex === 0 ? 'Chapter title' : 'Page heading',
          maxWords: Math.min(getAiFieldProfile(categoryId, 'chapterTitle').maxWords, 10)
        })}
        onOpenAiSettings={onOpenAiSettings}
      />
      {(editable || richHtmlToPlainText(draftSubtitle).trim()) && (
        <div className={editable ? 'mt-2 border-t pt-2' : 'mt-1'} style={editable ? { borderColor: withAlpha(palette.border, 0.35) } : undefined}>
          {editable && (
            <div className={`mb-1 text-[9px] font-extrabold uppercase tracking-wider opacity-75 ${heading.align === 'center' ? 'text-center' : 'text-left'}`}>Subtitle / page deck · optional</div>
          )}
          <RichTextField
            rows={2}
            value={draftSubtitle}
            readOnly={!editable}
            onChange={updateSubtitle}
            onBlur={handleDraftBlur}
            placeholder="Tap Edit to add a short subtitle…"
            className={`text-xs italic ${heading.align === 'center' ? 'text-center' : 'text-left'}`}
            style={{ ...fieldStyle, color: palette.pageText, lineHeight: '1.45' }}
            ariaLabel="Page subtitle editor"
            aiConfigured={aiConfigured}
            aiContext={makeAiContext('pageSubtitle', {
              fieldLabel: 'Page subtitle or deck',
              maxWords: Math.min(getAiFieldProfile(categoryId, 'pageSubtitle').maxWords, 30)
            })}
            onOpenAiSettings={onOpenAiSettings}
          />
        </div>
      )}
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
      placeholder="Tap Edit to add ingredients — one per line…"
      className="text-xs sm:text-sm"
      style={{ ...fieldStyle, lineHeight: '1.65' }}
      ariaLabel="Recipe ingredients editor"
      aiConfigured={aiConfigured}
      aiContext={makeAiContext('ingredients', { maxWords: Math.max(20, Math.min(100, rows * 12)) })}
      onOpenAiSettings={onOpenAiSettings}
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
      placeholder="Tap Edit to add the preparation steps…"
      className="text-xs sm:text-sm"
      style={{ ...fieldStyle, lineHeight: '1.65', ...extraStyle }}
      ariaLabel="Recipe method editor"
      aiConfigured={aiConfigured}
      aiContext={makeAiContext('steps', { maxWords: Math.max(20, Math.min(180, rows * 12)) })}
      onOpenAiSettings={onOpenAiSettings}
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

  // Photo frames follow the page design: the frame rule uses the chosen
  // border ink and the matte uses the page tint, so a placed photo lands in a
  // frame that matches the sample instead of an unrelated generic box.
  const frameShapeRadius = (shape = 'rect') =>
    shape === 'arch'
      ? '999px 999px 12px 12px'
      : shape === 'oval'
      ? '48% 48% 10px 10px'
      : shape === 'square'
      ? '3px'
      : design.pageBorderId === 'soft-rounded' || design.pageBorderId === 'arch-window'
      ? '12px'
      : '6px';

  const imageFrameStyle = (shape = 'rect') => {
    const ornate = ['filigree', 'corner-flourish', 'crest-corners', 'arch-window'].includes(design.pageBorderId);
    return {
      border: ornate
        ? `4px double ${palette.border}`
        : `2px solid ${withAlpha(palette.border, 0.85)}`,
      borderRadius: frameShapeRadius(shape),
      backgroundColor: palette.pageBg,
      boxShadow: `0 0 0 2px ${withAlpha(palette.pageBg, 0.92)}, 0 0 0 3px ${withAlpha(palette.border, 0.35)}, 0 10px 22px rgba(15, 23, 42, 0.18)`
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
          border: `1px solid ${withAlpha(palette.border, 0.5)}`,
          padding: currentStructureIndex === 0 ? '6px' : '4px',
          boxShadow: '0 6px 16px rgba(15, 23, 42, 0.16)',
          borderRadius: 8
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
              shape,
              slotRule: getImageSlotRule({ heightClass, shape }),
              onImageChange: (url) => saveCaption(index, 'imageUrl', url)
            },
            heightClass,
            shape,
            frameStyle: imageFrameStyle(shape)
          })}
        {label && (editable || richHtmlToPlainText(slot.title || '').trim() || String(slot.location || '').trim()) && (
          <div className="mt-1.5 space-y-1">
            <RichTextField
              rows={1}
              value={slot.title || ''}
              readOnly={!editable}
              onChange={(html) => saveCaption(index, 'title', html)}
              onBlur={handleDraftBlur}
              placeholder={`Tap Edit to caption photo ${index + 1}…`}
              className="text-center text-[10px] font-bold sm:text-xs"
              style={{ color: palette.accent, fontFamily: palette.font, lineHeight: '1.35' }}
              ariaLabel={`Photo ${index + 1} caption editor`}
              aiConfigured={aiConfigured}
              aiContext={makeAiContext('photoCaption', {
                fieldLabel: `Photo ${index + 1} caption`,
                fieldContext: slot.location || slot.altText || slot.description || '',
                maxWords: Math.min(getAiFieldProfile(categoryId, 'photoCaption').maxWords, 18)
              })}
              onOpenAiSettings={onOpenAiSettings}
            />
            {(editable || String(slot.location || '').trim()) && (
              <RichTextField
                rows={1}
                plainText
                value={slot.location || ''}
                readOnly={!editable}
                onChange={(text) => saveCaption(index, 'location', text)}
                onBlur={handleDraftBlur}
                placeholder="Tap Edit for a place or short note…"
                className="text-center text-[10px] italic opacity-80"
                style={{ color: palette.pageText, fontFamily: palette.font }}
                ariaLabel={`Photo ${index + 1} place or note`}
                aiConfigured={aiConfigured}
                aiContext={makeAiContext('photoLocation', {
                  fieldLabel: `Photo ${index + 1} place or note`,
                  fieldContext: [slot.title, slot.altText, slot.description].filter(Boolean).join(' · '),
                  maxWords: 14
                })}
                onOpenAiSettings={onOpenAiSettings}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // Text blocks all use the design's block treatment (border, tint, rule) so
  // the bordered boxes the author chose match the template sample. The layout
  // structure still changes where the blocks sit on the page.
  const card = (heading, content, options = {}) => {
    const visibleHeading = editable ? heading : (heading ? PRINT_CARD_HEADINGS[heading] || '' : '');
    const ornament = getDesignOrnament(design);
    return (
      <BlockFrame
        design={design}
        radius={options.variant === 2 || options.variant === 4 ? 14 : options.variant === 3 ? 8 : 10}
        className={`p-3.5 sm:p-4 ${options.className || ''}`}
        style={options.style}
      >
        {visibleHeading && (
          <div
            className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest sm:text-xs"
            style={{ color: palette.accent }}
          >
            {ornament.glyph ? <span aria-hidden="true">{ornament.glyph}</span> : null}
            <span>{visibleHeading}</span>
          </div>
        )}
        {content}
      </BlockFrame>
    );
  };

  const runningHead = editable
    ? (currentStructureIndex === 0
      ? 'CLASSICAL PAGE DESIGN'
      : currentStructureIndex === 1
      ? 'FEATURE LAYOUT'
      : currentStructureIndex === 2
      ? 'ILLUSTRATED EDITION'
      : currentStructureIndex === 3
      ? 'PANORAMA SPREAD'
      : 'COLLECTOR’S FOLIO')
    : project.title;

  const header = (
    <div className="relative mb-4 px-1 sm:px-2">
      <div
        className="mb-2 flex items-center justify-between gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] sm:text-[10px]"
        style={{ color: withAlpha(palette.pageText, 0.7) }}
      >
        <span className="truncate">{runningHead}</span>
        <span className="shrink-0">{editable ? `PAGE ${pageIndex + 1}` : ''}</span>
      </div>
      <PageTitleFrame
        design={design}
        kickerText={pageKicker}
        pageLabel={editable ? design.templateName : project.title}
        title={titleInput}
        headingStyleId={design.headingStyleId}
      />
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
            {sd.course || (editable ? 'RECIPE DETAILS' : 'RECIPE')}
          </span>
          {sd.servings && <span className="text-[10px] font-bold">Serves {sd.servings}</span>}
          {sd.prepTime && <span className="text-[10px] font-bold">Prep {sd.prepTime}</span>}
          {sd.cookTime && <span className="text-[10px] font-bold">Cook {sd.cookTime}</span>}
          {sd.difficulty && <span className="text-[10px] font-bold">{sd.difficulty}</span>}
        </div>
        {editable && <div className="grid grid-cols-2 gap-2 rounded-xl border p-2 sm:grid-cols-5" style={{ borderColor: `${palette.border}55`, backgroundColor: `${palette.accent}08` }}>
          {textInputField('course', 'Course', sd.course, { placeholder: 'Main, dessert…', maxWords: 4, fieldContext: recipeDetailsContext })}
          {textInputField('servings', 'Serves', sd.servings, { placeholder: '4 people', maxWords: 6, fieldContext: recipeDetailsContext })}
          {textInputField('prepTime', 'Prep time', sd.prepTime, { placeholder: 'Approx. time', maxWords: 6, fieldContext: recipeDetailsContext })}
          {textInputField('cookTime', 'Cook time', sd.cookTime, { placeholder: 'Approx. time', maxWords: 6, fieldContext: recipeDetailsContext })}
          {textInputField('difficulty', 'Difficulty', sd.difficulty, { placeholder: 'Simple, moderate…', maxWords: 3, fieldContext: recipeDetailsContext })}
        </div>}
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
              {card('Moral Medallion', textArea('moral', sd.moral || '', { rows: 5, className: 'text-center italic text-xs sm:text-sm', placeholder: 'Tap Edit to add the story takeaway…' }), { variant: 4 })}
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
      // Published pages show only words the author actually wrote — never
      // empty extra boxes, and never production notes like illustration briefs.
      if (!editable) {
        if (field === 'illustrationPrompt') return;
        const raw = sd[field];
        const plain = Array.isArray(raw) ? raw.join(' ') : richHtmlToPlainText(raw || '');
        if (!String(plain).trim()) return;
      }
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
            {editable && <div className="mb-1 text-[9px] font-bold uppercase tracking-wide opacity-70">Kicker</div>}
            {textArea('kicker', sd.kicker || '', { rows: 1, maxWords: 8, placeholder: 'Tap Edit for a short section label…' })}
          </div>
          <div>
            {editable && <div className="mb-1 text-[9px] font-bold uppercase tracking-wide opacity-70">Byline</div>}
            <RichTextField
              rows={1}
              plainText
              value={sd.byline || ''}
              readOnly={!editable}
              onChange={(text) => saveBlock('byline', text)}
              onBlur={handleDraftBlur}
              placeholder="Tap Edit for the author credit…"
              className="text-xs italic"
              style={{ color: palette.pageText, fontFamily: palette.font }}
              ariaLabel="Magazine byline"
              aiConfigured={aiConfigured}
              aiContext={makeAiContext('byline', {
                fieldLabel: 'Magazine byline',
                fieldContext: project.authorName || project.penName || '',
                maxWords: 8
              })}
              onOpenAiSettings={onOpenAiSettings}
            />
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

    if (editable && photoSlots.length > detailSlotCount) {
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

  const pageArticle = (
    <PageFrame
      design={design}
      as="article"
      className="min-h-[560px]"
      contentStyle={{ padding: 'clamp(1.5rem, 3.2vw, 2.8rem)' }}
      aria-label={`${project.title} — ${design.templateName} page`}
    >
      {backButton}
      {header}
      <div className="relative z-10">
        {renderStructureContent()}
        {additionalPageContent()}
      </div>

      {editable ? (
        <div
          className="mt-5 pt-2 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] sm:text-xs"
          style={{ color: palette.accent, borderTop: `1px solid ${withAlpha(palette.border, 0.4)}` }}
        >
          {`Layout ${currentStructureIndex + 1} · Chapter ${chapterIndex + 1} · Page ${pageIndex + 1} of ${totalPages}`}
        </div>
      ) : (
        <PageNumberLine
          design={design}
          pageIndex={pageIndex}
          className="mt-6"
        />
      )}
    </PageFrame>
  );

  return editable
    ? <StudioTabletShell>{pageArticle}</StudioTabletShell>
    : <div className="overflow-hidden rounded-[4px] shadow-[0_18px_45px_rgba(0,0,0,0.35)]">{pageArticle}</div>;
}
