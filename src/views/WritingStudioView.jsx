import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  Plus,
  Trash2,
  KeyRound,
  Sparkles
} from 'lucide-react';
import {
  BOOK_CATEGORIES,
  TEMPLATES_BY_CATEGORY
} from '../data/visualTemplatesCatalog';
import ExactTemplatePageRenderer from '../components/ExactTemplatePageRenderer';
import BookAppearanceControls from '../components/BookAppearanceControls';
import IntroductionPageEditor from '../components/IntroductionPageEditor';
import CoverEditor from '../components/CoverEditor';
import PagePreviewModal from '../components/PagePreviewModal';
import {
  appendChapterPage,
  buildChapterPagePatch,
  buildChapterPagePreview,
  buildChapterPagesPatch,
  deleteChapterPage,
  getChapterPageForEditor,
  getChapterPages
} from '../utils/chapterPages';

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

export default function WritingStudioView({
  project,
  chapters: chaptersProp,
  aiConfigured = false,
  onOpenAiSettings,
  assets = [],
  activeChapter,
  activePageIndex = 0,
  onActivePageIndexChange,
  onRegisterPageFlush,
  onSaveChapter,
  onAssetsChanged,
  onUpdateProject,
  notify = () => {}
}) {
  const [saving, setSaving] = useState(false);
  const [pagePreview, setPagePreview] = useState(null);
  const activePageSaveRef = useRef(null);
  const activePagePreviewRef = useRef(null);
  const pendingPageSavesRef = useRef(new Map());

  // Three studio sections: chapter pages, the full Introduction page, and the cover designer.
  const [studioSection, setStudioSection] = useState('pages'); // 'pages' | 'intro' | 'cover'
  const studioSectionRef = useRef('pages');
  const introFlushRef = useRef(null);
  const coverFlushRef = useRef(null);

  const pubType = project?.publicationType || project?.bookType || 'photobook';
  const activeCategory =
    BOOK_CATEGORIES.find((category) => category.id === pubType) || BOOK_CATEGORIES[0];
  const categoryTemplates =
    TEMPLATES_BY_CATEGORY[activeCategory.id] || TEMPLATES_BY_CATEGORY.photobook;
  const coverCfg = project?.coverConfig || {};
  const visualTpl =
    categoryTemplates.find((template) => template.id === coverCfg.visualTemplateId) ||
    categoryTemplates[0];
  const chapters = chaptersProp || project?.chapters || [];
  const chaptersRef = useRef(chapters);
  const activeIdx = chapters.findIndex((chapter) => chapter.id === activeChapter?.id);
  const activePages = getChapterPages(activeChapter);
  const safePageIndex = Math.max(0, Math.min(Number(activePageIndex) || 0, Math.max(0, activePages.length - 1)));
  const activePageChapter = getChapterPageForEditor(activeChapter, safePageIndex);

  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  const trackedSaveCurrentPage = useCallback(
    (chapterId, updates) => {
      const pageIndexToSave = safePageIndex;
      const saveKey = `${chapterId}:${pageIndexToSave}`;
      const previous = pendingPageSavesRef.current.get(saveKey) || Promise.resolve();
      const pending = previous
        .catch(() => {})
        .then(async () => {
          const sourceChapter =
            chaptersRef.current.find((chapter) => chapter.id === chapterId) ||
            (activeChapter?.id === chapterId ? activeChapter : null);
          if (!sourceChapter) return null;
          const chapterPatch = buildChapterPagePatch(sourceChapter, pageIndexToSave, updates);
          const savedChapter = await onSaveChapter?.(chapterId, chapterPatch);
          if (savedChapter) {
            chaptersRef.current = chaptersRef.current.map((chapter) =>
              chapter.id === chapterId ? savedChapter : chapter
            );
          }
          return savedChapter;
        });
      pendingPageSavesRef.current.set(saveKey, pending);
      const clearPending = () => {
        if (pendingPageSavesRef.current.get(saveKey) === pending) {
          pendingPageSavesRef.current.delete(saveKey);
        }
      };
      pending.then(clearPending, clearPending);
      return pending;
    },
    [activeChapter, onSaveChapter, safePageIndex]
  );

  const registerActivePageSave = useCallback((savePage) => {
    activePageSaveRef.current = savePage;
  }, []);

  const registerActivePagePreview = useCallback((getPreviewPatch) => {
    activePagePreviewRef.current = getPreviewPatch;
  }, []);

  const flushActivePage = useCallback(async (
    chapterId = activeChapter?.id,
    pageIndex = safePageIndex
  ) => {
    if (!chapterId) return;
    if (chapterId === activeChapter?.id && pageIndex === safePageIndex && activePageSaveRef.current) {
      await activePageSaveRef.current();
    }
    const pending = pendingPageSavesRef.current.get(`${chapterId}:${pageIndex}`);
    if (pending) await pending;
  }, [activeChapter?.id, safePageIndex]);

  // Flush whichever studio section is active before navigation leaves the view.
  const flushActiveSection = useCallback(async () => {
    if (studioSectionRef.current === 'intro') {
      await introFlushRef.current?.();
      return;
    }
    if (studioSectionRef.current === 'cover') {
      await coverFlushRef.current?.();
      return;
    }
    await flushActivePage(activeChapter?.id, safePageIndex);
  }, [flushActivePage, activeChapter?.id, safePageIndex]);

  useEffect(() => {
    if (!onRegisterPageFlush) return undefined;
    onRegisterPageFlush(() => flushActiveSection());
    return () => onRegisterPageFlush(null);
  }, [onRegisterPageFlush, flushActiveSection]);

  const handleSectionChange = async (nextSection) => {
    if (nextSection === studioSectionRef.current) return;
    try {
      // Persist pending edits of the outgoing section before switching.
      await flushActiveSection();
      studioSectionRef.current = nextSection;
      setStudioSection(nextSection);
    } catch (error) {
      notify(error.message || 'Could not save before switching. Please try again.', 'error');
    }
  };

  const handleManualSave = async () => {
    if (!activeChapter?.id) return;
    setSaving(true);
    try {
      await flushActivePage(activeChapter.id, safePageIndex);
      notify('Page saved!');
    } catch (error) {
      notify(error.message || 'Could not save this page. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Snapshot the page exactly as it stands — unsaved words and the chosen
  // layout included — and show it as the clean finished page. Previewing
  // reads the editor's draft; it never writes to the book.
  const handlePreviewPage = () => {
    if (!activeChapter || !activePageChapter) return;
    const draftPatch = activePagePreviewRef.current?.() || null;
    const chapterIndex = activeIdx >= 0 ? activeIdx : 0;
    setPagePreview({
      chapter: buildChapterPagePreview(activePageChapter, draftPatch),
      chapterIndex,
      pageIndex: safePageIndex,
      totalPages: activePages.length,
      label: `${activeChapter.title || `Chapter ${chapterIndex + 1}`} · Page ${safePageIndex + 1} of ${activePages.length}`
    });
  };

  // A preview belongs to one page; never leave a stale one open after moving.
  useEffect(() => {
    setPagePreview(null);
  }, [activeChapter?.id, safePageIndex]);

  const handleSelectExistingPage = async (nextPageIndex) => {
    const nextIndex = Number(nextPageIndex);
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= activePages.length || nextIndex === safePageIndex) return;
    try {
      await flushActivePage(activeChapter?.id, safePageIndex);
      onActivePageIndexChange?.(nextIndex);
    } catch (error) {
      notify(error.message || 'Could not save this page. Please try again.', 'error');
    }
  };

  const handlePreviousPage = async () => {
    if (safePageIndex <= 0) return;
    await handleSelectExistingPage(safePageIndex - 1);
  };

  const handleCreateNextPage = async () => {
    if (!activeChapter?.id) return;
    try {
      await flushActivePage(activeChapter.id, safePageIndex);
      const currentChapter =
        chaptersRef.current.find((chapter) => chapter.id === activeChapter.id) || activeChapter;
      const nextPages = appendChapterPage(currentChapter, safePageIndex);
      const savedChapter = await onSaveChapter?.(
        activeChapter.id,
        buildChapterPagesPatch(currentChapter, nextPages)
      );
      if (savedChapter) {
        chaptersRef.current = chaptersRef.current.map((chapter) =>
          chapter.id === activeChapter.id ? savedChapter : chapter
        );
      }
      onActivePageIndexChange?.(nextPages.length - 1);
    } catch (error) {
      notify(error.message || 'Could not create a new page. Please try again.', 'error');
    }
  };

  const handleDeleteCurrentPage = async () => {
    if (!activeChapter?.id) return;
    try {
      await flushActivePage(activeChapter.id, safePageIndex);
      const currentChapter =
        chaptersRef.current.find((chapter) => chapter.id === activeChapter.id) || activeChapter;
      const result = deleteChapterPage(currentChapter, safePageIndex);
      if (!result.deleted) {
        notify('Every chapter keeps at least one page, so the first page and Index entry were preserved.', 'error');
        return;
      }
      const savedChapter = await onSaveChapter?.(
        activeChapter.id,
        buildChapterPagesPatch(currentChapter, result.pages)
      );
      if (savedChapter) {
        chaptersRef.current = chaptersRef.current.map((chapter) =>
          chapter.id === activeChapter.id ? savedChapter : chapter
        );
      }
      onActivePageIndexChange?.(result.activePageIndex);
      notify('Page deleted. The chapter and its Index entry remain.');
    } catch (error) {
      notify(error.message || 'Could not delete this page. Please try again.', 'error');
    }
  };

  if (!project) return null;

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5"
      style={{ fontFamily: CLASSICAL_SERIF }}
    >
      <section className="rounded-3xl p-5 sm:p-6" style={BLOCK_STYLE}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={GOLD_BTN_STYLE}>
            {activeCategory.shortName} · {visualTpl.name}
          </span>
          {activeChapter && (
            <span className="text-xs font-bold" style={{ color: '#F3D78B' }}>
              Chapter {activeIdx >= 0 ? activeIdx + 1 : 1} of {chapters.length}
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mt-3 tracking-wide" style={{ color: '#FDE08D', textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)' }}>
          Write and design your pages
        </h1>
        <p className="text-xs sm:text-sm italic mt-1" style={{ color: '#F3D78B' }}>
          Choose one of five page layouts, then use the small Edit button on any text block or photo frame. Each editor knows exactly how much its space holds, so the finished page matches the design. Use Next Page to add a page to this chapter; the Index stays a chapter list.
        </p>
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200/30 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            {aiConfigured ? <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C451]" /> : <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C451]" />}
            <p className="text-[11px] leading-relaxed sm:text-xs" style={{ color: '#F3D78B' }}>
              {aiConfigured
                ? 'AI writing is ready. Open any block with its Edit button — “Write with AI” lives inside the editor, and every draft is written to fit that block’s exact space on the page before you review and place it.'
                : 'Connect Gemini to enable contextual AI inside each block’s editor. Paste and save your key in the header settings, test the connection, then open any text block with its Edit button.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAiSettings}
            className="min-h-10 shrink-0 rounded-xl px-3 py-2 text-[11px] font-extrabold"
            style={aiConfigured ? NAVY_BTN_STYLE : GOLD_BTN_STYLE}
          >
            {aiConfigured ? 'Manage AI providers' : 'Set up Gemini'}
          </button>
        </div>
      </section>

      <BookAppearanceControls
        project={project}
        categoryId={activeCategory.id}
        onUpdateProject={onUpdateProject}
        onBeforeChange={() => flushActiveSection()}
        notify={notify}
      />

      {/* Studio sections: chapter pages · Introduction page · book cover */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Book editing sections"
        style={{ fontFamily: CLASSICAL_SERIF }}
      >
        {[
          { key: 'pages', label: 'Chapter pages' },
          { key: 'intro', label: 'Introduction page' },
          { key: 'cover', label: 'Book cover' }
        ].map((tab) => {
          const selected = studioSection === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={tab.label}
              onClick={() => handleSectionChange(tab.key)}
              className="min-h-11 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all hover:brightness-110"
              style={selected ? GOLD_BTN_STYLE : NAVY_BTN_STYLE}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {studioSection === 'intro' ? (
        <IntroductionPageEditor
          project={project}
          visualTemplate={visualTpl}
          fontFamily={coverCfg.fontFamily || visualTpl.fontFamily || ''}
          aiConfigured={aiConfigured}
          introduction={project?.introduction}
          onUpdateProject={onUpdateProject}
          onRegisterFlush={(fn) => { introFlushRef.current = fn; }}
          notify={notify}
        />
      ) : null}

      {studioSection === 'cover' ? (
        <CoverEditor
          project={project}
          visualTemplate={visualTpl}
          categoryId={activeCategory.id}
          trimSize={activeCategory.trimSize || '6x9'}
          assets={assets}
          onUpdateProject={onUpdateProject}
          onRegisterFlush={(fn) => { coverFlushRef.current = fn; }}
          onAssetsChanged={onAssetsChanged}
          onOpenAiSettings={onOpenAiSettings}
          notify={notify}
        />
      ) : null}

      {studioSection === 'pages' ? (
      <div className="grid grid-cols-1 gap-5 items-start">
        <div className="space-y-4">
          {activeChapter && activePageChapter ? (
            <>
              <ExactTemplatePageRenderer
                key={`${activeChapter.id}:${safePageIndex}:${activePageChapter.structuredData?.pageStructure ?? 'legacy'}`}
                project={project}
                chapter={activePageChapter}
                chapterIndex={activeIdx >= 0 ? activeIdx : 0}
                totalChapters={chapters.length}
                pageIndex={safePageIndex}
                totalPages={activePages.length}
                chapterSummaries={chapters.map((item) => ({ title: item.title, synopsis: item.synopsis, guidance: item.guidance }))}
                assets={assets}
                editable={true}
                aiConfigured={aiConfigured}
                onSaveChapter={trackedSaveCurrentPage}
                onRegisterSave={registerActivePageSave}
                onRegisterPreview={registerActivePagePreview}
                onAssetsChanged={onAssetsChanged}
                onOpenAiSettings={onOpenAiSettings}
              />

              <section className="rounded-2xl p-4 sm:p-5 space-y-4" style={BLOCK_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#FDE08D' }}>
                      {activeChapter.title || `Chapter ${activeIdx + 1}`} · Page {safePageIndex + 1} of {activePages.length}
                    </div>
                    <p className="text-xs italic mt-1" style={{ color: '#F3D78B' }}>
                      Next Page always creates a new page in this chapter. Delete Page removes the selected page; a chapter keeps at least one page.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2" aria-label="Current chapter page tools">
                    <button
                      type="button"
                      onClick={handlePreviousPage}
                      disabled={saving || safePageIndex === 0}
                      aria-label="Previous page in this chapter"
                      className="min-h-11 px-3 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-2 disabled:opacity-40 transition-all hover:brightness-110"
                      style={NAVY_BTN_STYLE}
                    >
                      <ArrowLeft className="w-4 h-4 text-[#F5C451]" />
                      <span>Previous Page</span>
                    </button>

                    <label htmlFor="chapter-page-picker" className="sr-only">Select a page in this chapter</label>
                    <select
                      id="chapter-page-picker"
                      aria-label="Select a page in this chapter"
                      value={safePageIndex}
                      onChange={(event) => handleSelectExistingPage(event.target.value)}
                      className="min-h-11 max-w-40 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FDE08D]"
                      style={{ backgroundColor: '#061128', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.6)' }}
                    >
                      {activePages.map((page, index) => (
                        <option key={page.id || index} value={index}>
                          Page {index + 1}{index === 0 ? ' · Chapter title' : page.title ? ` · ${page.title}` : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleCreateNextPage}
                      disabled={saving}
                      aria-label="Next Page: create a new page in this chapter"
                      className="min-h-11 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2 disabled:opacity-50 transition-all hover:brightness-110"
                      style={GOLD_BTN_STYLE}
                    >
                      <span>Next Page</span>
                      <Plus className="w-4 h-4 text-[#061128]" />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteCurrentPage}
                      disabled={saving || activePages.length <= 1}
                      aria-label="Delete the current page"
                      className="min-h-11 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2 disabled:opacity-40 transition-all hover:brightness-110"
                      style={{ backgroundColor: 'rgba(72, 18, 30, 0.85)', color: '#FFE3E8', border: '1.5px solid rgba(248, 113, 133, 0.65)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Page</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid rgba(229, 184, 75, 0.35)' }}>
                  <span className="text-[11px]" style={{ color: '#F3D78B' }}>
                    Page changes save as you work. The chapter title on page one supplies the Index entry. Tap Preview Page to see the finished page before you save.
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreviewPage}
                      disabled={saving}
                      aria-label="Preview this page as readers will see it, before saving"
                      className="min-h-10 px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:brightness-125"
                      style={NAVY_BTN_STYLE}
                    >
                      <Eye className="w-4 h-4 text-[#F5C451]" />
                      <span>Preview Page</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleManualSave}
                      disabled={saving}
                      aria-busy={saving}
                      className="min-h-10 px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:brightness-110"
                      style={GOLD_BTN_STYLE}
                    >
                      <Check className="w-4 h-4 text-[#061128]" />
                      <span>{saving ? 'Saving…' : 'Save Page'}</span>
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-3xl p-6 text-center" style={BLOCK_STYLE}>
              <p className="text-sm font-bold" style={{ color: '#FDE08D' }}>Choose a chapter from the Index to start writing.</p>
            </div>
          )}
        </div>
      </div>
      ) : null}

      <PagePreviewModal
        open={Boolean(pagePreview)}
        heading="Preview this page"
        subheading={pagePreview?.label || ''}
        saving={saving}
        onClose={() => setPagePreview(null)}
        onSave={handleManualSave}
      >
        {pagePreview && (
          <ExactTemplatePageRenderer
            project={project}
            chapter={pagePreview.chapter}
            chapterIndex={pagePreview.chapterIndex}
            totalChapters={chapters.length}
            pageIndex={pagePreview.pageIndex}
            totalPages={pagePreview.totalPages}
            chapterSummaries={chapters.map((item) => ({ title: item.title, synopsis: item.synopsis, guidance: item.guidance }))}
            assets={assets}
            editable={false}
          />
        )}
      </PagePreviewModal>
    </div>
  );

}
