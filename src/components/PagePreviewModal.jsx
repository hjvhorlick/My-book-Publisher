import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, Eye, PencilLine, X } from 'lucide-react';

/**
 * A calm, read-only look at the page being written — opened from the
 * Preview button beside Save Page. It renders the exact finished page
 * (words, photos and page furniture only, no editing tools) from the
 * editor's current draft, so the author can judge the page before saving.
 * Opening or closing this preview never saves anything.
 */
export default function PagePreviewModal({
  open = false,
  heading = 'Page preview',
  subheading = '',
  saving = false,
  onClose,
  onSave,
  description,
  footerNote,
  children
}) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[72] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-preview-title"
        className="relative z-10 flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: 'linear-gradient(155deg, #0D234C 0%, #081838 58%, #050F26 100%)',
          border: '2px solid rgba(229, 184, 75, 0.68)',
          color: '#FDE08D'
        }}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(229, 184, 75, 0.35)' }}>
          <div className="min-w-0">
            <h2 id="page-preview-title" className="flex items-center gap-2 text-base font-extrabold sm:text-lg">
              <Eye className="h-5 w-5 shrink-0 text-[#F5C451]" aria-hidden="true" />
              <span className="truncate">{heading}</span>
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed sm:text-xs" style={{ color: '#F3D78B' }}>
              {subheading ? `${subheading} — ` : ''}
              {description || 'this is your finished page exactly as readers will see it. Previewing has not saved anything; if you like how it looks, choose Save Page.'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close page preview"
            className="shrink-0 rounded-xl p-2 transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE08D]"
            style={{ color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.5)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {children}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(229, 184, 75, 0.35)' }}>
          <span className="text-[11px]" style={{ color: '#F3D78B' }}>
            {footerNote || 'Nothing is final yet — go back and adjust anything, then preview again.'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE08D]"
              style={{ backgroundColor: 'rgba(6, 17, 40, 0.85)', color: '#FDE08D', border: '1.5px solid rgba(229, 184, 75, 0.58)' }}
            >
              <PencilLine className="h-4 w-4 text-[#F5C451]" aria-hidden="true" />
              <span>Back to editing</span>
            </button>
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                aria-busy={saving}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE08D]"
                style={{
                  background: 'linear-gradient(180deg, #FCE38A 0%, #E5B84B 52%, #C49122 100%)',
                  color: '#061128',
                  border: '2px solid #FFF3B8'
                }}
              >
                <Check className="h-4 w-4 text-[#061128]" aria-hidden="true" />
                <span>{saving ? 'Saving…' : 'Save Page'}</span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
