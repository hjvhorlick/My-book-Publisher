import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { getVisualTemplateForProject } from '../data/visualTemplatesCatalog';

/**
 * Renders the book's chapter list in the selected visual template
 * inside a realistic Studio Tablet on a Warm Wood Desk with the exact template border,
 * colors, and font chosen by the user.
 */
export default function BookIndexPageRenderer({
  project,
  pages = [],
  editable = false,
  onSelectPage,
  onUpdatePageTitle
}) {
  const visualTpl = getVisualTemplateForProject(project);
  const tplId = visualTpl.id;

  const isMidnightGold = tplId === 'photo-gallery-frame';
  const isWarmClassic = tplId === 'book-warm-classic';

  const pageBg =
    project?.coverConfig?.pageBg ||
    (isMidnightGold ? '#071329' : isWarmClassic ? '#F7F0DF' : visualTpl.pageBg || '#FFFFFF');
  const pageText =
    project?.coverConfig?.pageText ||
    (isMidnightGold ? '#F8FAFC' : visualTpl.pageText || '#0F172A');
  const borderColor =
    project?.coverConfig?.borderColor || visualTpl.borderColor || '#4F46E5';
  const accentColor =
    project?.coverConfig?.accentColor || visualTpl.accentColor || '#4F46E5';
  const borderStyle =
    project?.coverConfig?.borderStyle || visualTpl.borderStyle || 'clean-line';
  const fontFamily =
    project?.coverConfig?.fontFamily || visualTpl.fontFamily || 'Plus Jakarta Sans';

  const borderFrameCss =
    borderStyle === 'double-gold'
      ? {
          border: `4px double ${borderColor}`,
          boxShadow: `inset 0 0 0 4px ${pageBg}, inset 0 0 0 5px ${borderColor}66`
        }
      : borderStyle === 'rounded-frame'
      ? { border: `3px solid ${borderColor}` }
      : { border: `3px solid ${borderColor}` };

  return (
    <div
      className="rounded-[34px] p-4 sm:p-7 shadow-2xl relative overflow-hidden"
      style={{
        background:
          'linear-gradient(145deg, #6D4C30 0%, #523720 48%, #3D2714 100%)',
        boxShadow:
          '0 26px 60px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.18)'
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(8deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 2px, transparent 2px, transparent 14px)'
        }}
      />

      <div className="relative rounded-[28px] p-3 sm:p-4 bg-[#0B0F17] border-[3px] border-slate-700/90 shadow-[0_24px_55px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-center mb-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-600" />
        </div>

        <div className="rounded-[18px] overflow-hidden relative shadow-inner">
          <div
            className="min-h-[520px] p-6 sm:p-10 flex flex-col justify-between transition-all relative overflow-hidden"
            style={{
              backgroundColor: pageBg,
              color: pageText,
              fontFamily,
              ...borderFrameCss
            }}
          >
            <div className="space-y-6">
              {/* Chapter Index Header */}
              <div
                className="text-center pb-5 px-4"
                style={{ borderBottom: `2px solid ${borderColor}66` }}
              >
                <span
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-white mb-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Chapter Index
                </span>
                <h2
                  className="text-xl sm:text-3xl font-extrabold tracking-wide uppercase break-words"
                  style={{ color: isMidnightGold ? borderColor : pageText }}
                >
                  {project?.title || 'My Book'} — Index
                </h2>
                <p className="text-xs opacity-80 mt-1">
                  Select a chapter title to open its first page
                </p>
              </div>

              {/* One colored chapter heading per Index entry; no duplicate page-number/action labels. */}
              <ol className="space-y-3 max-w-2xl mx-auto w-full list-none">
                {pages.map((page, idx) => {
                  const chapterTitle = page.title?.trim() || `Chapter ${idx + 1}`;
                  return (
                    <li key={page.id || idx}>
                      {editable && onUpdatePageTitle ? (
                        <label
                          className="block p-3.5 sm:p-4 rounded-2xl"
                          style={{
                            backgroundColor: isMidnightGold
                              ? 'rgba(255,255,255,0.06)'
                              : `${accentColor}12`,
                            border: `1.5px solid ${borderColor}66`
                          }}
                        >
                          <span className="sr-only">Chapter {idx + 1} title</span>
                          <input
                            type="text"
                            value={page.title || ''}
                            onChange={(event) => onUpdatePageTitle(idx, event.target.value, page)}
                            placeholder={`Chapter ${idx + 1}`}
                            className="w-full bg-transparent font-extrabold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 py-1 min-w-0"
                            style={{ color: accentColor }}
                          />
                        </label>
                      ) : (
                        <button
                          type="button"
                          disabled={!onSelectPage}
                          onClick={() => onSelectPage?.(idx)}
                          aria-label={`Open Chapter ${idx + 1}: ${chapterTitle}`}
                          className="w-full min-h-14 p-3.5 sm:p-4 rounded-2xl transition-all flex items-center justify-between gap-3 text-left disabled:cursor-default hover:enabled:scale-[1.01] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FDE08D]"
                          style={{
                            backgroundColor: isMidnightGold
                              ? 'rgba(255,255,255,0.06)'
                              : `${accentColor}12`,
                            border: `1.5px solid ${borderColor}66`
                          }}
                        >
                          <span
                            className="font-extrabold text-sm sm:text-base break-words"
                            style={{ color: accentColor }}
                          >
                            {chapterTitle}
                          </span>
                          {onSelectPage && <ArrowRight aria-hidden="true" className="w-4 h-4 shrink-0" style={{ color: accentColor }} />}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Footer of the Chapter Index */}
            <div
              className="mt-8 pt-3 flex items-center justify-between text-xs font-bold opacity-80"
              style={{ borderTop: `1px solid ${borderColor}55` }}
            >
              <span className="truncate">{project?.title || 'My Book'}</span>
              <span className="shrink-0">CHAPTER INDEX • {pages.length} CHAPTERS</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center mt-2">
          <div className="w-28 h-1 rounded-full bg-slate-600/80" />
        </div>
      </div>
    </div>
  );
}
