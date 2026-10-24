import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Sparkles,
  ListOrdered,
  Tablet,
  Eye
} from 'lucide-react';
import {
  BOOK_CATEGORIES,
  TEMPLATES_BY_CATEGORY
} from '../data/visualTemplatesCatalog';
import {
  PAGE_COUNT_OPTIONS,
  getTemplatePageStructures,
  buildPlannedPagesList
} from '../data/templatePageStructures';
import TemplateVisualPreview from '../components/TemplateVisualPreview';
import ExactTemplatePageRenderer from '../components/ExactTemplatePageRenderer';
import PagePreviewModal from '../components/PagePreviewModal';
import {
  buildSamplePageForTemplate,
  buildSampleProjectForTemplate
} from '../data/templateSampleContent';
import { DESIGN_PRESETS } from '../data/designSystem';

const CLASSICAL_SERIF =
  '"Playfair Display", "Cinzel", "Cormorant Garamond", "Newsreader", "Lora", Georgia, "Times New Roman", serif';

const BLOCK_STYLE = {
  background:
    'linear-gradient(155deg, #0D234C 0%, #081838 58%, #050F26 100%)',
  border: '2px solid rgba(229, 184, 75, 0.68)',
  boxShadow:
    '0 24px 60px rgba(0, 0, 0, 0.85), 0 8px 26px rgba(229, 184, 75, 0.16), inset 0 1px 0 rgba(253, 224, 141, 0.3)'
};

const GOLD_BTN_STYLE = {
  background:
    'linear-gradient(180deg, #FCE38A 0%, #E5B84B 52%, #C49122 100%)',
  color: '#061128',
  border: '2px solid #FFF3B8',
  boxShadow:
    '0 12px 28px rgba(0, 0, 0, 0.75), 0 3px 14px rgba(245, 196, 81, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
  fontFamily: CLASSICAL_SERIF
};

const NAVY_BTN_STYLE = {
  backgroundColor: 'rgba(6, 17, 40, 0.85)',
  color: '#FDE08D',
  border: '1.5px solid rgba(229, 184, 75, 0.58)',
  boxShadow: '0 8px 22px rgba(0, 0, 0, 0.65)',
  fontFamily: CLASSICAL_SERIF
};

export default function WizardView({
  preselectedCategory,
  user,
  wizardStep: controlledWizardStep,
  onWizardStepChange,
  editingProject,
  onUpdateProject,
  onCreateProject
}) {
  const projectCategoryId = editingProject?.publicationType || editingProject?.bookType;
  const initialCatId =
    BOOK_CATEGORIES.find((c) => c.id === (projectCategoryId || preselectedCategory))?.id || 'photobook';

  // Step 2 = template choice; Step 3 = chapter Index and chapter count.
  const [localWizardStep, setLocalWizardStep] = useState(2);
  const wizardStep = controlledWizardStep ?? localWizardStep;
  const setWizardStep = onWizardStepChange || setLocalWizardStep;
  const [categoryId, setCategoryId] = useState(initialCatId);

  const activeCategory =
    BOOK_CATEGORIES.find((c) => c.id === categoryId) || BOOK_CATEGORIES[0];
  const categoryTemplates =
    TEMPLATES_BY_CATEGORY[categoryId] || TEMPLATES_BY_CATEGORY.photobook;

  const initialProjectTemplateId = editingProject?.coverConfig?.visualTemplateId;
  const [selectedVisualTemplateId, setSelectedVisualTemplateId] = useState(
    categoryTemplates.find((template) => template.id === initialProjectTemplateId)?.id || categoryTemplates[0]?.id
  );
  const selectedVisualTemplate =
    categoryTemplates.find((t) => t.id === selectedVisualTemplateId) ||
    categoryTemplates[0];

  const templateStructures = getTemplatePageStructures(
    categoryId,
    selectedVisualTemplate
  );

  const [selectedFont, setSelectedFont] = useState(
    editingProject?.coverConfig?.fontFamily || selectedVisualTemplate?.fontFamily || 'Plus Jakarta Sans'
  );
  const [bookTitle, setBookTitle] = useState(editingProject?.title || '');
  const [authorName, setAuthorName] = useState(
    editingProject?.authorName || user?.penName || user?.name || 'Studio Creator'
  );

  // Start with five chapter headings; the Index can plan 5, 10, 20, or 30 chapters.
  const [indexPages, setIndexPages] = useState(() =>
    buildPlannedPagesList({
      count: 5,
      existingPages: [],
      template: selectedVisualTemplate,
      categoryId: initialCatId
    })
  );
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');
  // The style chooser can open a real page drawn by the page renderer, so the
  // author can compare the sample photograph with what the studio produces.
  const [livePreviewTemplate, setLivePreviewTemplate] = useState(null);
  // Which creative direction the live preview is exploring (nothing is saved).
  const [previewPresetId, setPreviewPresetId] = useState('');

  // Keep the style chooser locked to the selected book category and saved project template.
  useEffect(() => {
    const nextCategoryId = editingProject?.publicationType || editingProject?.bookType || preselectedCategory;
    if (!nextCategoryId || !BOOK_CATEGORIES.some((category) => category.id === nextCategoryId)) return;

    setCategoryId(nextCategoryId);
    const templates = TEMPLATES_BY_CATEGORY[nextCategoryId] || [];
    const savedTemplateId = editingProject?.coverConfig?.visualTemplateId;
    const template = templates.find((item) => item.id === savedTemplateId) || templates[0];
    if (!template) return;

    setSelectedVisualTemplateId(template.id);
    setSelectedFont(editingProject?.coverConfig?.fontFamily || template.fontFamily || 'Plus Jakarta Sans');
    if (!editingProject) {
      setIndexPages((previous) =>
        buildPlannedPagesList({
          count: previous.length || 5,
          existingPages: previous,
          template,
          categoryId: nextCategoryId
        })
      );
    }
  }, [preselectedCategory, editingProject?.id, editingProject?.coverConfig?.visualTemplateId]);

  const handleChooseVisualTemplate = async (template) => {
    setSelectedVisualTemplateId(template.id);
    if (template.fontFamily) setSelectedFont(template.fontFamily);

    if (editingProject) {
      setSubmitting(true);
      try {
        // Switching template drops the previous template's colour overrides
        // (its border, block and ink colours) so the new template looks the
        // way it does in its sample picture. Structural choices such as the
        // page border or block treatment are kept.
        const nextDesign = { ...(editingProject.coverConfig?.design || {}) };
        delete nextDesign.borderColor;
        delete nextDesign.blockColor;
        delete nextDesign.accentColor;
        await onUpdateProject?.({
          coverConfig: {
            ...(editingProject.coverConfig || {}),
            visualTemplateId: template.id,
            fontFamily: template.fontFamily || selectedFont,
            borderStyle: template.borderStyle,
            headingStyle: template.headingStyle,
            pageBg: template.pageBg,
            pageText: template.pageText,
            borderColor: template.borderColor,
            accentColor: template.accentColor,
            design: nextDesign
          }
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setIndexPages((previous) =>
      buildPlannedPagesList({
        count: previous.length || 5,
        existingPages: previous,
        template,
        categoryId
      })
    );
    setWizardStep(3);
  };

  // Set page count to 5, 10, 20, or 30 pages
  const handleSetQuickPageCount = (count) => {
    setIndexPages((previous) =>
      buildPlannedPagesList({
        count,
        existingPages: previous,
        template: selectedVisualTemplate,
        categoryId
      })
    );
  };

  const handleCreateBookNow = async (startChapterIndex = 0) => {
    const finalTitle = bookTitle.trim();
    if (!finalTitle) {
      setTitleError('Enter a book title before saving. Titled books appear in Saved Books so you can return and finish them.');
      // Take the author straight to the flashing title box.
      const titleInput = document.getElementById('new-book-title');
      titleInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleInput?.focus({ preventScroll: true });
      return;
    }

    setTitleError('');
    setSubmitting(true);
    try {
      const customChapters = indexPages.map((p, idx) => {
        const structIdx =
          typeof p.pageStructure === 'number' ? p.pageStructure % 5 : 0;
        const structMeta = templateStructures[structIdx] || templateStructures[0];
        const firstPageData = {
          isFlipped: false,
          pageStructure: structIdx,
          mosaicVariant: 0,
          structureName: structMeta.name,
          borderElement: structMeta.borderName,
          frameElement: structMeta.frameName,
          cardElement: structMeta.cardName
        };
        return {
          stageKey: `chapter-${idx + 1}`,
          title: `Chapter ${idx + 1}`,
          subtitle: '',
          sectionType: activeCategory.sectionType,
          layoutId: selectedVisualTemplate.layoutId,
          targetWords: 300,
          structuredData: {
            ...firstPageData,
            pages: [{
              id: 'page-1',
              title: '',
              subtitle: '',
              contentHtml: '',
              structuredData: firstPageData
            }]
          }
        };
      });

      await onCreateProject({
        title: finalTitle,
        subtitle: `${activeCategory.shortName} • ${selectedVisualTemplate.name}`,
        authorName: authorName.trim() || 'Author',
        bookType: activeCategory.id,
        publicationType: activeCategory.id,
        templateId: activeCategory.backendTemplateId,
        trimSize: activeCategory.trimSize || '8.5x11',
        fontFamily: selectedFont,
        customChapters,
        startChapterIndex: Math.max(
          0,
          Math.min(Number(startChapterIndex) || 0, customChapters.length - 1)
        ),
        coverConfig: {
          layout: 'editorial_frame',
          bgColor:
            selectedVisualTemplate.pageBg === '#FFFFFF'
              ? '#1E293B'
              : selectedVisualTemplate.pageBg,
          accentColor: selectedVisualTemplate.accentColor,
          textColor: '#F8FAFC',
          fontFamily: selectedFont,
          badgeText: activeCategory.shortName.toUpperCase(),
          visualTemplateId: selectedVisualTemplate.id,
          borderStyle: selectedVisualTemplate.borderStyle,
          headingStyle: selectedVisualTemplate.headingStyle,
          pageBg: selectedVisualTemplate.pageBg,
          pageText: selectedVisualTemplate.pageText,
          borderColor: selectedVisualTemplate.borderColor
        }
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      style={{ fontFamily: CLASSICAL_SERIF }}
    >
      {/* Locked Book Category Header Block — Dark Blue + Gold Writing + Deep Shadow */}
      <div
        className="rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4"
        style={BLOCK_STYLE}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"
            style={{
              backgroundColor: 'rgba(229, 184, 75, 0.18)',
              color: '#FDE08D',
              border: '1px solid rgba(245, 196, 81, 0.65)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
            }}
          >
            <CheckCircle2 className="w-4 h-4 text-[#F5C451]" />
            <span>Chosen Book Type: {activeCategory.name}</span>
          </span>
          <span
            className="text-xs sm:text-sm italic hidden sm:inline"
            style={{ color: '#F3D78B' }}
          >
            (Other book types are hidden so you only see {activeCategory.shortName} styles)
          </span>
        </div>


      </div>

      {/* STEP 2: VISUAL STYLES & LAYOUTS FOR THIS CATEGORY ONLY */}
      {wizardStep === 2 && (
        <div className="space-y-8">
          <div className="rounded-3xl p-6 sm:p-9 space-y-8" style={BLOCK_STYLE}>
            <div>
              <span
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3.5 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(229, 184, 75, 0.16)',
                  color: '#FDE08D',
                  border: '1px solid rgba(245, 196, 81, 0.6)'
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F5C451]" />
                <span>
                  8 Realistic Tablet Templates • 5 Page Layouts for Each
                </span>
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold mt-3 tracking-wide"
                style={{
                  color: '#FDE08D',
                  textShadow: '0 3px 12px rgba(0, 0, 0, 0.8)'
                }}
              >
                {editingProject ? 'Change This Book’s Template' : `Choose a Template for Your ${activeCategory.shortName}`}
              </h2>
              <p
                className="text-sm sm:text-base italic mt-1.5 leading-relaxed"
                style={{ color: '#F3D78B' }}
              >
                {editingProject ? 'Choose a new look to update this book. Your chapter and page text stays in place.' : 'Tap a tablet preview to select it and continue to the chapter Index. Every template has 5 matching page layouts; book fonts and page photos are available in Step 4.'}
              </p>
            </div>

            {/* Category-Specific Visual Templates: Single column on cellphones, max 2 side-by-side on 16:9 screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categoryTemplates.map((tpl) => {
                const isSelected = tpl.id === selectedVisualTemplate.id;
                return (
                  <div
                    key={tpl.id}
                    className="rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between"
                    style={
                      isSelected
                        ? {
                            background:
                              'linear-gradient(160deg, #132F63 0%, #0A1E44 65%, #06122B 100%)',
                            border: '2.5px solid #FDE08D',
                            boxShadow:
                              '0 26px 60px rgba(0, 0, 0, 0.9), 0 0 28px rgba(245, 196, 81, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
                          }
                        : {
                            background:
                              'linear-gradient(160deg, #0B1E42 0%, #07142E 65%, #050D20 100%)',
                            border: '1.5px solid rgba(229, 184, 75, 0.55)',
                            boxShadow:
                              '0 20px 48px rgba(0, 0, 0, 0.8), 0 6px 20px rgba(229, 184, 75, 0.12)'
                          }
                    }
                  >
                    <div>
                      <button
                        type="button"
                        aria-label={editingProject ? `Apply the ${tpl.name} template to this book` : `Choose ${tpl.name} and continue to the chapter Index`}
                        aria-pressed={isSelected}
                        onClick={() => handleChooseVisualTemplate(tpl)}
                        className="w-full touch-manipulation rounded-2xl p-1.5 text-left transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FDE08D] focus-visible:ring-offset-4 focus-visible:ring-offset-[#071430]"
                        style={{
                          backgroundColor: '#040B1A',
                          border: isSelected
                            ? '2px solid #FDE08D'
                            : '1px solid rgba(229, 184, 75, 0.5)',
                          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.78)'
                        }}
                      >
                        <span className="sr-only">Choose {tpl.name}</span>
                        <TemplateVisualPreview
                          categoryId={activeCategory.id}
                          template={tpl}
                          fontFamily={selectedFont}
                          height="h-56 sm:h-72 lg:h-80"
                          showPlaque={false}
                        />
                      </button>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <h3
                          className="text-lg sm:text-xl font-bold tracking-wide break-words"
                          style={{
                            color: '#FDE08D',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.75)'
                          }}
                        >
                          {tpl.name}
                        </h3>
                        {isSelected && (
                          <span
                            className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                            style={{
                              background:
                                'linear-gradient(180deg, #FCE38A 0%, #E5B84B 100%)',
                              color: '#061128',
                              border: '1px solid #FFF3B8'
                            }}
                          >
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs sm:text-sm italic mt-1 leading-relaxed break-words"
                        style={{ color: '#F3D78B' }}
                      >
                        {tpl.desc}
                      </p>
                      <button
                        type="button"
                        onClick={() => setLivePreviewTemplate(tpl)}
                        aria-label={`See a real page from the ${tpl.name} template`}
                        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE08D]"
                        style={{
                          backgroundColor: 'rgba(6, 17, 40, 0.85)',
                          color: '#FDE08D',
                          border: '1px solid rgba(229, 184, 75, 0.55)'
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 text-[#F5C451]" aria-hidden="true" />
                        Live page preview
                      </button>
                    </div>


                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {livePreviewTemplate ? (
        <PagePreviewModal
          open
          heading="Live page preview"
          subheading={`${livePreviewTemplate.name} · sample words`}
          description="this is a real page drawn by the same page designer that will print your book: the same border, blocks, type and ornaments. The sample words are only here to show the layout — your own words replace them in Step 4."
          footerNote="Change the template, border or colours at any time. This preview is not saved to any book."
          onClose={() => { setLivePreviewTemplate(null); setPreviewPresetId(''); }}
        >
          <div className="mb-3 space-y-2" data-live-preview-presets>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#F3D78B' }}>
              Try a creative direction
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={!previewPresetId}
                onClick={() => setPreviewPresetId('')}
                className="min-h-9 rounded-full px-3 py-1.5 text-[11px] font-bold"
                style={{
                  background: !previewPresetId ? 'rgba(253, 224, 141, 0.22)' : 'rgba(6, 17, 40, 0.8)',
                  color: '#FDE08D',
                  border: '1px solid rgba(229, 184, 75, 0.55)'
                }}
              >
                Template as designed
              </button>
              {DESIGN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.blurb}
                  aria-pressed={previewPresetId === preset.id}
                  onClick={() => setPreviewPresetId(preset.id)}
                  className="min-h-9 rounded-full px-3 py-1.5 text-[11px] font-bold"
                  style={{
                    background: previewPresetId === preset.id ? 'rgba(253, 224, 141, 0.22)' : 'rgba(6, 17, 40, 0.8)',
                    color: '#FDE08D',
                    border: '1px solid rgba(229, 184, 75, 0.55)'
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <ExactTemplatePageRenderer
            project={buildSampleProjectForTemplate({
              categoryId,
              template: livePreviewTemplate,
              title: bookTitle || activeCategory.shortName,
              authorName,
              fontFamily: selectedFont,
              design: {
                ...(DESIGN_PRESETS.find((preset) => preset.id === previewPresetId)?.design || {})
              }
            })}
            chapter={buildSamplePageForTemplate(categoryId, livePreviewTemplate, {
              title: (livePreviewTemplate.defaultPages?.[0]?.title) || livePreviewTemplate.name
            })}
            chapterIndex={0}
            totalChapters={1}
            pageIndex={0}
            totalPages={1}
            editable={false}
            assets={[]}
          />
        </PagePreviewModal>
      ) : null}

      {/* STEP 3: Chapter Index and chapter count */}
      {wizardStep === 3 && !editingProject && (
        <div className="space-y-8">
          <div className="rounded-3xl p-6 sm:p-9 space-y-8" style={BLOCK_STYLE}>
            <div
              className="flex flex-wrap items-center justify-between gap-4 pb-5"
              style={{ borderBottom: '1px solid rgba(229, 184, 75, 0.38)' }}
            >
              <div>
                <h2
                  className="text-2xl sm:text-3xl font-bold mt-1 tracking-wide"
                  style={{ color: '#FDE08D' }}
                >
                  Plan the Chapter Index
                </h2>
                <p
                  className="text-xs sm:text-sm italic mt-1"
                  style={{ color: '#F3D78B' }}
                >
                  Choose how many chapters you want. Each Index entry starts as “Chapter N”; its title is entered on that chapter’s first page in Step 4 and appears here automatically.
                </p>
              </div>

            </div>

            {/* 1. Book Title & Author Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="new-book-title"
                  className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: '#F5C451' }}
                >
                  <span>Your {activeCategory.shortName} Title</span>
                  {!bookTitle.trim() && (
                    <span
                      className="title-attention-chip rounded-full px-2 py-0.5 text-[9px] font-black normal-case tracking-normal"
                      style={{ backgroundColor: '#FDE047', color: '#713F12' }}
                    >
                      ★ Start here — name your book
                    </span>
                  )}
                </label>
                <input
                  id="new-book-title"
                  type="text"
                  required
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={titleError ? 'book-title-error' : 'book-title-help'}
                  value={bookTitle}
                  onChange={(e) => {
                    setBookTitle(e.target.value);
                    if (e.target.value.trim()) setTitleError('');
                  }}
                  placeholder={`e.g. The ${activeCategory.shortName} Collection`}
                  className={`w-full px-4 py-3.5 rounded-xl font-bold text-base focus:outline-none${bookTitle.trim() ? '' : ' title-attention'}`}
                  style={{
                    backgroundColor: '#061128',
                    color: '#FDE08D',
                    border: '1.5px solid rgba(229, 184, 75, 0.6)',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.7)'
                  }}
                />
                {titleError ? (
                  <p id="book-title-error" role="alert" className="mt-2 text-xs font-bold text-rose-200">
                    {titleError}
                  </p>
                ) : (
                  <p id="book-title-help" className="mt-2 text-xs italic" style={{ color: '#F3D78B' }}>
                    Add a title first; selecting a Chapter saves the book so you can return to finish it.
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: '#F5C451' }}
                >
                  Author / Creator Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-4 py-3.5 rounded-xl font-bold text-base focus:outline-none"
                  style={{
                    backgroundColor: '#061128',
                    color: '#FDE08D',
                    border: '1.5px solid rgba(229, 184, 75, 0.6)',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.7)'
                  }}
                />
              </div>
            </div>

            {/* Plan the Index and choose which chapter to open after saving */}
            <div
              className="rounded-3xl p-5 sm:p-7 space-y-6"
              style={{
                backgroundColor: 'rgba(6, 17, 40, 0.78)',
                border: '1.5px solid rgba(229, 184, 75, 0.58)',
                boxShadow: '0 18px 44px rgba(0, 0, 0, 0.78)'
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <ListOrdered className="w-5 h-5 text-[#F5C451]" />
                    <h3
                      className="text-lg sm:text-xl font-bold"
                      style={{ color: '#FDE08D' }}
                    >
                      Choose How Many Chapters
                    </h3>
                  </div>
                  <p
                    id="index-start-page-hint"
                    className="text-xs sm:text-sm italic mt-1"
                    style={{ color: '#F3D78B' }}
                  >
                    Enter a book title, then tap a Chapter button to save the book and open that chapter in Step 4. Chapter titles can be filled in there.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="text-xs sm:text-sm font-bold mr-1"
                    style={{ color: '#F5C451' }}
                  >
                    Number of Chapters:
                  </span>
                  {PAGE_COUNT_OPTIONS.map((num) => {
                    const isActiveCount = indexPages.length === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        aria-pressed={isActiveCount}
                        onClick={() => handleSetQuickPageCount(num)}
                        className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all hover:scale-[1.03]"
                        style={isActiveCount ? GOLD_BTN_STYLE : NAVY_BTN_STYLE}
                      >
                        {num} Chapters
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Each Index entry saves the titled book and opens that chapter in Step 4. */}
              <ol
                aria-label="Chapters in the Index"
                className="list-none space-y-2 max-h-[640px] overflow-y-auto pr-1"
              >
                {indexPages.map((_, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      disabled={submitting}
                      aria-busy={submitting}
                      aria-label={`Save the titled book and open Chapter ${idx + 1} in Step 4`}
                      aria-describedby="index-start-page-hint"
                      onClick={() => handleCreateBookNow(idx)}
                      className="w-full min-h-14 px-5 py-3 rounded-2xl text-left text-base sm:text-lg font-bold disabled:opacity-60 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FDE08D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071430]"
                      style={{
                        backgroundColor: '#0A1C3E',
                        color: '#FDE08D',
                        border: '1.5px solid rgba(229, 184, 75, 0.62)',
                        boxShadow: '0 8px 22px rgba(0, 0, 0, 0.6)'
                      }}
                    >
                      Chapter {idx + 1}
                    </button>
                  </li>
                ))}
              </ol>

              {submitting && (
                <p role="status" aria-live="polite" className="text-sm font-bold" style={{ color: '#FDE08D' }}>
                  Saving your book and opening the selected chapter…
                </p>
              )}
            </div>

            {/* Automatic Tablet Screen Adaptation Note */}
            <div
              className="p-5 rounded-2xl flex items-center gap-4"
              style={{
                backgroundColor: 'rgba(6, 17, 40, 0.85)',
                border: '1.5px solid rgba(229, 184, 75, 0.55)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.65)'
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={GOLD_BTN_STYLE}
              >
                <Tablet className="w-5 h-5 text-[#061128]" />
              </div>
              <div>
                <div
                  className="text-sm sm:text-base font-bold"
                  style={{ color: '#FDE08D' }}
                >
                  Automatic Tablet &amp; E-Reader Sizing Enabled
                </div>
                <p
                  className="text-xs sm:text-sm italic mt-0.5"
                  style={{ color: '#F3D78B' }}
                >
                  Your chapter Index and all chapter pages automatically adapt to iPads, Kindle, Android tablets, and other screen sizes in <strong>EPUB</strong> and <strong>PDF</strong>.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
