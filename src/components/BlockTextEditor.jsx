import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Eraser, Italic, List, ListOrdered,
  LoaderCircle, Redo2, Scissors, Sparkles, SpellCheck, Strikethrough, Underline,
  Undo2, WandSparkles, X
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { buildAiFieldPrompt } from '../data/aiPromptCatalog';
import { getFitStatus } from '../data/slotRules';
import {
  countRichTextWords, getRichTextStats, normalizeRichHtml, plainTextToRichHtml,
  richHtmlToPlainText, sanitizeRichHtml, trimPlainTextToWordLimit, trimRichHtmlToWordLimit
} from '../utils/richText';

const TEXT_COLORS = ['#1E293B', '#7C2D12', '#B45309', '#14532D', '#1D4ED8', '#6D28D9', '#9D174D', '#57534E'];

const FIT_COLORS = {
  empty: '#94A3B8',
  short: '#F0B429',
  ideal: '#34D399',
  nearFull: '#F59E0B',
  over: '#FB7185'
};

/**
 * The one professional editor for every text block on a template page.
 *
 * The page itself stays clean (each block shows only a small Edit button);
 * all tools live here. The editor is built around the block's slot rule:
 * it shows how much text the design space holds, keeps a live fit meter,
 * shortens over-long pastes to the remaining budget, offers "Trim to fit",
 * and refuses to place over-limit text back onto the page. AI actions use
 * the same rule, so generated copy fills the space instead of overflowing.
 */
export default function BlockTextEditor({
  open = true,
  value = '',
  plainText = false,
  rule,
  fieldLabel = 'Page text',
  contextLine = '',
  placeholder = '',
  editorStyle = {},
  aiConfigured = false,
  aiContext = {},
  onOpenAiSettings,
  onCancel,
  onDone
}) {
  const safeRule = rule || {
    label: fieldLabel, formatLabel: 'Page text', guidance: '',
    maxWords: 100, idealMinWords: 40, maxChars: 700, rows: 4,
    singleLine: false, plainText: false, tools: { basic: true, headings: true, lists: true, quote: true, alignment: true, color: true }
  };
  const isPlain = plainText || safeRule.plainText;
  const tools = safeRule.tools || {};

  const initialPlain = isPlain ? String(value || '') : richHtmlToPlainText(value || '');
  const initialWords = initialPlain.split(/\s+/).filter(Boolean).length;

  const [plainDraft, setPlainDraft] = useState(initialPlain);
  const [stats, setStats] = useState(() => getRichTextStats(isPlain ? plainTextToRichHtml(initialPlain) : String(value || '')));
  const [notice, setNotice] = useState('');
  const [aiBusy, setAiBusy] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const initialHtmlRef = useRef(isPlain ? '' : normalizeRichHtml(value || ''));

  const wordCount = isPlain
    ? plainDraft.split(/\s+/).filter(Boolean).length
    : stats.words;
  const fit = useMemo(() => getFitStatus(wordCount, safeRule), [wordCount, safeRule]);
  const overLimit = wordCount > safeRule.maxWords;
  // Legacy text that already overflows may be closed or improved, but the
  // editor never lets a block leave with *more* words than its space holds.
  const canDone = !overLimit || wordCount <= initialWords;

  useEffect(() => {
    if (!open || isPlain) return;
    if (editorRef.current && editorRef.current.innerHTML !== initialHtmlRef.current) {
      editorRef.current.innerHTML = initialHtmlRef.current;
    }
    editorRef.current?.focus();
  }, [open, isPlain]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onCancel?.(); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); handleDone(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  const readRichDraft = () => sanitizeRichHtml(editorRef.current?.innerHTML || '');
  const currentDraftText = () => (isPlain ? plainDraft : richHtmlToPlainText(readRichDraft()));

  const refreshStats = () => {
    if (!isPlain) setStats(getRichTextStats(readRichDraft()));
  };

  const setRichDraft = (html) => {
    if (editorRef.current) editorRef.current.innerHTML = html;
    setStats(getRichTextStats(html));
  };

  const saveSelection = () => {
    const selection = window.getSelection?.();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const applyCommand = (command, argument = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (selectionRef.current) {
      const selection = window.getSelection?.();
      selection?.removeAllRanges();
      selection?.addRange(selectionRef.current);
    }
    if (command === 'foreColor') document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, argument);
    refreshStats();
  };

  const handlePaste = (event) => {
    const pastedHtml = event.clipboardData?.getData('text/html');
    const pastedText = event.clipboardData?.getData('text/plain');
    if (!pastedHtml && !pastedText) return;
    event.preventDefault();
    let insertion = pastedHtml ? sanitizeRichHtml(pastedHtml) : plainTextToRichHtml(pastedText);
    const insertionWords = countRichTextWords(insertion);
    const remaining = safeRule.maxWords - countRichTextWords(readRichDraft());
    if (insertionWords > remaining) {
      insertion = remaining > 0 ? trimRichHtmlToWordLimit(insertion, remaining) : '';
      setNotice(remaining > 0
        ? `That paste was shortened to fit this space (maximum ${safeRule.maxWords} words).`
        : `This space is already full (maximum ${safeRule.maxWords} words), so nothing was pasted.`);
    }
    if (insertion) {
      document.execCommand('insertHTML', false, insertion);
      refreshStats();
    }
  };

  const handlePlainPaste = (event) => {
    const pasted = event.clipboardData?.getData('text/plain');
    if (!pasted) return;
    const pasteWords = pasted.split(/\s+/).filter(Boolean).length;
    if (pasteWords + wordCount <= safeRule.maxWords) return;
    event.preventDefault();
    const remaining = Math.max(0, safeRule.maxWords - wordCount);
    const trimmed = trimPlainTextToWordLimit(pasted, Math.max(1, remaining));
    setPlainDraft((previous) => `${previous} ${trimmed}`.replace(/\s+/g, safeRule.singleLine ? ' ' : '\n').trim());
    setNotice(`That paste was shortened to fit this space (maximum ${safeRule.maxWords} words).`);
  };

  const handleTrimToFit = () => {
    if (isPlain) {
      setPlainDraft((previous) => trimPlainTextToWordLimit(previous, safeRule.maxWords));
    } else {
      setRichDraft(trimRichHtmlToWordLimit(readRichDraft(), safeRule.maxWords));
    }
    setNotice(`Trimmed to the ${safeRule.maxWords}-word space for this block. Read it through before pressing Done.`);
  };

  const handleDone = () => {
    if (!canDone) return;
    if (isPlain) {
      const cleaned = safeRule.singleLine
        ? plainDraft.replace(/\s+/g, ' ').trim()
        : plainDraft.trim();
      onDone?.(cleaned);
    } else {
      onDone?.(readRichDraft());
    }
  };

  const runAi = async (action) => {
    setAiBusy(action);
    setAiError('');
    setAiResult(null);
    try {
      const draftText = currentDraftText();
      let prompt;
      if (action === 'write') {
        prompt = buildAiFieldPrompt({
          ...aiContext,
          fieldLabel,
          maxWords: safeRule.maxWords,
          idealMinWords: safeRule.idealMinWords,
          currentText: draftText
        });
      } else {
        const instructions = {
          improve: 'Improve the wording: clearer, more polished, same meaning and same facts. Do not add new facts, names, dates, or claims.',
          shorten: `Shorten the text to between ${safeRule.idealMinWords} and ${safeRule.maxWords} words so it fits its space on the page. Keep the most important points and natural sentence endings.`,
          grammar: 'Fix spelling, grammar, and punctuation only. Keep the author’s words, voice, and order wherever they are already correct.'
        }[action];
        prompt = [
          `Book: ${aiContext.bookTitle || aiContext.project?.title || 'the current book'}`,
          `Page block: ${fieldLabel} (${safeRule.formatLabel})`,
          `Block guidance: ${safeRule.guidance}`,
          `Task: ${instructions}`,
          `Hard limit: no more than ${safeRule.maxWords} words.`,
          'Return only the revised text — no label, explanation, or Markdown fence.',
          '',
          'Text to revise:',
          draftText
        ].join('\n');
      }
      const data = await apiRequest('/api/ai/generate', {
        method: 'POST',
        body: { prompt, maxWords: safeRule.maxWords }
      });
      setAiResult(data);
    } catch (error) {
      setAiError(error.message || 'AI writing failed. Check your provider settings and try again.');
    } finally {
      setAiBusy('');
    }
  };

  const applyAiResult = (mode) => {
    if (!aiResult?.text) return;
    const text = trimPlainTextToWordLimit(aiResult.text, safeRule.maxWords);
    if (isPlain) {
      setPlainDraft(mode === 'append' ? `${plainDraft} ${text}`.trim() : text);
    } else if (mode === 'append') {
      const current = readRichDraft();
      setRichDraft(current.trim() ? `${current}<p></p>${plainTextToRichHtml(text)}` : plainTextToRichHtml(text));
    } else {
      setRichDraft(plainTextToRichHtml(text));
    }
    setAiResult(null);
  };

  const toolButton = (label, Icon, onPress, { disabled = false } = {}) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => { event.preventDefault(); saveSelection(); }}
      onClick={onPress}
      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition hover:border-amber-600 hover:text-amber-800 disabled:opacity-40 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const dialog = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !aiBusy) onCancel?.(); }}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-editor-title"
        className="relative z-10 flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#F7F3EC] shadow-2xl dark:border-stone-700 dark:bg-[#171410]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4 dark:border-stone-700">
          <div className="min-w-0">
            <h2 id="block-editor-title" className="text-base font-extrabold text-stone-900 dark:text-stone-50 sm:text-lg">
              Edit · {fieldLabel}
            </h2>
            {contextLine && <p className="mt-0.5 truncate text-[11px] text-stone-500 dark:text-stone-400">{contextLine}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="rounded-full bg-amber-800 px-2 py-1 uppercase tracking-wide text-amber-50">{safeRule.formatLabel}</span>
              <span className="rounded-full border border-stone-300 px-2 py-1 text-stone-600 dark:border-stone-600 dark:text-stone-300">
                Fits best: {safeRule.idealMinWords}–{safeRule.maxWords} words
              </span>
              <span className="rounded-full border border-stone-300 px-2 py-1 text-stone-600 dark:border-stone-600 dark:text-stone-300">
                Maximum {safeRule.maxWords} words · about {safeRule.rows} line{safeRule.rows === 1 ? '' : 's'} on the page
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={Boolean(aiBusy)}
            aria-label="Close editor without saving"
            className="shrink-0 rounded-xl p-2 text-stone-500 hover:bg-stone-200/70 disabled:opacity-40 dark:hover:bg-stone-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {/* Fit meter: the block's space budget at a glance */}
          <div className="space-y-1.5" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
              <span className={overLimit ? 'text-rose-700 dark:text-rose-300' : 'text-stone-600 dark:text-stone-300'}>
                {fit.label}
              </span>
              <span className="text-stone-500 dark:text-stone-400">
                {wordCount} / {safeRule.maxWords} words
                {!isPlain && ` · ${stats.characters} characters`}
                {isPlain && ` · ${plainDraft.length} characters`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700" role="progressbar" aria-valuemin={0} aria-valuemax={safeRule.maxWords} aria-valuenow={Math.min(wordCount, safeRule.maxWords)} aria-label="How full this page space is">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, fit.percent)}%`, backgroundColor: FIT_COLORS[fit.status] || FIT_COLORS.ideal }}
              />
            </div>
            {safeRule.guidance && (
              <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{safeRule.guidance}</p>
            )}
          </div>

          {notice && (
            <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {notice}
            </p>
          )}

          {/* Formatting tools live here — never on the printed page */}
          {!isPlain && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-100/80 p-2 dark:border-stone-700 dark:bg-stone-900/60" role="toolbar" aria-label="Formatting tools">
              {toolButton('Undo', Undo2, () => applyCommand('undo'))}
              {toolButton('Redo', Redo2, () => applyCommand('redo'))}
              <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-stone-300 dark:bg-stone-600" />
              {(tools.headings || tools.quote) && (
                <>
                  <label className="sr-only" htmlFor="block-editor-style">Paragraph style</label>
                  <select
                    id="block-editor-style"
                    aria-label="Paragraph style"
                    defaultValue="P"
                    onChange={(event) => applyCommand('formatBlock', event.target.value)}
                    className="min-h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs font-bold text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                  >
                    <option value="P">Normal text</option>
                    {tools.headings && <option value="H2">Heading</option>}
                    {tools.headings && <option value="H3">Small heading</option>}
                    {tools.quote && <option value="BLOCKQUOTE">Quote</option>}
                  </select>
                  <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-stone-300 dark:bg-stone-600" />
                </>
              )}
              {tools.basic && toolButton('Bold', Bold, () => applyCommand('bold'))}
              {tools.basic && toolButton('Italic', Italic, () => applyCommand('italic'))}
              {tools.basic && toolButton('Underline', Underline, () => applyCommand('underline'))}
              {tools.basic && toolButton('Strikethrough', Strikethrough, () => applyCommand('strikeThrough'))}
              {tools.lists && <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-stone-300 dark:bg-stone-600" />}
              {tools.lists && toolButton('Bullet list', List, () => applyCommand('insertUnorderedList'))}
              {tools.lists && toolButton('Numbered list', ListOrdered, () => applyCommand('insertOrderedList'))}
              {tools.alignment && <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-stone-300 dark:bg-stone-600" />}
              {tools.alignment && toolButton('Align text left', AlignLeft, () => applyCommand('justifyLeft'))}
              {tools.alignment && toolButton('Align text center', AlignCenter, () => applyCommand('justifyCenter'))}
              {tools.alignment && toolButton('Align text right', AlignRight, () => applyCommand('justifyRight'))}
              {tools.color && (
                <>
                  <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-stone-300 dark:bg-stone-600" />
                  <span className="inline-flex items-center gap-1" role="group" aria-label="Text color">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Text color ${color}`}
                        title="Text color"
                        onMouseDown={(event) => { event.preventDefault(); saveSelection(); }}
                        onClick={() => applyCommand('foreColor', color)}
                        className="h-5 w-5 rounded-full border border-black/20 shadow-sm transition hover:scale-110"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="Custom text color"
                      defaultValue="#1E293B"
                      onMouseDown={saveSelection}
                      onChange={(event) => applyCommand('foreColor', event.target.value)}
                      className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </span>
                </>
              )}
              <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-stone-300 dark:bg-stone-600" />
              {toolButton('Clear formatting', Eraser, () => { applyCommand('removeFormat'); applyCommand('formatBlock', 'P'); })}
            </div>
          )}

          {/* The paper */}
          {isPlain ? (
            <textarea
              aria-label={`${fieldLabel} text`}
              value={plainDraft}
              rows={safeRule.singleLine ? 2 : Math.min(10, Math.max(3, safeRule.rows))}
              placeholder={placeholder || `Type the ${fieldLabel.toLowerCase()} here…`}
              onChange={(event) => setPlainDraft(safeRule.singleLine ? event.target.value.replace(/\n+/g, ' ') : event.target.value)}
              onPaste={handlePlainPaste}
              spellCheck="true"
              className="document-editor-paper w-full resize-y rounded-2xl border border-stone-300 bg-white px-5 py-4 shadow-inner outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200 dark:border-stone-600 dark:bg-[#211D17]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: safeRule.singleLine ? '1.25rem' : '1.05rem', lineHeight: 1.6, ...editorStyle }}
            />
          ) : (
            <div
              ref={editorRef}
              role="textbox"
              aria-multiline="true"
              aria-label={`${fieldLabel} editor`}
              aria-placeholder={placeholder}
              contentEditable
              suppressContentEditableWarning
              spellCheck="true"
              data-placeholder={placeholder || `Start typing the ${fieldLabel.toLowerCase()}…`}
              onInput={refreshStats}
              onPaste={handlePaste}
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              className="document-editor-surface w-full overflow-y-auto rounded-2xl border border-stone-300 bg-white px-5 py-4 shadow-inner outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200 dark:border-stone-600 dark:bg-[#211D17]"
              style={{ minHeight: `${Math.min(22, Math.max(8, safeRule.rows + 2)) * 1.6}em`, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.05rem', lineHeight: 1.65, ...editorStyle }}
            />
          )}

          {/* AI writing desk — same space rules as typing */}
          <section className="rounded-2xl border border-stone-200 bg-stone-100/80 p-3 dark:border-stone-700 dark:bg-stone-900/60" aria-label="AI writing help">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-stone-700 dark:text-stone-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-700" /> Writing help
              </h3>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">Always written to fit: {safeRule.idealMinWords}–{safeRule.maxWords} words</span>
            </div>
            {aiConfigured ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" disabled={Boolean(aiBusy)} onClick={() => runAi('write')} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-amber-800 px-3 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50">
                  {aiBusy === 'write' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}
                  Write with AI
                </button>
                <button type="button" disabled={Boolean(aiBusy) || wordCount === 0} onClick={() => runAi('improve')} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-amber-600 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
                  {aiBusy === 'improve' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Improve my wording
                </button>
                <button type="button" disabled={Boolean(aiBusy) || wordCount === 0} onClick={() => runAi('shorten')} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-amber-600 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
                  {aiBusy === 'shorten' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
                  Make it fit
                </button>
                <button type="button" disabled={Boolean(aiBusy) || wordCount === 0} onClick={() => runAi('grammar')} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-amber-600 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
                  {aiBusy === 'grammar' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <SpellCheck className="h-3.5 w-3.5" />}
                  Fix spelling &amp; grammar
                </button>
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                AI is not connected yet. You can write and format everything yourself here
                {onOpenAiSettings ? (
                  <>
                    {' '}— or{' '}
                    <button type="button" onClick={onOpenAiSettings} className="font-bold text-amber-800 underline underline-offset-2 dark:text-amber-300">connect an AI provider</button>
                    {' '}to have drafts written to fit this space.
                  </>
                ) : '.'}
              </p>
            )}
            {aiError && <p role="alert" className="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{aiError}</p>}
            {aiResult && (
              <div className="mt-3 space-y-2 rounded-xl border border-amber-300 bg-white p-3 dark:border-amber-800 dark:bg-[#211D17]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-stone-500 dark:text-stone-400">
                  <span>Suggestion · {aiResult.providerName} · {aiResult.model}</span>
                  <span>{aiResult.wordCount} / {safeRule.maxWords} words</span>
                </div>
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-stone-800 dark:text-stone-100" style={{ fontFamily: 'Georgia, serif' }}>{aiResult.text}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => applyAiResult('replace')} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-700 dark:bg-amber-800">Use this instead</button>
                  <button type="button" onClick={() => applyAiResult('append')} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-amber-600 dark:border-stone-600 dark:text-stone-200">Add after my text</button>
                  <button type="button" onClick={() => setAiResult(null)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">Dismiss</button>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3.5 dark:border-stone-700">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400">
            {!isPlain && <span>{stats.sentences} sentence{stats.sentences === 1 ? '' : 's'} · ~{stats.readingSeconds}s reading time</span>}
            <span>Ctrl+Enter to finish · Esc to cancel</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {overLimit && (
              <button type="button" onClick={handleTrimToFit} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 text-xs font-bold text-rose-800 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                <Scissors className="h-3.5 w-3.5" /> Trim to fit
              </button>
            )}
            <button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-4 text-xs font-bold text-stone-600 transition hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={!canDone}
              title={canDone ? 'Place this text on the page' : `Too long for this space — remove ${wordCount - safeRule.maxWords} words or use Trim to fit`}
              className="min-h-10 rounded-xl bg-amber-800 px-5 text-sm font-extrabold text-white shadow transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Done — put on page
            </button>
          </div>
        </footer>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
