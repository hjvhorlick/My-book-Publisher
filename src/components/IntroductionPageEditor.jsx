import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Feather, LoaderCircle } from 'lucide-react';
import RichTextField from './RichTextField';
import { PageFrame, OrnamentDivider, PageNumberLine } from './DesignFrame';
import { resolveTemplateDesign, headingTreatment, withAlpha, mutedInk, isDark } from '../data/designSystem';
import { getTextSlotRule } from '../data/slotRules';
import { countRichTextWords, richHtmlToPlainText } from '../utils/richText';

/**
 * Full-page Introduction editor — the front-of-book page where the author
 * writes their words of expression, dedications, and opening notes.
 *
 * The page is drawn with the same design system as every chapter page
 * (template page tint, chosen page border, heading treatment, ornament and
 * page-number style). Typing surfaces are high-contrast by design: the
 * heading and body use contrast-checked ink, a visible field surface and a
 * readable placeholder, so what is being typed is never faint — whatever
 * palette the template uses.
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
  const design = resolveTemplateDesign(
    visualTemplate,
    project?.coverConfig?.design || {},
    { fontFamily: fontFamily || project?.coverConfig?.fontFamily || visualTemplate?.fontFamily }
  );
  const treatment = headingTreatment(design);

  const categoryId = project?.publicationType || project?.bookType || 'photobook';
  // A full page of prose, not a small caption box: 18 lines of reading space.
  const bodyRule = getTextSlotRule({
    categoryId,
    fieldKey: 'introduction',
    rows: 18,
    maxWords: 700,
    fieldLabel: 'Introduction page'
  });

  const [draftTitle, setDraftTitle] = useState(introduction?.title || 'Introduction');
  const [draftHtml, setDraftHtml] = useState(introduction?.contentHtml || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const introRef = useRef({ title: draftTitle, contentHtml: draftHtml });
  const dirtyRef = useRef(false);

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

  useEffect(() => {
    if (!onRegisterFlush) return undefined;
    onRegisterFlush(() => saveRef.current());
    return () => onRegisterFlush(null);
  }, [onRegisterFlush]);

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

  const wordCount = countRichTextWords(draftHtml);
  const plainPreview = richHtmlToPlainText(draftHtml).trim();

  // Field surfaces: a readable tint of the page, contrast-checked ink.
  const fieldInk = design.bodyText;
  const fieldMuted = mutedInk(design.pageText, design.pageBg, { min: 4.2, weight: 0.55 });
  // On a dark page tint the typing surface is a light wash over the page;
  // on a light tint it is a soft white card. Either way the text is opaque.
  const darkSurface = isDark(design.pageBg);
  const fieldVars = {
    '--fq-field-ink': fieldInk,
    '--fq-field-muted': fieldMuted,
    '--fq-field-border': withAlpha(design.pageText, 0.22),
    '--fq-field-focus': withAlpha(design.accentInk, 0.35),
    '--fq-field-bg': darkSurface ? withAlpha('#FFFFFF', 0.1) : withAlpha('#FFFFFF', 0.62),
    '--fq-field-bg-hover': darkSurface ? withAlpha('#FFFFFF', 0.16) : withAlpha('#FFFFFF', 0.85),
    '--fq-field-bg-focus': darkSurface ? withAlpha('#FFFFFF', 0.2) : '#FFFFFF'
  };

  const kickerLabel = templateKicker(design);

  const titleField = editable ? (
    <input
      value={draftTitle}
      onChange={(event) => { setDraftTitle(event.target.value); setHasChanges(true); }}
      onBlur={() => { if (dirtyRef.current) saveIntro().catch(() => {}); }}
      aria-label="Introduction page heading"
      className="fq-page-field text-center text-2xl font-bold sm:text-3xl"
      style={{
        ...fieldVars,
        fontFamily: treatment.titleStyle.fontFamily,
        color: treatment.titleStyle.color,
        background: 'transparent',
        borderColor: 'transparent',
        borderRadius: 8
      }}
      placeholder="Introduction"
    />
  ) : (
    <h2
      className="m-0 text-center text-2xl font-bold sm:text-3xl"
      style={{ color: treatment.titleStyle.color, fontFamily: treatment.titleStyle.fontFamily, textTransform: treatment.titleTransform }}
    >
      {draftTitle || 'Introduction'}
    </h2>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold uppercase tracking-widest" style={{ color: '#F5C451' }}>
          <Feather className="mr-2 inline h-4 w-4" aria-hidden="true" />
          Introduction page · front of book
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#F3D78B' }}>
          <span>{wordCount} / {bodyRule.maxWords} words</span>
          {editable ? (
            <button
              type="button"
              onClick={() => saveIntro().catch(() => {})}
              disabled={!hasChanges || saving}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 py-1.5 font-bold uppercase tracking-wider transition disabled:opacity-40"
              style={{
                background: hasChanges ? 'linear-gradient(180deg, #FCE38A 0%, #E5B84B 100%)' : 'rgba(6, 17, 40, 0.85)',
                color: hasChanges ? '#061128' : '#FDE08D',
                border: '1px solid rgba(229, 184, 75, 0.7)'
              }}
            >
              {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {hasChanges ? 'Save Introduction' : 'Saved'}
            </button>
          ) : null}
        </div>
      </div>

      {/* The full page, drawn with the book's own design system */}
      <PageFrame
        design={design}
        aria-label="Introduction page preview"
        className="shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
        contentStyle={{ padding: 'clamp(1.5rem, 4vw, 3.4rem)' }}
        dataPageKind="introduction"
      >
        <div className="relative z-10">
          {design.kicker ? (
            <div
              className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: treatment.kickerColor }}
            >
              {kickerLabel}
            </div>
          ) : null}

          <div className="mx-auto max-w-2xl text-center">
            {titleField}
            <OrnamentDivider design={design} width={180} className="mt-3" />
          </div>

          <div
            className="mx-auto mt-7 max-w-2xl"
            style={{
              fontFamily: design.fontStack,
              color: design.bodyText
            }}
          >
            <RichTextField
              value={draftHtml}
              onChange={(html) => { setDraftHtml(html); setHasChanges(true); }}
              onBlur={() => { if (dirtyRef.current) saveIntro().catch(() => {}); }}
              readOnly={!editable}
              placeholder="Write your words of expression here — a dedication, an opening note to the reader, who this book is for, and why it matters…"
              rows={18}
              rule={bodyRule}
              ariaLabel="Introduction page text editor"
              aiConfigured={aiConfigured}
              showWordCount={false}
              className="text-base leading-relaxed"
              style={{
                ...fieldVars,
                minHeight: '42vh',
                fontFamily: design.fontStack,
                color: design.bodyText,
                fontSize: 'clamp(0.98rem, 1.4vw, 1.12rem)',
                lineHeight: 1.75
              }}
              aiContext={{
                categoryId,
                fieldKey: 'introduction',
                fieldLabel: 'Introduction page (words of expression)',
                maxWords: bodyRule.maxWords,
                project: aiContextProject !== undefined ? aiContextProject : project
              }}
            />

            {!plainPreview && editable ? (
              <p
                className="mt-5 text-center text-xs italic"
                style={{ color: fieldMuted }}
              >
                This page sits between the title page and Chapter 1 in DOCX, PDF and EPUB exports.
              </p>
            ) : null}
          </div>

          <PageNumberLine design={design} pageIndex={0} className="mt-8" />
        </div>
      </PageFrame>
    </div>
  );
}

function templateKicker(design) {
  const category = design?.categoryId;
  if (category === 'cookbook') return 'A NOTE FROM THE KITCHEN';
  if (category === 'magazine') return 'FROM THE EDITOR';
  if (category === 'storybook') return 'BEFORE WE BEGIN';
  if (category === 'informational') return 'BEFORE YOU START';
  if (category === 'photobook') return 'A NOTE BEFORE THE ALBUM';
  return 'INTRODUCTION';
}
