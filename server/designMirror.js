/**
 * DESIGN MIRROR (server side)
 * ---------------------------
 * The studio, the wizard previews and the printed pages all take their
 * decoration from `src/data/designSystem.js`. Exports are rendered on the
 * server, where the browser bundle cannot be imported, so this file mirrors
 * the small, stable part of the design language that PDF and EPUB need:
 * page-border layers, text colours, heading treatment and page numbering.
 *
 * Keep the ids and layer definitions identical to `designSystem.js` —
 * `tests/exportDesignMirror.test.js` fails if they drift apart.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function channelToHex(value) {
  return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0').toUpperCase();
}

function parseColor(value) {
  if (value && typeof value === 'object' && Number.isFinite(value.r)) {
    return { r: clamp(value.r, 0, 255), g: clamp(value.g, 0, 255), b: clamp(value.b, 0, 255), a: 1 };
  }
  const raw = String(value || '').trim();
  if (!raw) return null;
  const hex = raw.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1
    };
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    };
  }
  const rgba = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(/[,/]/).map((part) => part.trim());
    if (parts.length >= 3) {
      return {
        r: clamp(Number.parseFloat(parts[0]) || 0, 0, 255),
        g: clamp(Number.parseFloat(parts[1]) || 0, 0, 255),
        b: clamp(Number.parseFloat(parts[2]) || 0, 0, 255),
        a: clamp(Number.parseFloat(parts[3]) || 1, 0, 1)
      };
    }
  }
  return null;
}

function toHex(value, fallback = '#000000') {
  const rgb = parseColor(value);
  if (!rgb) return fallback;
  return `#${channelToHex(rgb.r)}${channelToHex(rgb.g)}${channelToHex(rgb.b)}`.toUpperCase();
}

function mixColors(a, b, weight = 0.5) {
  const first = parseColor(a);
  const second = parseColor(b);
  if (!first) return toHex(b, '#000000');
  if (!second) return toHex(a, '#000000');
  const w = clamp(Number(weight) || 0, 0, 1);
  return `#${channelToHex(first.r + (second.r - first.r) * w)}${channelToHex(first.g + (second.g - first.g) * w)}${channelToHex(first.b + (second.b - first.b) * w)}`.toUpperCase();
}

function withAlpha(value, alpha = 1, fallback = '#000000') {
  const rgb = parseColor(value) || parseColor(fallback);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  const finalAlpha = clamp(Number.isFinite(Number(alpha)) ? Number(alpha) : rgb.a, 0, 1);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${finalAlpha})`;
}

function relativeLuminance(value) {
  const rgb = parseColor(value) || { r: 255, g: 255, b: 255 };
  const channel = (input) => {
    const unit = input / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableInk(preferred, background, options = {}) {
  const { fallback = '#1F2937', min = 4.5 } = options;
  const bg = toHex(background, '#FFFFFF');
  const candidates = [preferred, fallback, '#FFFFFF', '#111827'];
  for (const candidate of candidates) {
    if (!parseColor(candidate)) continue;
    for (let step = 0; step <= 8; step += 1) {
      const mixed = mixColors(candidate, fallback, step / 8);
      if (contrastRatio(mixed, bg) >= min) return mixed;
    }
  }
  return contrastRatio('#FFFFFF', bg) >= contrastRatio('#111827', bg) ? '#FFFFFF' : '#111827';
}

function mutedInk(pageText, pageBg, options = {}) {
  const { min = 4.5, weight = 0.42 } = options;
  return readableInk(mixColors(pageText, pageBg, weight), pageBg, { fallback: pageText, min });
}

/* ------------------------------------------------------------------ */
/* Page borders — mirrors PAGE_BORDER_STYLES in src/data/designSystem   */
/* ------------------------------------------------------------------ */

const PAGE_BORDER_LAYERS = Object.freeze({
  none: [],
  hairline: [
    { kind: 'border', inset: 10, width: 1, style: 'solid', color: 'border', radius: 2 }
  ],
  'inner-rule': [
    { kind: 'border', inset: 8, width: 1, style: 'solid', color: 'border', radius: 2, opacity: 0.75 },
    { kind: 'border', inset: 16, width: 1, style: 'solid', color: 'border', radius: 1, opacity: 0.4 }
  ],
  'double-rule': [
    { kind: 'border', inset: 8, width: 3, style: 'double', color: 'border', radius: 2 }
  ],
  'corner-flourish': [
    { kind: 'border', inset: 8, width: 3, style: 'double', color: 'border', radius: 2 },
    { kind: 'border', inset: 17, width: 1, style: 'solid', color: 'border', radius: 1, opacity: 0.45 },
    { kind: 'corners', glyph: '❧', color: 'border', inset: 11, size: 17 }
  ],
  'crest-corners': [
    { kind: 'border', inset: 7, width: 2, style: 'solid', color: 'border', radius: 3 },
    { kind: 'border', inset: 13, width: 1, style: 'solid', color: 'border', radius: 2, opacity: 0.55 },
    { kind: 'corners', glyph: '❦', color: 'accent', inset: 8, size: 16 }
  ],
  filigree: [
    { kind: 'border', inset: 7, width: 4, style: 'double', color: 'border', radius: 3 },
    { kind: 'border', inset: 16, width: 1, style: 'solid', color: 'accent', radius: 2, opacity: 0.65 },
    { kind: 'corners', glyph: '❧', color: 'accent', inset: 9, size: 16 },
    { kind: 'cartouche', edge: 'top', glyph: '❦', color: 'border', size: 18 },
    { kind: 'cartouche', edge: 'bottom', glyph: '❦', color: 'border', size: 18 }
  ],
  'gallery-matte': [
    { kind: 'border', inset: 6, width: 10, style: 'solid', color: 'matte', radius: 2, opacity: 0.5 },
    { kind: 'border', inset: 18, width: 1, style: 'solid', color: 'border', radius: 1, opacity: 0.85 }
  ],
  'soft-rounded': [
    { kind: 'border', inset: 8, width: 2, style: 'solid', color: 'border', radius: 20 },
    { kind: 'border', inset: 16, width: 1, style: 'solid', color: 'border', radius: 14, opacity: 0.4 }
  ],
  'arch-window': [
    { kind: 'border', inset: 8, width: 3, style: 'double', color: 'border', radius: 26 },
    { kind: 'border', inset: 17, width: 1, style: 'solid', color: 'accent', radius: 20, opacity: 0.55 },
    { kind: 'corners', glyph: '✦', color: 'accent', inset: 10, size: 13 }
  ],
  'dashed-craft': [
    { kind: 'border', inset: 8, width: 2, style: 'dashed', color: 'border', radius: 6, opacity: 0.9 },
    { kind: 'border', inset: 16, width: 1, style: 'dotted', color: 'accent', radius: 4, opacity: 0.5 }
  ],
  pinstripe: [
    { kind: 'border', inset: 9, width: 1, style: 'solid', color: 'border', radius: 1 },
    { kind: 'border', inset: 14, width: 2, style: 'solid', color: 'border', radius: 1, opacity: 0.35 },
    { kind: 'corners', glyph: '◆', color: 'accent', inset: 6, size: 8 }
  ],
  'masthead-band': [
    { kind: 'band', edge: 'top', thickness: 10, color: 'accent' },
    { kind: 'border', inset: 8, width: 1, style: 'solid', color: 'border', radius: 1, opacity: 0.45 },
    { kind: 'band', edge: 'bottom', thickness: 3, color: 'border' }
  ],
  'ribbon-corners': [
    { kind: 'border', inset: 9, width: 1, style: 'solid', color: 'border', radius: 1 },
    { kind: 'corners', glyph: '■', color: 'accent', inset: 5, size: 10 }
  ]
});

const PAGE_BORDER_IDS = Object.freeze(Object.keys(PAGE_BORDER_LAYERS));
const BLOCK_BORDER_IDS = Object.freeze([
  'hairline', 'double-rule', 'left-accent', 'top-accent', 'tinted-panel',
  'parchment', 'ticket', 'rule-only', 'shadow-card', 'underline-only'
]);
const HEADING_STYLE_IDS = Object.freeze([
  'centered-rule', 'top-banner', 'centered-pill', 'left-bar',
  'kicker-overline', 'masthead', 'minimal-caps'
]);
const PAGE_NUMBER_FORMATS = Object.freeze(['arabic', 'roman', 'none']);
const SANS_FONTS = Object.freeze(['Plus Jakarta Sans', 'Inter']);

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function getPageBorderLayers(id) {
  return PAGE_BORDER_LAYERS[id] || PAGE_BORDER_LAYERS.hairline;
}

function toRoman(value) {
  const number = Math.max(0, Math.floor(Number(value) || 0));
  if (!number || number > 3999) return String(number || '');
  const table = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let rest = number;
  let result = '';
  for (const [amount, numeral] of table) {
    while (rest >= amount) {
      result += numeral;
      rest -= amount;
    }
  }
  return result;
}

/**
 * Resolve the stored page design (`project.coverConfig`) into the handful of
 * values the exporters need. Mirrors `resolveTemplateDesign` closely enough
 * that a page keeps its border, ink and page numbers after export.
 */
function resolveExportDesign(coverConfig = {}) {
  const config = coverConfig && typeof coverConfig === 'object' ? coverConfig : {};
  const overrides = config.design && typeof config.design === 'object' ? config.design : {};

  const pageBg = toHex(pick(config.pageBg, '#FFFFFF'), '#FFFFFF');
  const pageText = toHex(pick(config.pageText, '#1F2937'), '#1F2937');
  const templateBorder = toHex(pick(config.borderColor, pageText), pageText);
  const templateAccent = toHex(pick(config.accentColor, templateBorder), templateBorder);

  const borderColor = toHex(pick(overrides.borderColor, templateBorder), templateBorder);
  const accentColor = toHex(pick(overrides.accentColor, templateAccent), templateAccent);
  const blockColor = toHex(pick(overrides.blockColor, borderColor), borderColor);

  const pageBorderId = PAGE_BORDER_IDS.includes(overrides.pageBorderId) ? overrides.pageBorderId : 'hairline';
  const blockBorderId = BLOCK_BORDER_IDS.includes(overrides.blockBorderId) ? overrides.blockBorderId : 'hairline';
  const headingStyleId = HEADING_STYLE_IDS.includes(overrides.headingStyleId) ? overrides.headingStyleId : 'centered-rule';
  const pageNumbers = PAGE_NUMBER_FORMATS.includes(overrides.pageNumbers) ? overrides.pageNumbers : 'arabic';
  const pageNumberWord = String(overrides.pageNumberWord || '').slice(0, 12);

  const fontFamily = pick(overrides.fontFamily, config.fontFamily, 'Georgia');
  const serif = !SANS_FONTS.includes(fontFamily);

  return {
    pageBg,
    pageText,
    borderColor,
    accentColor,
    blockColor,
    matteColor: mixColors(pageText, pageBg, 0.72),
    headingColor: readableInk(accentColor, pageBg, { fallback: pageText, min: 4.5 }),
    bodyText: readableInk(pageText, pageBg, { fallback: pageText, min: 4.6 }),
    mutedText: mutedInk(pageText, pageBg),
    borderInk: readableInk(borderColor, pageBg, { fallback: pageText, min: 3 }),
    accentInk: readableInk(accentColor, pageBg, { fallback: pageText, min: 3.2 }),
    pageBorderId,
    pageBorderLayers: getPageBorderLayers(pageBorderId),
    blockBorderId,
    headingStyleId,
    pageNumbers,
    dropCap: overrides.dropCap !== false,
    dropCapStyle: overrides.dropCapStyle === 'boxed' ? 'boxed' : 'plain',
    pageNumberWord,
    kicker: overrides.kicker !== false,
    fontFamily,
    serif
  };
}

function layerColor(layer, design) {
  switch (layer?.color) {
    case 'accent': return design.accentInk;
    case 'matte': return design.matteColor;
    case 'page': return design.pageBg;
    default: return design.borderInk;
  }
}

/**
 * Paint the page border and its ornaments on a PDFKit page. The CSS design
 * works in abstract units on a 480pt-wide page, so the geometry scales with
 * the chosen trim size.
 */
function paintPdfPageFurniture(doc, design, pageWidthPt, pageHeightPt) {
  if (!design) return;
  const scale = Math.max(0.75, Math.min(1.6, pageWidthPt / 480));
  const layers = design.pageBorderLayers || [];
  // Ornaments sit in the trim margin, outside the printable area. PDFKit
  // silently starts a new page when text is placed below the bottom margin —
  // which, during a pageAdded decoration, would recurse forever. Zero the
  // margins while decorating, then put the drawing cursor back exactly where
  // the body text expects it.
  const previousMargins = doc.page && doc.page.margins ? { ...doc.page.margins } : null;
  const previousX = doc.x;
  const previousY = doc.y;
  if (doc.page && doc.page.margins) {
    doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
  }

  doc.save();
  if (design.pageBg && design.pageBg.toUpperCase() !== '#FFFFFF') {
    doc.rect(0, 0, pageWidthPt, pageHeightPt).fill(design.pageBg);
  }

  layers.forEach((layer) => {
    if (layer.kind === 'band') {
      const thickness = Math.max(2, (layer.thickness || 4) * scale);
      const y = layer.edge === 'bottom' ? pageHeightPt - thickness : 0;
      doc.rect(0, y, pageWidthPt, thickness).fill(layerColor(layer, design));
      return;
    }
    if (layer.kind === 'border') {
      const inset = Math.max(2, (layer.inset || 8) * scale);
      const width = Math.max(0.4, (layer.width || 1) * scale);
      const color = layerColor(layer, design);
      doc.lineWidth(width).strokeColor(color);
      if (layer.style === 'dashed') doc.dash(width * 3, { space: width * 2 });
      else if (layer.style === 'dotted') doc.dash(width, { space: width * 2 });
      else doc.undash();
      doc.roundedRect(inset, inset, pageWidthPt - inset * 2, pageHeightPt - inset * 2, Math.max(0, (layer.radius || 0) * scale * 0.5));
      if (layer.style === 'double') {
        doc.lineWidth(Math.max(0.4, width / 3)).stroke();
        doc.lineWidth(Math.max(0.4, width / 3))
          .roundedRect(inset + width * 2, inset + width * 2, pageWidthPt - (inset + width * 2) * 2, pageHeightPt - (inset + width * 2) * 2, Math.max(0, (layer.radius || 0) * scale * 0.5))
          .stroke();
      } else {
        doc.stroke();
      }
      doc.undash();
      return;
    }
    if (layer.kind === 'corners') {
      const inset = Math.max(2, (layer.inset || 8) * scale);
      const size = Math.max(5, (layer.size || 12) * scale);
      const glyph = layer.glyph || '❧';
      const color = layerColor(layer, design);
      doc.font(design.serif ? 'Times-Roman' : 'Helvetica').fontSize(size).fillColor(color);
      doc.text(glyph, inset, inset, { width: pageWidthPt - inset * 2, align: 'left', lineBreak: false });
      doc.text(glyph, inset, inset, { width: pageWidthPt - inset * 2, align: 'right', lineBreak: false });
      doc.text(glyph, inset, pageHeightPt - inset - size, { width: pageWidthPt - inset * 2, align: 'left', lineBreak: false });
      doc.text(glyph, inset, pageHeightPt - inset - size, { width: pageWidthPt - inset * 2, align: 'right', lineBreak: false });
      return;
    }
    if (layer.kind === 'cartouche') {
      const size = Math.max(6, (layer.size || 14) * scale);
      const glyph = layer.glyph || '❦';
      const y = layer.edge === 'bottom' ? pageHeightPt - size * 2.1 : size * 0.4;
      doc.font(design.serif ? 'Times-Roman' : 'Helvetica').fontSize(size).fillColor(layerColor(layer, design));
      doc.text(glyph, 0, y, { width: pageWidthPt, align: 'center', lineBreak: false });
    }
  });

  doc.restore();
  doc.fillColor(design.bodyText);
  if (previousMargins && doc.page) doc.page.margins = previousMargins;
  doc.x = previousX;
  doc.y = previousY;
}

function pageNumberLabel(pageIndex, design) {
  const format = design?.pageNumbers || 'arabic';
  if (format === 'none') return '';
  const number = Math.max(1, Number(pageIndex) + 1);
  const label = format === 'roman' ? toRoman(number) : String(number);
  const word = typeof design?.pageNumberWord === 'string' ? design.pageNumberWord.trim() : '';
  return word ? `${word} ${label}` : label;
}

/**
 * The exported reader (EPUB) gets the same page border, colours and heading
 * treatment as the studio, expressed as portable CSS for e-readers.
 */
function epubDesignCss(design) {
  const layers = design.pageBorderLayers || [];
  const borders = layers.filter((layer) => layer.kind === 'border');
  const outer = borders[0] || null;
  const inner = borders[1] || null;
  const band = layers.find((layer) => layer.kind === 'band' && layer.edge === 'top');
  const glyphs = layers.filter((layer) => layer.kind === 'corners').map((layer) => layer.glyph).join(' ');

  const outerRule = outer
    ? `${Math.max(1, Math.round(outer.width * 0.75))}px ${outer.style === 'double' ? 'double' : outer.style === 'dashed' ? 'dashed' : outer.style === 'dotted' ? 'dotted' : 'solid'} ${withAlpha(layerColor(outer, design), outer.opacity ?? 1)}`
    : 'none';
  const frameRadius = outer ? `${Math.round((outer.radius || 0) / 2)}px` : '0';
  const innerShadow = inner
    ? `inset 0 0 0 ${Math.max(1, Math.round(inner.width))}px ${withAlpha(layerColor(inner, design), inner.opacity ?? 1)}`
    : 'none';
  const titleCase = design.headingStyleId === 'top-banner' || design.headingStyleId === 'masthead' || design.headingStyleId === 'minimal-caps'
    ? 'uppercase'
    : 'none';
  const bannerBackground = band ? layerColor(band, design) : design.accentInk;

  const dropCapRule = design.dropCap
    ? design.dropCapStyle === 'boxed'
      ? `.template-page-frame > p:first-of-type::first-letter {
  float: left;
  font-size: 3.1em;
  line-height: 0.82;
  font-family: "${design.fontFamily}", Georgia, serif;
  background-color: ${design.accentInk};
  color: ${readableInk('#FFFFFF', design.accentInk, { fallback: '#FFFFFF', min: 3 })};
  padding: 0.06em 0.16em 0.02em;
  margin: 0.06em 0.18em 0 0;
  border-radius: 2px;
}
`
      : `.template-page-frame > p:first-of-type::first-letter {
  float: left;
  font-size: 3.1em;
  line-height: 0.82;
  padding: 0.06em 0.12em 0 0;
  color: ${design.accentInk};
  font-family: "${design.fontFamily}", Georgia, serif;
}
`
    : '';

  return `body {
  font-family: "${design.fontFamily}", ${design.serif ? 'Georgia, "Times New Roman", serif' : '"Segoe UI", Arial, sans-serif'};
  line-height: 1.5;
  margin: 3%;
  background-color: ${design.pageBg};
  color: ${design.bodyText};
}
.template-page-frame {
  position: relative;
  background-color: ${design.pageBg};
  color: ${design.bodyText};
  border: ${outerRule};
  border-radius: ${frameRadius};
  box-shadow: ${innerShadow};
  padding: 1.9em;
}
.template-page-frame::after {
  content: ${glyphs ? `"${glyphs}"` : '""'};
  position: absolute;
  inset: 0.35em;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  color: ${withAlpha(design.borderInk, 0.8)};
  font-size: 0.9em;
  pointer-events: none;
}
.template-heading-banner {
  background-color: ${bannerBackground};
  color: ${design.headingStyleId === 'top-banner' || design.headingStyleId === 'masthead' ? readableInk('#FFFFFF', bannerBackground, { fallback: design.pageText, min: 4.5 }) : design.headingColor};
  padding: 0.6em 1em;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 1.2em;
}
h1, h2, h3 {
  font-family: "${design.fontFamily}", ${design.serif ? 'Georgia, serif' : 'Arial, sans-serif'};
  color: ${design.headingColor};
  text-transform: ${titleCase};
  letter-spacing: ${design.headingStyleId === 'minimal-caps' ? '0.08em' : '0.01em'};
  line-height: 1.25;
  margin-top: 0.8em;
  margin-bottom: 0.5em;
}
${dropCapRule}`;
}

module.exports = {
  PAGE_BORDER_LAYERS,
  PAGE_BORDER_IDS,
  BLOCK_BORDER_IDS,
  HEADING_STYLE_IDS,
  PAGE_NUMBER_FORMATS,
  resolveExportDesign,
  paintPdfPageFurniture,
  pageNumberLabel,
  epubDesignCss,
  // exported for tests / reuse
  toHex,
  withAlpha,
  mixColors,
  readableInk,
  contrastRatio,
  toRoman,
  getPageBorderLayers
};
