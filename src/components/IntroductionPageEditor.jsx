import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Feather, LoaderCircle } from 'lucide-react';
import RichTextField from './RichTextField';
import { countRichTextWords, richHtmlToPlainText } from '../utils/richText';

/**
 * Full-page Introduction editor — the missing front-of-book page where the
 * author writes words of expression, dedications, epigraph-style thoughts, etc.
 * The page frame follows the chosen template's palette and border treatment so
 * it matches every other page in the book.
 */
export default function IntroductionPageEditor({
  project,
  visualTemplate,
  fontFamily = '',
  aiConfigured = false,
  introduction = { title: '', contentHtml: '' },
  onUpdateProject,
  onRegisterFlush,
  notify,
  editable = true,
  aiContextProject = undefined
}) {
  const tpl = visualTemplate || {};
  const palette = {
    pageBg: tpl.pageBg || '#FCF8F1',
    pageText: tpl.pageText || '#263142',
    border: tpl.borderColor || '#B68745',
    accent: tpl.accentColor || tpl.borderColor || '#8F6534',
    font: fontFamily || tpl.fontFamily || 'Georgia, serif'
  };
  const borderStyle = tpl.borderStyle || 'double-gold';

  const [draftTitle, setDraftTitle] = useState(introduction?.title || 'Introduction');
  const [draftHtml, setDraftHtml] = useState(introduction?.contentHtml || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const introRef = useRef({ title: draftTitle, contentHtml: draftHtml });
  const dirtyRef = useRef(false);

  // Latest draft for flush functions invoked by the parent on navigation.
  introRef.current = { title: draftTitle, contentHtml: draftHtml };
  dirtyRef.current = hasChanges;

  const saveIntro = useCallback(async () => {
    if (!dirtyRef.current || !onUpdateProject) return;
    setSaving(true);
    try {
      await onUpdateProject({ introduction: { title: introRef.current.title, contentHtml: introRef.current.contentHtml } });
      setHasChanges(false);
      dirtyRef.current = false;
    } catch (error) {
      notify?.(error?.message || 'Could not save the introduction page. Please try again.', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  }, [onUpdateProject, notify]);

  const saveRef = useRef(saveIntro);
  saveRef.current = saveIntro;

  // Parent registers this flush so switching chapters / leaving the studio
  // persists pending introduction edits first.
  useEffect(() => {
    if (!onRegisterFlush) return undefined;
    onRegisterFlush(() => saveRef.current());
    return () => onRegisterFlush(null);
  }, [onRegisterFlush]);

  // Sync when the saved introduction changes from the outside (e.g. after reload)
  // without clobbering local typing.
  const savedSignature = `${introduction?.title || ''}\u0000${introduction?.contentHtml || ''}`;
  const lastSavedRef = useRef(savedSignature);
  useEffect(() => {
    if (savedSignature !== lastSavedRef.current) {
      lastSavedRef.current = savedSignature;
      if (!dirtyRef.current) {
        setDraftTitle(introduction?.title || 'Introduction');
        setDraftHtml(introduction?.contentHtml || '');
      }
    }
  }, [savedSignature, introduction?.title, introduction?.contentHtml]);

  const frameBorder =
    borderStyle === 'double-gold'
      ? `4px double ${palette.border}`
      : borderStyle === 'rounded-frame'
        ? `3px solid ${palette.border}`
        : borderStyle === 'dashed-accent'
          ? `3px dashed ${palette.border}`
          : `2px solid ${palette.border}`;

  const headingBlock = (() => {
    if (borderStyle === 'top-banner' || tpl.headingStyle === 'top-banner') {
      return (
        <div
          className="mb-6 text-center"
          style={{ background: palette.accent, color: '#FFFFFF', padding: '0.7em 1em', borderRadius: '8px' }}
        >
          <input
            value={draftTitle}
            onChange={(e) => { setDraftTitle(e.target.value); setHasChanges(true); }}
            readOnly={!editable}
            aria-label="Introduction page heading"
            className="w-full bg-transparent text-center text-2xl font-bold italic outline-none sm:text-3xl"
            style={{ color: 'inherit', fontFamily: palette.font }}
          />
        </div>
      );
    }
    if (borderStyle === 'centered-pill' || tpl.headingStyle === 'centered-pill') {
      return (
        <div className="mb-6 flex justify-center">
          <input
            value={draftTitle}
            onChange={(e) => { setDraftTitle(e.target.value); setHasChanges(true); }}
            readOnly={!editable}
            aria-label="Introduction page heading"
            className="text-center text-2xl font-bold italic outline-none sm:text-3xl"
            style={{
              color: palette.accent,
              fontFamily: palette.font,
              border: `2px solid ${palette.accent}`,
              borderRadius: '999px',
              padding: '0.35em 1.1em',
              background: `${palette.accent}10`
            }}
          />
        </div>
      );
    }
    // underline-bar (default) and clean-line: centered heading with a rule beneath
    return (
      <div className="mb-6 text-center">
        <input
          value={draftTitle}
          onChange={(e) => { setDraftTitle(e.target.value); setHasChanges(true); }}
          readOnly={!editable}
          aria-label="Introduction page heading"
          className="w-full bg-transparent text-center text-2xl font-bold italic outline-none sm:text-3xl"
          style={{ color: palette.accent, fontFamily: palette.font }}
        />
        <div
          className="mx-auto mt-3"
          style={{ width: '38%', height: '4px', background: palette.accent, borderRadius: '2px' }}
          aria-hidden="true"
        />
      </div>
    );
  })();

  const wordCount = countRichTextWords(draftHtml);
  const plainPreview = richHtmlToPlainText(draftHtml).trim();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold uppercase tracking-widest" style={{ color: palette.accent }}>
          <Feather className="mr-2 inline h-4 w-4" aria-hidden="true" />
          Introduction page · front of book
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: palette.pageText, opacity: 0.75 }}>
          <span>{wordCount} word{wordCount === 1 ? '' : 's'}</span>
          {editable ? (
            <button
              type="button"
              onClick={() => saveIntro().catch(() => {})}
              disabled={!hasChanges || saving}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-bold uppercase tracking-wider transition disabled:opacity-40"
              style={{
                background: hasChanges ? palette.accent : `${palette.accent}22`,
                color: hasChanges ? '#FFFFFF' : palette.accent
              }}
            >
              {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {hasChanges ? 'Save Introduction' : 'Saved'}
            </button>
          ) : null}
        </div>
      </div>

      {/* The full page — template-themed background, text colour, border and font */}
      <div
        style={{
          background: palette.pageBg,
          color: palette.pageText,
          border: frameBorder,
          borderRadius: borderStyle === 'rounded-frame' ? '22px' : '10px',
          padding: 'clamp(1.5rem, 4vw, 3.5rem)',
          minHeight: '60vh',
          fontFamily: palette.font,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
        }}
      >
        {headingBlock}
        <RichTextField
          value={draftHtml}
          onChange={(html) => { setDraftHtml(html); setHasChanges(true); }}
          onBlur={() => { if (dirtyRef.current) saveIntro().catch(() => {}); }}
          readOnly={!editable}
          placeholder="Write your words of expression here — a dedication, an opening note to the reader, who this book is for, and why it matters…"
          rows={16}
          ariaLabel="Introduction page text editor"
          aiConfigured={aiConfigured}
          aiContext={{
            categoryId: project?.publicationType || project?.bookType || 'photobook',
            fieldKey: 'introduction',
            fieldLabel: 'Introduction page (words of expression)',
            maxWords: 500,
            project: aiContextProject !== undefined ? aiContextProject : project
          }}
          style={{ minHeight: '45vh', fontFamily: palette.font }}
        />
        {!plainPreview && editable ? (
          <p className="mt-4 text-center text-xs italic opacity-60">
            This page sits between the title page and Chapter 1 in DOCX, PDF and EPUB exports.
          </p>
        ) : null}
      </div>
    </div>
  );
}
