import React, { useState } from 'react';
import {
  Download,
  FileText,
  BookOpen,
  FileCode,
  CheckCircle2,
  ListOrdered,
  Tablet,
  ArrowRight
} from 'lucide-react';
import { downloadExportFile } from '../api/client';
import {
  BOOK_CATEGORIES,
  TEMPLATES_BY_CATEGORY
} from '../data/visualTemplatesCatalog';
import ExactTemplatePageRenderer from '../components/ExactTemplatePageRenderer';
import BookIndexPageRenderer from '../components/BookIndexPageRenderer';
import { getChapterPageForEditor, getChapterPages } from '../utils/chapterPages';

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

export default function ExportPublishView({
  project,
  chapters: chaptersProp,
  notify = () => {}
}) {
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  // Preview the Chapter Index first; chapter and page selection are kept separate.
  const [readerMode, setReaderMode] = useState('index');
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);

  if (!project) return null;

  const pubType = project.publicationType || project.bookType || 'photobook';
  const activeCategory =
    BOOK_CATEGORIES.find((c) => c.id === pubType) || BOOK_CATEGORIES[0];
  const categoryTemplates =
    TEMPLATES_BY_CATEGORY[activeCategory.id] || TEMPLATES_BY_CATEGORY.photobook;
  const cover = project.coverConfig || {};
  const visualTpl =
    categoryTemplates.find((t) => t.id === cover.visualTemplateId) ||
    categoryTemplates[0];

  const chapters = chaptersProp || project.chapters || [];
  const currentChapter = chapters[activeChapterIndex] || chapters[0] || null;
  const currentChapterPages = getChapterPages(currentChapter);
  const currentPageIndex = Math.max(0, Math.min(activePageIndex, Math.max(0, currentChapterPages.length - 1)));
  const currentPageChapter = getChapterPageForEditor(currentChapter, currentPageIndex);

  const handleDownload = async (format) => {
    setDownloadingFormat(format);
    try {
      await downloadExportFile(
        project.id,
        format,
        `${project.title || 'book'}.${format}`
      );
      notify(
        `Downloaded ${format.toUpperCase()} with the Chapter Index and all chapter pages!`
      );
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      style={{ fontFamily: CLASSICAL_SERIF }}
    >
      {/* STEP 5 HERO BANNER — Dark Blue + Classical Gold Writing + Deep Shadow */}
      <div
        className="rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4"
        style={BLOCK_STYLE}
      >
        <div>
          <span
            className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
            style={GOLD_BTN_STYLE}
          >
            {project.title || 'Your book'} · {chapters.length} chapters
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-2.5 tracking-wide"
            style={{
              color: '#FDE08D',
              textShadow: '0 3px 12px rgba(0, 0, 0, 0.8)'
            }}
          >
            Preview and download your book
          </h1>
          <p
            className="text-sm sm:text-base italic mt-1"
            style={{ color: '#F3D78B' }}
          >
            The Chapter Index lists your chapters. Download a complete EPUB, PDF, DOCX, or JSON backup; each chapter export contains all of its pages.
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold"
          style={NAVY_BTN_STYLE}
        >
          <Tablet className="w-4 h-4 text-[#F5C451]" />
          <span>Auto-Sized for All Tablets &amp; E-Readers</span>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE CLICKABLE INDEX PAGE & LIVE TABLET READER */}
      <div className="rounded-3xl p-6 sm:p-8 space-y-6" style={BLOCK_STYLE}>
        <div
          className="flex flex-wrap items-center justify-between gap-4 pb-4"
          style={{ borderBottom: '1px solid rgba(229, 184, 75, 0.35)' }}
        >
          <div className="flex items-center gap-2.5">
            <ListOrdered className="w-5 h-5 text-[#F5C451]" />
            <div>
              <h2
                className="text-lg sm:text-xl font-bold tracking-wide"
                style={{ color: '#FDE08D' }}
              >
                Preview the Chapter Index and each chapter page
              </h2>
              <p
                className="text-xs sm:text-sm italic"
                style={{ color: '#F3D78B' }}
              >
                Select a chapter, then choose one of its pages to preview the saved layout and content.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReaderMode('index')}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              style={readerMode === 'index' ? GOLD_BTN_STYLE : NAVY_BTN_STYLE}
            >
              <ListOrdered
                className={`w-3.5 h-3.5 ${
                  readerMode === 'index' ? 'text-[#061128]' : 'text-[#F5C451]'
                }`}
              />
              <span>Chapter Index</span>
            </button>
            <span
              className="px-3.5 py-2 rounded-xl text-xs font-bold"
              style={NAVY_BTN_STYLE}
            >
              Style: {visualTpl.name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Chapter Index and page preview navigation */}
          <div
            className="lg:col-span-4 rounded-2xl p-5 space-y-4"
            style={{
              backgroundColor: 'rgba(6, 17, 40, 0.85)',
              border: '1.5px solid rgba(229, 184, 75, 0.5)',
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.7)'
            }}
          >
            <div>
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: '#F5C451' }}
              >
                ❖ Chapter Index
              </div>
              <button
                type="button"
                onClick={() => setReaderMode('index')}
                className="w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between gap-2"
                style={readerMode === 'index' ? GOLD_BTN_STYLE : NAVY_BTN_STYLE}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ListOrdered
                    className={`w-4 h-4 shrink-0 ${
                      readerMode === 'index'
                        ? 'text-[#061128]'
                        : 'text-[#F5C451]'
                    }`}
                  />
                  <div className="truncate">
                    <div className="text-xs font-bold">The Chapter Index</div>
                    <div
                      className={`text-[11px] truncate ${
                        readerMode === 'index'
                          ? 'text-[#061128]/80'
                          : 'text-[#F3D78B]'
                      }`}
                    >
                      Lists all {chapters.length} chapters
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>

            <div
              className="pt-3"
              style={{ borderTop: '1px solid rgba(229, 184, 75, 0.35)' }}
            >
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: '#F5C451' }}
              >
                ❖ Chapters in the Index ({chapters.length})
              </div>
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {chapters.map((ch, idx) => {
                  const isActive =
                    readerMode === 'page' && idx === activeChapterIndex;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setActiveChapterIndex(idx);
                        setActivePageIndex(0);
                        setReaderMode('page');
                      }}
                      className="w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2"
                      style={
                        isActive
                          ? GOLD_BTN_STYLE
                          : {
                              backgroundColor: 'rgba(10, 28, 62, 0.85)',
                              color: '#FDE08D',
                              border: '1px solid rgba(229, 184, 75, 0.42)',
                              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.55)'
                            }
                      }
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-[10px] font-bold uppercase tracking-widest ${
                            isActive ? 'text-[#061128]/80' : 'text-[#F5C451]'
                          }`}
                        >
                          Chapter {idx + 1}
                        </div>
                        <div className="text-xs font-bold truncate mt-0.5">
                          {ch.title}
                        </div>
                      </div>
                      <ArrowRight
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#061128]' : 'text-[#F5C451]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preview the Chapter Index or a selected page */}
          <div className="lg:col-span-8 space-y-3">
            {readerMode === 'index' ? (
              <BookIndexPageRenderer
                project={project}
                pages={chapters}
                editable={false}
                onSelectPage={(chapterIndex) => {
                  setActiveChapterIndex(chapterIndex);
                  setActivePageIndex(0);
                  setReaderMode('page');
                }}
              />
            ) : (
              currentChapter && currentPageChapter && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3" style={NAVY_BTN_STYLE}>
                    <span className="text-xs font-bold">{currentChapter.title || `Chapter ${activeChapterIndex + 1}`}</span>
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <span>Page</span>
                      <select
                        value={currentPageIndex}
                        aria-label="Select page for export preview"
                        onChange={(event) => setActivePageIndex(Number(event.target.value))}
                        className="min-h-9 px-2 rounded-lg"
                        style={{ backgroundColor: '#061128', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.6)' }}
                      >
                        {currentChapterPages.map((page, index) => (
                          <option key={page.id || index} value={index}>
                            Page {index + 1}{index === 0 ? ' · Chapter title' : page.title ? ` · ${page.title}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <ExactTemplatePageRenderer
                    project={project}
                    chapter={currentPageChapter}
                    chapterIndex={activeChapterIndex}
                    totalChapters={chapters.length}
                    pageIndex={currentPageIndex}
                    totalPages={currentChapterPages.length}
                    chapterSummaries={chapters.map((item) => ({ title: item.title, synopsis: item.synopsis, guidance: item.guidance }))}
                    editable={false}
                  />
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: ONE-CLICK DOWNLOAD CARDS (EPUB, PDF, DOCX) — Max 2 cards per row on 16:9 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* EPUB Download */}
        <div
          className="rounded-3xl p-7 flex flex-col justify-between transition-all hover:-translate-y-1"
          style={BLOCK_STYLE}
        >
          <div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={GOLD_BTN_STYLE}
            >
              <BookOpen className="w-6 h-6 text-[#061128]" />
            </div>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#F5C451' }}
            >
              ❖ Best for Apple Books, Kindle &amp; Tablets
            </span>
            <h3
              className="text-xl sm:text-2xl font-bold mt-1"
              style={{ color: '#FDE08D' }}
            >
              1. Tablet E-Book (.EPUB)
            </h3>
            <p
              className="text-xs sm:text-sm italic mt-2 leading-relaxed"
              style={{ color: '#F3D78B' }}
            >
              Includes a <strong>clickable Chapter Index</strong> and the saved content from every page in each chapter.
            </p>
            <div
              className="mt-4 space-y-1.5 text-xs font-bold"
              style={{ color: '#FDE08D' }}
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#F5C451]" />
                <span>Chapter Index links to each chapter</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#F5C451]" />
                <span>Automatic screen adaptation for all tablets</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={downloadingFormat === 'epub'}
            onClick={() => handleDownload('epub')}
            className="mt-6 w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-105"
            style={GOLD_BTN_STYLE}
          >
            <Download className="w-4 h-4 text-[#061128]" />
            <span>
              {downloadingFormat === 'epub'
                ? 'Creating EPUB...'
                : 'Download Tablet EPUB (Chapter Index)'}
            </span>
          </button>
        </div>

        {/* PDF Download */}
        <div
          className="rounded-3xl p-7 flex flex-col justify-between transition-all hover:-translate-y-1"
          style={BLOCK_STYLE}
        >
          <div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={GOLD_BTN_STYLE}
            >
              <FileText className="w-6 h-6 text-[#061128]" />
            </div>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#F5C451' }}
            >
              ❖ Best for Visual Sharing, Tablets &amp; Printing
            </span>
            <h3
              className="text-xl sm:text-2xl font-bold mt-1"
              style={{ color: '#FDE08D' }}
            >
              2. Styled Book (.PDF)
            </h3>
            <p
              className="text-xs sm:text-sm italic mt-2 leading-relaxed"
              style={{ color: '#F3D78B' }}
            >
              Includes your chapter titles and page content with a <strong>clickable Chapter Index</strong>.
            </p>
            <div
              className="mt-4 space-y-1.5 text-xs font-bold"
              style={{ color: '#FDE08D' }}
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#F5C451]" />
                <span>Chapter Index links directly to every chapter</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#F5C451]" />
                <span>Uses your selected book style and export formatting</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={downloadingFormat === 'pdf'}
            onClick={() => handleDownload('pdf')}
            className="mt-6 w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-105"
            style={GOLD_BTN_STYLE}
          >
            <Download className="w-4 h-4 text-[#061128]" />
            <span>
              {downloadingFormat === 'pdf'
                ? 'Creating PDF...'
                : 'Download Styled PDF (Chapter Index)'}
            </span>
          </button>
        </div>

        {/* DOCX Download */}
        <div
          className="rounded-3xl p-7 flex flex-col justify-between transition-all hover:-translate-y-1 md:col-span-2"
          style={BLOCK_STYLE}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={GOLD_BTN_STYLE}
                >
                  <FileCode className="w-6 h-6 text-[#061128]" />
                </div>
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: '#F5C451' }}
                  >
                    ❖ Best for Word &amp; Google Docs
                  </span>
                  <h3
                    className="text-xl sm:text-2xl font-bold"
                    style={{ color: '#FDE08D' }}
                  >
                    3. Editable Word Document (.DOCX)
                  </h3>
                </div>
              </div>
              <p
                className="text-xs sm:text-sm italic mt-3 leading-relaxed"
                style={{ color: '#F3D78B' }}
              >
                Download a Word file containing the Chapter Index, chapter headings, and all page content for Microsoft Word or Google Docs.
              </p>
            </div>

            <button
              type="button"
              disabled={downloadingFormat === 'docx'}
              onClick={() => handleDownload('docx')}
              className="py-3.5 px-7 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shrink-0 transition-all hover:brightness-110"
              style={NAVY_BTN_STYLE}
            >
              <Download className="w-4 h-4 text-[#F5C451]" />
              <span>
                {downloadingFormat === 'docx'
                  ? 'Creating Word File...'
                  : 'Download Word Document (.DOCX)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
