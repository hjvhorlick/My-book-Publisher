import React from 'react';
import {
  resolveTemplateDesign,
  getPageBorderStyle,
  withAlpha
} from '../data/designSystem';

/**
 * Read-only cover renderer shared by the Cover editor preview and the
 * Export/Publish reader. Renders:
 *  - background image (data URL or /sample-artwork path) with optional dim overlay
 *  - word-art book title: NO background, only a narrow outline around each letter
 *  - a short piece of wording from the author (blurb)
 *  - the author's name
 *  - optional author photo (yes/no)
 *  - template-themed frame (border + palette) so the cover matches the book theme.
 */
export default function CoverArtwork({
  project,
  coverConfig = {},
  visualTemplate,
  trimSize = '6x9',
  className = '',
  editable = false
}) {
  const cfg = coverConfig || {};
  const tpl = visualTemplate || {};
  const wordArt = cfg.wordArt || {};

  // The cover follows the same design system as the pages: the chosen page
  // border, border colour and ornament, plus the book-wide font.
  const design = resolveTemplateDesign(
    { ...tpl, pageBg: cfg.pageBg || tpl.pageBg, pageText: cfg.pageText || tpl.pageText, borderColor: cfg.borderColor || tpl.borderColor, accentColor: cfg.accentColor || tpl.accentColor },
    cfg.design || {},
    { fontFamily: cfg.fontFamily || tpl.fontFamily }
  );
  const borderLayers = getPageBorderStyle(design.pageBorderId).layers || [];
  const coverCorners = borderLayers.find((layer) => layer.kind === 'corners');
  const coverBand = borderLayers.find((layer) => layer.kind === 'band' && layer.edge === 'top');

  const pageBg = design.pageBg || '#111827';
  const pageText = design.bodyText || '#FFFFFF';
  const borderColor = design.borderInk || '#D4AF37';
  const accentColor = design.accentInk || '#D4AF37';
  const fontFamily = design.fontFamily || 'Georgia, serif';
  const fontStack = design.fontStack;
  const borderStyle = cfg.borderStyle || tpl.borderStyle || 'double-gold';

  const [w, h] = String(trimSize || '6x9').split('x').map((n) => parseFloat(n) || 6);
  const aspectRatio = `${w} / ${h}`;

  const coverImage = cfg.coverImage || '';
  const overlay = Number.isFinite(Number(cfg.coverOverlay)) ? Math.min(0.7, Math.max(0, Number(cfg.coverOverlay))) : 0.3;
  const title = String(wordArt.text ?? project?.title ?? '').trim() || 'Untitled Book';
  const blurb = String(cfg.coverBlurb || '').trim();
  const authorName = String(cfg.coverAuthorName || project?.authorName || project?.author_name || '').trim();
  const showAuthorPhoto = Boolean(cfg.showAuthorPhoto);
  const authorPhotoUrl = String(cfg.authorPhotoUrl || '');

  const fillMode = wordArt.fillMode === 'solid' ? 'solid' : 'none';
  const strokeColor = wordArt.strokeColor || '#FDE08D';
  const strokeWidth = Number.isFinite(Number(wordArt.strokeWidth)) ? Math.max(0.5, Number(wordArt.strokeWidth)) : 1.5;
  const fillColor = wordArt.fillColor || accentColor;

  const frameBorder =
    borderStyle === 'double-gold'
      ? `4px double ${borderColor}`
      : borderStyle === 'rounded-frame'
        ? `3px solid ${borderColor}`
        : borderStyle === 'dashed-accent'
          ? `3px dashed ${borderColor}`
          : `2px solid ${borderColor}`;

  const wordArtStyle = {
    fontFamily: fontStack,
    color: fillMode === 'solid' ? fillColor : 'transparent',
    WebkitTextStroke: fillMode === 'solid' ? undefined : `${strokeWidth}px ${strokeColor}`,
    // Outline-only text stays readable over photos with a soft shadow, never a filled box.
    textShadow: fillMode === 'solid'
      ? '0 2px 10px rgba(0,0,0,0.55)'
      : '0 2px 10px rgba(0,0,0,0.45)',
    lineHeight: 1.08,
    letterSpacing: '0.02em',
    overflowWrap: 'anywhere'
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        containerType: 'inline-size',
        aspectRatio,
        background: pageBg,
        border: frameBorder,
        borderRadius: borderStyle === 'rounded-frame' ? '20px' : '10px',
        color: pageText
      }}
      data-cover-artwork={editable ? 'editable' : 'read-only'}
    >
      {coverImage ? (
        <img
          src={coverImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {coverImage && overlay > 0 ? (
        <div
          className="absolute inset-0"
          style={{ background: `rgba(0,0,0,${overlay})` }}
          aria-hidden="true"
        />
      ) : null}

      {/* Decorative frame: the page border chosen for this book */}
      <div
        className="pointer-events-none absolute"
        style={{
          inset: '2.4cqw',
          border: borderStyle === 'double-gold' ? `0.6cqw double ${borderColor}` : `0.35cqw solid ${accentColor}`,
          opacity: 0.9,
          borderRadius: borderStyle === 'rounded-frame' ? '12px' : '4px'
        }}
        aria-hidden="true"
      />
      {borderLayers.length > 1 ? (
        <div
          className="pointer-events-none absolute"
          style={{
            inset: '4.2cqw',
            border: `0.15cqw solid ${withAlpha(borderColor, 0.55)}`,
            borderRadius: 4
          }}
          aria-hidden="true"
        />
      ) : null}
      {coverCorners ? (
        <>
          <span className="pointer-events-none absolute" style={{ top: '2.9cqw', left: '3.1cqw', color: accentColor, fontSize: '2.6cqw', lineHeight: 1 }} aria-hidden="true">{coverCorners.glyph}</span>
          <span className="pointer-events-none absolute" style={{ top: '2.9cqw', right: '3.1cqw', color: accentColor, fontSize: '2.6cqw', lineHeight: 1 }} aria-hidden="true">{coverCorners.glyph}</span>
          <span className="pointer-events-none absolute" style={{ bottom: '2.9cqw', left: '3.1cqw', color: accentColor, fontSize: '2.6cqw', lineHeight: 1 }} aria-hidden="true">{coverCorners.glyph}</span>
          <span className="pointer-events-none absolute" style={{ bottom: '2.9cqw', right: '3.1cqw', color: accentColor, fontSize: '2.6cqw', lineHeight: 1 }} aria-hidden="true">{coverCorners.glyph}</span>
        </>
      ) : null}
      {coverBand ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: '1.6cqw', background: accentColor, opacity: 0.92 }}
          aria-hidden="true"
        />
      ) : null}

      <div className="relative flex h-full flex-col items-center justify-between text-center" style={{ padding: '7cqw 6cqw' }}>
        <div style={{ minHeight: '2cqw' }} aria-hidden="true" />

        {/* Word-art book title — outline letters, no background box */}
        <h2
          className="m-0 uppercase"
          style={{
            ...wordArtStyle,
            fontSize: 'clamp(28px, 11cqw, 120px)',
            textTransform: wordArt.uppercase === false ? 'none' : 'uppercase',
            padding: 0,
            background: 'none'
          }}
        >
          {title}
        </h2>

        <div className="flex w-full flex-col items-center gap-[2.5cqw]">
          {blurb ? (
            <p
              className="m-0 italic"
              style={{
                fontSize: 'clamp(12px, 4cqw, 34px)',
                maxWidth: '85%',
                lineHeight: 1.4,
                textShadow: '0 1px 6px rgba(0,0,0,0.5)'
              }}
            >
              {blurb}
            </p>
          ) : null}
          <div
            style={{
              width: '30%',
              height: '0.3cqw',
              background: accentColor,
              opacity: 0.9
            }}
            aria-hidden="true"
          />
          {authorName ? (
            <p
              className="m-0 uppercase"
              style={{
                fontSize: 'clamp(11px, 3.6cqw, 30px)',
                letterSpacing: '0.18em',
                textShadow: '0 1px 6px rgba(0,0,0,0.5)'
              }}
            >
              {authorName}
            </p>
          ) : null}
          {showAuthorPhoto && authorPhotoUrl ? (
            <img
              src={authorPhotoUrl}
              alt={authorName ? `Portrait of ${authorName}` : 'Author portrait'}
              style={{
                width: '18cqw',
                height: '18cqw',
                objectFit: 'cover',
                borderRadius: '50%',
                border: `0.4cqw solid ${accentColor}`
              }}
            />
          ) : showAuthorPhoto ? (
            <div
              className="flex items-center justify-center text-center"
              style={{
                width: '18cqw',
                height: '18cqw',
                borderRadius: '50%',
                border: `0.4cqw dashed ${accentColor}`,
                fontSize: 'clamp(9px, 2.4cqw, 18px)',
                opacity: 0.85,
                padding: '1cqw'
              }}
            >
              Author photo
            </div>
          ) : null}
          <div style={{ minHeight: '1cqw' }} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
