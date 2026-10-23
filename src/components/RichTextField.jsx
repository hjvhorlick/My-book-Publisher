import React, { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import BlockTextEditor from './BlockTextEditor';
import { getFitStatus, getTextSlotRule } from '../data/slotRules';
import {
  countRichTextWords,
  normalizeRichHtml,
  richHtmlToPlainText
} from '../utils/richText';

const FIT_DOT = {
  empty: '#94A3B8',
  short: '#F0B429',
  ideal: '#34D399',
  nearFull: '#F59E0B',
  over: '#FB7185'
};

/**
 * A template text block as it appears on the designed page.
 *
 * While editing the book it shows the author's formatted words exactly as
 * they will print, plus ONE small Edit button — the formatting toolbar and
 * AI tools live inside the editor dialog, not on the page. In read-only
 * mode (export preview / published pages) it renders only the book's
 * words: no buttons, no counters, no editor chrome of any kind.
 *
 * The block knows its slot rule (how many words its space holds), shows a
 * tiny fit counter next to Edit, and hands the rule to the editor so both
 * typing and AI generation fill — but never overflow — the space.
 */
export default function RichTextField({
  value = '',
  onChange,
  onBlur,
  placeholder = '',
  rows = 4,
  className = '',
  style = {},
  readOnly = false,
  plainText = false,
  aiConfigured = false,
  aiContext = {},
  ariaLabel = 'Page text editor',
  showWordCount = true,
  rule: ruleProp,
  onOpenAiSettings,
  emptyInPrint = true
}) {
  const [editorOpen, setEditorOpen] = useState(false);

  const rule = useMemo(() => ruleProp || getTextSlotRule({
    categoryId: aiContext.categoryId || aiContext.publicationType,
    fieldKey: aiContext.fieldKey,
    rows,
    maxWords: aiContext.maxWords,
    fieldLabel: aiContext.fieldLabel
  }), [ruleProp, aiContext.categoryId, aiContext.publicationType, aiContext.fieldKey, aiContext.maxWords, aiContext.fieldLabel, rows]);

  const isPlain = plainText || rule.plainText;
  const plainValue = isPlain ? String(value || '') : richHtmlToPlainText(value || '');
  const wordCount = isPlain
    ? plainValue.split(/\s+/).filter(Boolean).length
    : countRichTextWords(value || '');
  const fit = getFitStatus(wordCount, rule);
  const isEmpty = !plainValue.trim();
  const fieldLabel = aiContext.fieldLabel || rule.label;

  const contextLine = [
    aiContext.bookTitle || aiContext.project?.title,
    aiContext.chapterTitle ? `Chapter: ${aiContext.chapterTitle}` : '',
    Number.isFinite(Number(aiContext.pageIndex)) ? `Page ${Number(aiContext.pageIndex) + 1}` : ''
  ].filter(Boolean).join(' · ');

  const openEditor = () => { if (!readOnly) setEditorOpen(true); };
  const handleDone = (nextValue) => {
    setEditorOpen(false);
    onChange?.(nextValue);
    // Flush through the page's autosave path (fields previously saved on blur).
    queueMicrotask(() => onBlur?.());
  };

  // Published / preview mode: only the book itself — words, nothing else.
  if (readOnly) {
    if (isEmpty && emptyInPrint) return null;
    if (isPlain) {
      return (
        <div aria-label={ariaLabel} className={`rich-preview break-words ${className}`} style={style}>
          {plainValue}
        </div>
      );
    }
    return (
      <div
        aria-label={ariaLabel}
        className={`rich-preview break-words ${className}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: normalizeRichHtml(value || '') }}
      />
    );
  }

  return (
    <div className="group/block relative min-w-0">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${ariaLabel} — activate to edit ${fieldLabel}`}
        title={`Edit ${fieldLabel} (fits ${rule.idealMinWords}–${rule.maxWords} words)`}
        onClick={openEditor}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openEditor(); }
        }}
        className="cursor-text rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-amber-600/70 hover:bg-black/[0.03] hover:shadow-[inset_0_0_0_1px_rgba(120,84,20,0.35)]"
      >
        {isEmpty ? (
          <div
            className={`break-words italic opacity-55 ${className}`}
            style={{ minHeight: `${Math.max(2, Number(rows) || 4) * 1.5}em`, ...style }}
          >
            {placeholder || `Tap Edit to write the ${fieldLabel.toLowerCase()}…`}
          </div>
        ) : isPlain ? (
          <div className={`rich-preview break-words ${className}`} style={{ minHeight: '1.5em', ...style }}>
            {plainValue}
          </div>
        ) : (
          <div
            className={`rich-preview break-words ${className}`}
            style={{ minHeight: `${Math.max(2, Number(rows) || 4) * 1.5}em`, ...style }}
            dangerouslySetInnerHTML={{ __html: normalizeRichHtml(value || '') }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={openEditor}
        aria-label={`Edit ${fieldLabel}`}
        title={`Edit ${fieldLabel} — this space fits ${rule.idealMinWords}–${rule.maxWords} words`}
        className="absolute -top-2.5 right-0 z-10 inline-flex min-h-7 items-center gap-1 rounded-full bg-slate-900/85 py-1 pl-2 pr-2.5 text-[10px] font-bold text-amber-50 opacity-90 shadow-md backdrop-blur-[2px] transition hover:bg-slate-900 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:opacity-70 sm:group-hover/block:opacity-100"
      >
        <Pencil className="h-3 w-3" />
        Edit
        {showWordCount && (
          <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: FIT_DOT[fit.status] || FIT_DOT.ideal }} />
            {wordCount}/{rule.maxWords}
          </span>
        )}
      </button>

      {editorOpen && (
        <BlockTextEditor
          open={editorOpen}
          value={isPlain ? plainValue : value}
          plainText={isPlain}
          rule={rule}
          fieldLabel={fieldLabel}
          contextLine={contextLine}
          placeholder={placeholder}
          aiConfigured={aiConfigured}
          aiContext={{ ...aiContext, maxWords: rule.maxWords, idealMinWords: rule.idealMinWords, fieldLabel }}
          onOpenAiSettings={onOpenAiSettings}
          onCancel={() => setEditorOpen(false)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
