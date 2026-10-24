/**
 * DESIGN SYSTEM — the shared decoration language for every book page.
 *
 * Why this file exists
 * --------------------
 * The template previews in the style chooser are photographs of a finished
 * book on a tablet. They show *exactly* what the page should feel like:
 * a double-ruled page border with corner flourishes, a small letterspaced
 * kicker above the title, ornate text-block borders, a drop cap, an ornament
 * rule, "— Page I —" numerals. Before this module the page renderer invented
 * its own decoration from a five-item index, so a rendered page could look
 * nothing like the sample the author chose — which is what customers compare
 * against.
 *
 * This module records that decoration explicitly:
 *
 *  - PAGE_BORDER_STYLES  — 14 page-border ornaments (double rule, filigree,
 *                          corner crest, gallery matte, masthead band, …).
 *  - BLOCK_BORDER_STYLES — 11 bordered text-block treatments (parchment card,
 *                          tinted panel, ticket, left rule, …).
 *  - HEADING_STYLES      — 7 title treatments (centred rule, banner, pill,
 *                          masthead, kicker overline, …).
 *  - ORNAMENTS           — small rules used between sections / page numbers.
 *  - DESIGN_PRESETS      — one-click "creative directions" that combine the
 *                          above into a complete, coherent page design.
 *  - resolveTemplateDesign(template, overrides)
 *                        — turns a template + the author's choices into the
 *                          exact decoration spec used by every renderer
 *                          (writing studio, preview, export reader, cover and
 *                          Introduction page).
 *
 * Colour choices
 * --------------
 * Every border, rule and ornament accepts a colour role (`pageText`,
 * `border`, `accent`, `block`) or a literal hex value, and the author can pick
 * any colour for the page border and for the text-block border. Because a
 * chosen colour can be nearly invisible on the page tint, `readableInk`
 * guarantees a minimum contrast ratio for every piece of *text*, so a colour
 * choice can never make words unreadable.
 */

import { TEMPLATES_BY_CATEGORY } from './visualTemplatesCatalog';

/* ------------------------------------------------------------------ */
/* Colour utilities                                                    */
/* ------------------------------------------------------------------ */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Accepts #rgb, #rrggbb and #rrggbbaa; returns { r,g,b,a } or null. */
export function parseColor(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1
    };
  }
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    };
  }
  const rgbMatch = raw.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    return {
      r: clamp(Math.round(Number(rgbMatch[1])), 0, 255),
      g: clamp(Math.round(Number(rgbMatch[2])), 0, 255),
      b: clamp(Math.round(Number(rgbMatch[3])), 0, 255),
      a: rgbMatch[4] === undefined ? 1 : clamp(Number(rgbMatch[4]), 0, 1)
    };
  }
  return null;
}

function channelToHex(channel) {
  return clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
}

export function toHex(value, fallback = '#000000') {
  const rgb = parseColor(value);
  if (!rgb) return fallback;
  return `#${channelToHex(rgb.r)}${channelToHex(rgb.g)}${channelToHex(rgb.b)}`.toUpperCase();
}

/** `#RRGGBB` → `rgba(r,g,b,alpha)`; keeps existing alpha when alpha omitted. */
export function withAlpha(value, alpha = 1, fallback = '#000000') {
  const rgb = parseColor(value) || parseColor(fallback);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  const finalAlpha = clamp(Number.isFinite(Number(alpha)) ? Number(alpha) : rgb.a, 0, 1);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${finalAlpha})`;
}

/** Mix colour `b` into colour `a`. weight = share of b (0…1). */
export function mixColors(a, b, weight = 0.5) {
  const first = parseColor(a);
  const second = parseColor(b);
  if (!first) return toHex(b, '#000000');
  if (!second) return toHex(a, '#000000');
  const w = clamp(Number(weight) || 0, 0, 1);
  return `#${channelToHex(first.r + (second.r - first.r) * w)}${channelToHex(first.g + (second.g - first.g) * w)}${channelToHex(first.b + (second.b - first.b) * w)}`.toUpperCase();
}

function linearChannel(channel) {
  const value = clamp(channel, 0, 255) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(value) {
  const rgb = parseColor(value);
  if (!rgb) return 0;
  return 0.2126 * linearChannel(rgb.r) + 0.7152 * linearChannel(rgb.g) + 0.0722 * linearChannel(rgb.b);
}

/** WCAG contrast ratio (1…21) between two colours. */
export function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isDark(value) {
  return relativeLuminance(value) < 0.42;
}

/**
 * Make sure a chosen ink colour is readable on its background.
 *
 * Text is stepped toward the readable fallback (usually the template's body
 * colour) until it reaches `min` contrast. If even the fallback fails — for
 * example a light body colour on a light page tint — the better of pure white
 * or the darkest template colour is used. Ornament/border colours pass a low
 * `min` (3.0) so decorative rules stay visible without shouting.
 */
export function readableInk(preferred, background, options = {}) {
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

/** A muted version of the page text, still readable on the page tint. */
export function mutedInk(pageText, pageBg, options = {}) {
  const { min = 4.5, weight = 0.42 } = options;
  return readableInk(mixColors(pageText, pageBg, weight), pageBg, { fallback: pageText, min });
}

/** Named colour roles resolved against the design spec. */
export function resolveRoleColor(role, design = {}) {
  switch (role) {
    case 'pageText':
      return design.pageText || '#1F2937';
    case 'pageBg':
      return design.pageBg || '#FFFFFF';
    case 'accent':
      return design.accentColor || design.borderColor || '#8F6534';
    case 'block':
      return design.blockColor || design.borderColor || '#8F6534';
    case 'border':
      return design.borderColor || '#8F6534';
    case 'muted':
      return design.mutedText || mutedInk(design.pageText, design.pageBg);
    default:
      return parseColor(role) ? role : (design.borderColor || '#8F6534');
  }
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export const FONT_STACKS = Object.freeze({
  'Plus Jakarta Sans': '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  Inter: '"Inter", "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  Lora: '"Lora", "Cormorant Garamond", Georgia, "Times New Roman", serif',
  Newsreader: '"Newsreader", Cambria, Georgia, "Times New Roman", serif',
  'Playfair Display': '"Playfair Display", "Cinzel", "Cormorant Garamond", Georgia, serif',
  Cinzel: '"Cinzel", "Playfair Display", Georgia, serif',
  Georgia: 'Georgia, "Times New Roman", serif'
});

export function fontStackFor(fontFamily) {
  const key = String(fontFamily || '').trim();
  if (FONT_STACKS[key]) return FONT_STACKS[key];
  const first = key.split(',')[0]?.replace(/"/g, '').trim();
  if (first && FONT_STACKS[first]) return FONT_STACKS[first];
  if (first) return `"${first}", "Playfair Display", Georgia, serif`;
  return FONT_STACKS['Plus Jakarta Sans'];
}

export function isSerifFont(fontFamily) {
  const stack = fontStackFor(fontFamily).toLowerCase();
  return stack.includes('serif') && !stack.includes('sans-serif');
}

export function isDisplaySerif(fontFamily) {
  const key = String(fontFamily || '').toLowerCase();
  return key.includes('playfair') || key.includes('cinzel') || key.includes('cormorant') || key.includes('newsreader') || key.includes('lora');
}

/* ------------------------------------------------------------------ */
/* Page borders                                                        */
/* ------------------------------------------------------------------ */

/**
 * A page border is a stack of decorative layers drawn inside the page:
 *
 *   border    – a ruled inset frame
 *   corners   – a glyph repeated in each corner
 *   band      – a solid accent strip on one edge
 *   cartouche – a small ornament centred on one edge
 *
 * Colours are roles (`border`, `accent`, `pageText`) resolved at render time,
 * so one ornament works with every template palette and any chosen colour.
 */
export const PAGE_BORDER_STYLES = Object.freeze([
  {
    id: 'none',
    name: 'No page border',
    blurb: 'Clean edge — the design lives inside the page.',
    layers: []
  },
  {
    id: 'hairline',
    name: 'Single hairline',
    blurb: 'One fine rule around the page, modern and quiet.',
    layers: [
      { kind: 'border', inset: 10, width: 1, style: 'solid', color: 'border', radius: 2 }
    ]
  },
  {
    id: 'inner-rule',
    name: 'Classic inner rule',
    blurb: 'A fine outer rule and a second inset rule, like a printed book.',
    layers: [
      { kind: 'border', inset: 8, width: 1, style: 'solid', color: 'border', radius: 2, opacity: 0.75 },
      { kind: 'border', inset: 16, width: 1, style: 'solid', color: 'border', radius: 1, opacity: 0.4 }
    ]
  },
  {
    id: 'double-rule',
    name: 'Double rule',
    blurb: 'The traditional double-ruled frame used by classic editions.',
    layers: [
      { kind: 'border', inset: 8, width: 3, style: 'double', color: 'border', radius: 2 }
    ]
  },
  {
    id: 'corner-flourish',
    name: 'Corner flourish',
    blurb: 'Double rule with printed leaf flourishes in each corner.',
    layers: [
      { kind: 'border', inset: 8, width: 3, style: 'double', color: 'border', radius: 2 },
      { kind: 'border', inset: 17, width: 1, style: 'solid', color: 'border', radius: 1, opacity: 0.45 },
      { kind: 'corners', glyph: '❧', color: 'border', inset: 11, size: 17 }
    ]
  },
  {
    id: 'crest-corners',
    name: 'Crest corners',
    blurb: 'Bold rule with a crest ornament at every corner — for chronicles.',
    layers: [
      { kind: 'border', inset: 7, width: 2, style: 'solid', color: 'border', radius: 3 },
      { kind: 'border', inset: 13, width: 1, style: 'solid', color: 'border', radius: 2, opacity: 0.55 },
      { kind: 'corners', glyph: '❦', color: 'accent', inset: 8, size: 16 }
    ]
  },
  {
    id: 'filigree',
    name: 'Filigree',
    blurb: 'Double rule with decorative corner clusters and centre cartouches.',
    layers: [
      { kind: 'border', inset: 7, width: 4, style: 'double', color: 'border', radius: 3 },
      { kind: 'border', inset: 16, width: 1, style: 'solid', color: 'accent', radius: 2, opacity: 0.65 },
      { kind: 'corners', glyph: '❧', color: 'accent', inset: 9, size: 16 },
      { kind: 'cartouche', edge: 'top', glyph: '❦', color: 'border', size: 18 },
      { kind: 'cartouche', edge: 'bottom', glyph: '❦', color: 'border', size: 18 }
    ]
  },
  {
    id: 'gallery-matte',
    name: 'Gallery matte',
    blurb: 'Thick matte around the page with a fine silver rule — gallery print.',
    layers: [
      { kind: 'border', inset: 6, width: 10, style: 'solid', color: 'matte', radius: 2, opacity: 0.5 },
      { kind: 'border', inset: 18, width: 1, style: 'solid', color: 'border', radius: 1, opacity: 0.85 }
    ]
  },
  {
    id: 'soft-rounded',
    name: 'Soft rounded',
    blurb: 'A gently rounded frame with an inset hairline.',
    layers: [
      { kind: 'border', inset: 8, width: 2, style: 'solid', color: 'border', radius: 20 },
      { kind: 'border', inset: 16, width: 1, style: 'solid', color: 'border', radius: 14, opacity: 0.4 }
    ]
  },
  {
    id: 'arch-window',
    name: 'Arch window',
    blurb: 'Rounded arch top — storybook doors and windows.',
    layers: [
      { kind: 'border', inset: 8, width: 3, style: 'double', color: 'border', radius: 26 },
      { kind: 'border', inset: 17, width: 1, style: 'solid', color: 'accent', radius: 20, opacity: 0.55 },
      { kind: 'corners', glyph: '✦', color: 'accent', inset: 10, size: 13 }
    ]
  },
  {
    id: 'dashed-craft',
    name: 'Dashed craft',
    blurb: 'Hand-stitched dashed rule with a soft inner line.',
    layers: [
      { kind: 'border', inset: 8, width: 2, style: 'dashed', color: 'border', radius: 6, opacity: 0.9 },
      { kind: 'border', inset: 16, width: 1, style: 'dotted', color: 'accent', radius: 4, opacity: 0.5 }
    ]
  },
  {
    id: 'pinstripe',
    name: 'Pinstripe',
    blurb: 'Fine double pinstripe frame with small corner dots.',
    layers: [
      { kind: 'border', inset: 9, width: 1, style: 'solid', color: 'border', radius: 1 },
      { kind: 'border', inset: 14, width: 2, style: 'solid', color: 'border', radius: 1, opacity: 0.35 },
      { kind: 'corners', glyph: '◆', color: 'accent', inset: 6, size: 8 }
    ]
  },
  {
    id: 'masthead-band',
    name: 'Masthead band',
    blurb: 'Heavy accent band at the top, rule at the foot — magazine masthead.',
    layers: [
      { kind: 'band', edge: 'top', thickness: 10, color: 'accent' },
      { kind: 'border', inset: 8, width: 1, style: 'solid', color: 'border', radius: 1, opacity: 0.45 },
      { kind: 'band', edge: 'bottom', thickness: 3, color: 'border' }
    ]
  },
  {
    id: 'ribbon-corners',
    name: 'Ribbon corners',
    blurb: 'Crisp rule with solid accent squares in each corner.',
    layers: [
      { kind: 'border', inset: 9, width: 1, style: 'solid', color: 'border', radius: 1 },
      { kind: 'corners', glyph: '■', color: 'accent', inset: 5, size: 10 }
    ]
  }
]);

const PAGE_BORDER_MAP = new Map(PAGE_BORDER_STYLES.map((style) => [style.id, style]));

export function getPageBorderStyle(id) {
  return PAGE_BORDER_MAP.get(id) || PAGE_BORDER_MAP.get('hairline');
}

/* ------------------------------------------------------------------ */
/* Text-block borders                                                  */
/* ------------------------------------------------------------------ */

/**
 * Text blocks are the bordered boxes that hold the author's words. Each
 * treatment returns ordinary CSS, so the same block looks right in the
 * studio, in the preview and in the exported reader.
 */
export const BLOCK_BORDER_STYLES = Object.freeze([
  {
    id: 'hairline',
    name: 'Hairline box',
    blurb: 'A fine single rule on the page tint.',
    style: ({ pageBg, border }) => ({
      background: pageBg,
      border: `1px solid ${withAlpha(border, 0.55)}`,
      borderRadius: 6
    })
  },
  {
    id: 'double-rule',
    name: 'Double rule',
    blurb: 'Traditional double-ruled text box.',
    style: ({ pageBg, border }) => ({
      background: pageBg,
      border: `3px double ${border}`,
      borderRadius: 4,
      boxShadow: `inset 0 0 0 2px ${withAlpha(pageBg, 0.9)}`
    })
  },
  {
    id: 'left-accent',
    name: 'Left accent rule',
    blurb: 'Open box with a bold rule on the reading edge.',
    style: ({ pageBg, border, accent }) => ({
      background: `linear-gradient(100deg, ${withAlpha(accent, 0.09)}, ${withAlpha(pageBg, 0.02)} 62%)`,
      border: `1px solid ${withAlpha(border, 0.35)}`,
      borderLeft: `6px solid ${accent}`,
      borderRadius: '3px 10px 10px 3px'
    })
  },
  {
    id: 'top-accent',
    name: 'Top accent rule',
    blurb: 'Open box with a bold rule above the heading.',
    style: ({ pageBg, border, accent }) => ({
      background: pageBg,
      border: `1px solid ${withAlpha(border, 0.4)}`,
      borderTop: `5px solid ${accent}`,
      borderRadius: '4px 4px 10px 10px'
    })
  },
  {
    id: 'tinted-panel',
    name: 'Tinted panel',
    blurb: 'A soft colour wash behind the words, no heavy rule.',
    style: ({ border, accent, radius = 10 }) => ({
      background: withAlpha(accent, 0.09),
      border: `1px solid ${withAlpha(border, 0.4)}`,
      borderRadius: radius
    })
  },
  {
    id: 'parchment',
    name: 'Parchment card',
    blurb: 'Insets a lighter card with a fine double edge.',
    style: ({ pageBg, border, accent }) => ({
      background: `linear-gradient(150deg, ${withAlpha('#FFFFFF', 0.55)}, ${withAlpha(accent, 0.06)})`,
      border: `1px solid ${withAlpha(border, 0.55)}`,
      borderRadius: 8,
      boxShadow: `inset 0 0 0 3px ${withAlpha(pageBg, 0.85)}, inset 0 0 0 4px ${withAlpha(border, 0.22)}`
    })
  },
  {
    id: 'ticket',
    name: 'Ticket stamp',
    blurb: 'Dashed edge like a printed ticket stub.',
    style: ({ pageBg, border }) => ({
      background: pageBg,
      border: `2px dashed ${withAlpha(border, 0.85)}`,
      borderRadius: 4
    })
  },
  {
    id: 'rule-only',
    name: 'Rule above',
    blurb: 'No box — just a fine rule above the block.',
    style: ({ border, accent }) => ({
      background: 'transparent',
      border: 'none',
      borderTop: `2px solid ${withAlpha(border, 0.8)}`,
      paddingTop: '0.7rem',
      borderRadius: 0,
      boxShadow: `inset 0 2px 0 -1px ${withAlpha(accent, 0.35)}`
    })
  },
  {
    id: 'shadow-card',
    name: 'Raised card',
    blurb: 'A clean card lifted off the page with a soft shadow.',
    style: ({ pageBg, border }) => ({
      background: pageBg,
      border: `1px solid ${withAlpha(border, 0.28)}`,
      borderRadius: 12,
      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)'
    })
  },
  {
    id: 'underline-only',
    name: 'No box',
    blurb: 'Plain words on the page, no frame at all.',
    style: () => ({ background: 'transparent', border: 'none', borderRadius: 0 })
  }
]);

const BLOCK_BORDER_MAP = new Map(BLOCK_BORDER_STYLES.map((style) => [style.id, style]));

export function getBlockBorderStyle(id) {
  return BLOCK_BORDER_MAP.get(id) || BLOCK_BORDER_MAP.get('hairline');
}

/* ------------------------------------------------------------------ */
/* Block colour, depth and aged paper                                   */
/* ------------------------------------------------------------------ */

/**
 * Text blocks in the sample pictures are not just outlined — they are
 * *coloured* panes: a cream recipe card on a warm page, a warm wash behind a
 * caption, a deep panel behind a quote. They also sit slightly above the page,
 * with the soft shadow of a card laid on paper. And a few of the samples look
 * like an old book: foxed spots, a warm vignette, a woven sheet.
 *
 * Each of those is an optional, one-tap choice. `auto` keeps a block's own
 * designed background, so nothing changes unless the author asks for it.
 */
export const BLOCK_FILLS = Object.freeze([
  {
    id: 'auto',
    name: 'As designed',
    blurb: 'Keep the text-block style exactly as it was designed.'
  },
  {
    id: 'clear',
    name: 'No colour',
    blurb: 'The words sit straight on the page tint.'
  },
  {
    id: 'wash',
    name: 'Colour wash',
    blurb: 'A gentle wash of the block colour behind the words.'
  },
  {
    id: 'paper',
    name: 'Paper card',
    blurb: 'A warm, slightly lighter card lifted off the page.'
  },
  {
    id: 'rich',
    name: 'Rich colour',
    blurb: 'A strong colour panel — the ink is still contrast-checked.'
  }
]);

export const BLOCK_DEPTHS = Object.freeze([
  {
    id: 'flat',
    name: 'Flat',
    blurb: 'Print-flat: no shadow at all.'
  },
  {
    id: 'soft',
    name: 'Soft lift',
    blurb: 'A slight shadow, so the block sits just above the page.'
  },
  {
    id: 'raised',
    name: 'Raised card',
    blurb: 'A deeper shadow and a fine top highlight, like a card laid on paper.'
  }
]);

export const PAGE_TEXTURES = Object.freeze([
  {
    id: 'none',
    name: 'Fresh page',
    blurb: 'Clean, modern paper.'
  },
  {
    id: 'aged',
    name: 'Aged paper',
    blurb: 'Warm foxing and a soft vignette, like a book that has been read for years.'
  },
  {
    id: 'linen',
    name: 'Linen',
    blurb: 'A fine woven texture, like a cloth-bound edition.'
  },
  {
    id: 'vellum',
    name: 'Vellum',
    blurb: 'Soft hand-made mottling, cloudy and quiet.'
  }
]);

/**
 * Where the text blocks sit relative to the artwork.
 *
 * The sample pictures do not keep text politely beside the photographs: a
 * caption card lies across the corner of the photo, a recipe card sits on the
 * food shot, and some pages stack two cards so the lower one tucks over the
 * upper. These placements do the same thing on a real page — always with an
 * opaque card and a shadow, so the words stay readable over whatever is
 * underneath.
 */
export const BLOCK_PLACEMENTS = Object.freeze([
  {
    id: 'inline',
    name: 'Beside the artwork',
    blurb: 'Blocks sit in their own column, clear of the photographs.'
  },
  {
    id: 'over-image',
    name: 'Over the artwork',
    blurb: 'The first text block lifts onto the edge of the artwork, like a caption card laid on a photograph.'
  },
  {
    id: 'stacked',
    name: 'Stacked cards',
    blurb: 'Each text block tucks slightly over the one above it, in a stepped column.'
  },
  {
    id: 'floating',
    name: 'Floating panel',
    blurb: 'A raised, inset panel that breaks the page margin, magazine-style.'
  }
]);

const BLOCK_PLACEMENT_MAP = new Map(BLOCK_PLACEMENTS.map((placement) => [placement.id, placement]));

export function getBlockPlacement(id) {
  return BLOCK_PLACEMENT_MAP.get(id) || BLOCK_PLACEMENT_MAP.get('inline');
}

/**
 * Inline style for one text block under the chosen placement.
 * `index` is the block's position on the page (0 = the first block).
 */
export function blockOverlapStyle(design = {}, index = 0) {
  const id = getBlockPlacement(design.blockOverlap).id;
  if (id === 'inline') return null;

  if (id === 'over-image') {
    // Only the first block lifts; the rest keep the normal rhythm.
    if (index > 0) return null;
    // Lifts onto the bottom edge of the artwork and bleeds a little wider than
    // its column, the way a caption card crosses onto a photograph.
    return {
      marginTop: 'clamp(-2.9rem, -3.6vw, -1.3rem)',
      marginLeft: '-0.85rem',
      marginRight: '-0.85rem',
      position: 'relative',
      zIndex: 3
    };
  }

  if (id === 'stacked') {
    if (index === 0) return { position: 'relative', zIndex: 2 };
    const step = Math.min(index, 4);
    return {
      marginTop: '-1.15rem',
      marginLeft: `${0.55 * step}rem`,
      marginRight: `${0.2 * step}rem`,
      position: 'relative',
      zIndex: 2 + step
    };
  }

  // floating
  return {
    marginTop: index === 0 ? '-1.4rem' : '0.35rem',
    marginLeft: '1.1rem',
    marginRight: '1.1rem',
    position: 'relative',
    zIndex: 3
  };
}

/** A design whose blocks are opaque and lifted, as overlapping cards must be. */
export function overlapSafeDesign(design = {}) {
  const id = getBlockPlacement(design.blockOverlap).id;
  if (id === 'inline') return design;
  const fillNeedsHelp = !design.blockFillId || design.blockFillId === 'auto' || design.blockFillId === 'clear';
  return {
    ...design,
    blockFillId: fillNeedsHelp ? 'paper' : design.blockFillId,
    blockDepthId: design.blockDepthId === 'flat' ? 'raised' : design.blockDepthId
  };
}

const BLOCK_FILL_MAP = new Map(BLOCK_FILLS.map((fill) => [fill.id, fill]));
const BLOCK_DEPTH_MAP = new Map(BLOCK_DEPTHS.map((depth) => [depth.id, depth]));
const PAGE_TEXTURE_MAP = new Map(PAGE_TEXTURES.map((texture) => [texture.id, texture]));

export function getBlockFill(id) {
  return BLOCK_FILL_MAP.get(id) || BLOCK_FILL_MAP.get('auto');
}

export function getBlockDepth(id) {
  return BLOCK_DEPTH_MAP.get(id) || BLOCK_DEPTH_MAP.get('soft');
}

export function getPageTexture(id) {
  return PAGE_TEXTURE_MAP.get(id) || PAGE_TEXTURE_MAP.get('none');
}

/**
 * Step a fill colour towards the page tint until the block's own ink is
 * readable on it. A dark page tint therefore lightens a dark fill instead of
 * hiding the words — the same contrast guarantee the border colours get.
 */
function legibleFill(fill, ink, pageBg, min = 4.5) {
  let candidate = fill;
  for (let step = 0; step <= 10; step += 1) {
    if (contrastRatio(candidate, ink) >= min) return candidate;
    candidate = mixColors(candidate, pageBg, 0.16);
  }
  return fill;
}

/** The CSS background for a block, or '' when the style keeps its own. */
export function blockFillColor(design = {}, fillId) {
  const id = getBlockFill(fillId || design.blockFillId).id;
  if (id === 'auto') return '';
  if (id === 'clear') return 'transparent';

  const pageBg = design.pageBg || '#FFFFFF';
  const ink = design.bodyText || design.pageText || '#1F2937';
  const border = design.blockColor || design.borderColor || design.accentColor || '#8F6534';

  if (id === 'paper') {
    // A warm card that stays close to the page, the way the recipe cards and
    // caption plaques look in the samples.
    const card = mixColors(pageBg, '#FFFDF6', 0.78);
    return legibleFill(card, ink, pageBg);
  }
  if (id === 'rich') {
    return legibleFill(mixColors(border, pageBg, 0.34), ink, pageBg);
  }
  return legibleFill(mixColors(border, pageBg, 0.14), ink, pageBg);
}

/** The CSS box-shadow for a block's depth, or '' when it is print-flat. */
export function blockDepthShadow(design = {}, depthId) {
  const id = getBlockDepth(depthId || design.blockDepthId).id;
  if (id === 'flat') return '';
  const pageText = design.pageText || design.bodyText || '#1F2937';
  const shade = mixColors(pageText, '#000000', 0.5);
  if (id === 'raised') {
    return [
      `0 12px 26px ${withAlpha(shade, 0.22)}`,
      `0 3px 7px ${withAlpha(shade, 0.16)}`,
      `inset 0 1px 0 ${withAlpha('#FFFFFF', 0.45)}`
    ].join(', ');
  }
  return `0 3px 10px ${withAlpha(shade, 0.15)}`;
}

/**
 * Aged-paper decoration as CSS `background-image` layers. It is drawn on a
 * pointer-events-none overlay above the page tint and below the words, so it
 * can never blur, tint or interfere with typing.
 */
export function pageTextureLayers(design = {}, textureId) {
  const id = getPageTexture(textureId || design.pageTextureId).id;
  if (id === 'none') return { backgroundImage: '', boxShadow: '' };

  const warm = mixColors('#8B5A2B', design.borderInk || design.borderColor || '#8B5A2B', 0.4);
  const spot = withAlpha(warm, 0.16);
  const spotSoft = withAlpha(warm, 0.09);

  if (id === 'aged') {
    const foxing = [
      [18, 26, 1.6], [31, 12, 1.1], [72, 18, 1.4], [86, 41, 1.9],
      [12, 68, 1.3], [43, 84, 1.7], [67, 72, 1.2], [88, 88, 1.5],
      [55, 47, 1.0], [24, 52, 0.9]
    ]
      .map(([x, y, r]) => `radial-gradient(circle at ${x}% ${y}%, ${spot} 0 ${r}px, transparent ${(r * 1.9).toFixed(1)}px)`)
      .join(', ');
    return {
      backgroundImage: [
        `radial-gradient(ellipse at 8% 4%, ${withAlpha(warm, 0.12)} 0, transparent 42%)`,
        `radial-gradient(ellipse at 94% 96%, ${withAlpha(warm, 0.13)} 0, transparent 46%)`,
        `radial-gradient(ellipse at 50% 50%, ${withAlpha('#FFF3D6', 0.10)} 0, transparent 70%)`,
        foxing
      ].join(', '),
      boxShadow: `inset 0 0 64px ${withAlpha(warm, 0.17)}, inset 0 0 14px ${spotSoft}`
    };
  }

  if (id === 'linen') {
    return {
      backgroundImage: [
        'repeating-linear-gradient(0deg, rgba(90, 62, 35, 0.045) 0 1px, transparent 1px 3px)',
        'repeating-linear-gradient(90deg, rgba(90, 62, 35, 0.045) 0 1px, transparent 1px 3px)',
        `radial-gradient(ellipse at 50% 50%, transparent 55%, ${withAlpha(warm, 0.08)} 100%)`
      ].join(', '),
      boxShadow: ''
    };
  }

  // vellum — soft, cloudy mottling like a hand-made sheet
  return {
    backgroundImage: [
      `radial-gradient(ellipse at 22% 28%, ${spotSoft} 0, transparent 52%)`,
      `radial-gradient(ellipse at 78% 66%, ${spotSoft} 0, transparent 58%)`,
      `radial-gradient(ellipse at 46% 86%, ${withAlpha(warm, 0.06)} 0, transparent 44%)`,
      'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0 2px, transparent 2px 5px)'
    ].join(', '),
    boxShadow: `inset 0 0 40px ${withAlpha(warm, 0.07)}`
  };
}

/** An inline style object for the aged-paper overlay of a page. */
export function pageTextureStyle(design = {}, textureId) {
  const { backgroundImage, boxShadow } = pageTextureLayers(design, textureId);
  if (!backgroundImage && !boxShadow) return null;
  return {
    position: 'absolute',
    inset: 0,
    backgroundImage: backgroundImage || undefined,
    boxShadow: boxShadow || undefined,
    pointerEvents: 'none'
  };
}

/* ------------------------------------------------------------------ */
/* Headings                                                            */
/* ------------------------------------------------------------------ */

export const HEADING_STYLES = Object.freeze([
  { id: 'centered-rule', name: 'Centred + rule', blurb: 'Centred title with a short rule beneath.' },
  { id: 'top-banner', name: 'Banner', blurb: 'Solid accent banner behind the title.' },
  { id: 'centered-pill', name: 'Pill', blurb: 'Outlined pill around a centred title.' },
  { id: 'left-bar', name: 'Left bar', blurb: 'Left-aligned title with a bold left rule.' },
  { id: 'kicker-overline', name: 'Kicker overline', blurb: 'Small letterspaced kicker above a centred title.' },
  { id: 'masthead', name: 'Masthead', blurb: 'Heavy masthead with the book name above the page title.' },
  { id: 'minimal-caps', name: 'Minimal caps', blurb: 'Small capitals, no rules — quiet and modern.' }
]);

export function getHeadingStyle(id) {
  return HEADING_STYLES.find((style) => style.id === id) || HEADING_STYLES[0];
}

export const ORNAMENTS = Object.freeze([
  { id: 'fleur', glyph: '❧', name: 'Leaf flourish' },
  { id: 'crest', glyph: '❦', name: 'Hearts & crest' },
  { id: 'diamond', glyph: '◆', name: 'Diamond' },
  { id: 'star', glyph: '✦', name: 'Four-point star' },
  { id: 'asterisk', glyph: '✳', name: 'Asterisk' },
  { id: 'dots', glyph: '• • •', name: 'Three dots' },
  { id: 'rule', glyph: '———', name: 'Plain rule' },
  { id: 'none', glyph: '', name: 'No ornament' }
]);

export function getOrnament(id) {
  return ORNAMENTS.find((ornament) => ornament.id === id) || ORNAMENTS[0];
}

export const PAGE_NUMBER_FORMATS = Object.freeze([
  { id: 'arabic', name: '1, 2, 3' },
  { id: 'roman', name: 'I, II, III' },
  { id: 'none', name: 'No page number' }
]);

export function toRoman(value) {
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

/* ------------------------------------------------------------------ */
/* Creative directions (presets)                                       */
/* ------------------------------------------------------------------ */

/**
 * One tap gives a complete, coherent page design. Presets change decoration
 * only — never the template's palette or typography — so every combination
 * stays readable and on-brand.
 */
export const DESIGN_PRESETS = Object.freeze([
  {
    id: 'classic-print',
    name: 'Classic print',
    blurb: 'Double-ruled border, ornamental blocks, drop caps and roman numerals.',
    design: {
      pageBorderId: 'corner-flourish',
      blockBorderId: 'double-rule',
      headingStyleId: 'kicker-overline',
      ornamentId: 'fleur',
      dropCap: true,
      kicker: true,
      pageNumbers: 'roman'
    }
  },
  {
    id: 'gallery-minimal',
    name: 'Gallery minimal',
    blurb: 'Fine hairline border, clean cards and quiet capitals.',
    design: {
      pageBorderId: 'hairline',
      blockBorderId: 'rule-only',
      headingStyleId: 'minimal-caps',
      ornamentId: 'rule',
      dropCap: false,
      kicker: false,
      pageNumbers: 'arabic'
    }
  },
  {
    id: 'editorial-bold',
    name: 'Editorial bold',
    blurb: 'Masthead band, accent-ruled blocks and a strong page title.',
    design: {
      pageBorderId: 'masthead-band',
      blockBorderId: 'top-accent',
      headingStyleId: 'masthead',
      ornamentId: 'diamond',
      dropCap: false,
      kicker: true,
      pageNumbers: 'arabic'
    }
  },
  {
    id: 'storybook-ornate',
    name: 'Storybook ornate',
    blurb: 'Filigree frame, parchment cards and illuminated drop caps.',
    design: {
      pageBorderId: 'filigree',
      blockBorderId: 'parchment',
      headingStyleId: 'centered-pill',
      ornamentId: 'star',
      dropCap: true,
      kicker: false,
      pageNumbers: 'arabic'
    }
  },
  {
    id: 'handmade-craft',
    name: 'Handmade craft',
    blurb: 'Stitched border, dashed note boxes and a relaxed left-aligned title.',
    design: {
      pageBorderId: 'dashed-craft',
      blockBorderId: 'ticket',
      headingStyleId: 'left-bar',
      ornamentId: 'dots',
      dropCap: false,
      kicker: false,
      pageNumbers: 'arabic'
    }
  },
  {
    id: 'keepsake-frame',
    name: 'Keepsake frame',
    blurb: 'Crested corners, tinted panels and a centred pill title.',
    design: {
      pageBorderId: 'crest-corners',
      blockBorderId: 'tinted-panel',
      headingStyleId: 'centered-pill',
      ornamentId: 'crest',
      dropCap: true,
      kicker: true,
      pageNumbers: 'roman'
    }
  }
]);

export function getDesignPreset(id) {
  return DESIGN_PRESETS.find((preset) => preset.id === id) || null;
}

/* ------------------------------------------------------------------ */
/* Template design resolution                                          */
/* ------------------------------------------------------------------ */

const BORDER_BY_TEMPLATE_BORDER_STYLE = {
  'double-gold': 'double-rule',
  'rounded-frame': 'soft-rounded',
  'clean-line': 'hairline',
  ornate: 'corner-flourish',
  'dashed-accent': 'dashed-craft'
};

const HEADING_BY_TEMPLATE_HEADING_STYLE = {
  'top-banner': 'top-banner',
  'centered-pill': 'centered-pill',
  'underline-bar': 'centered-rule',
  'crest-banner': 'masthead',
  minimal: 'minimal-caps'
};

/**
 * Per-template fidelity notes, read from the sample preview photograph for
 * that template: the frame ornament, the heading treatment, block treatment
 * and page furniture that the sample clearly shows.
 *
 * Anything not listed here inherits the category treatment below, which keeps
 * the 48 templates consistent while letting the distinctive samples match.
 */
export const TEMPLATE_DESIGN_OVERRIDES = Object.freeze({
  // --- Photo books: matted gallery frames, caption plaques -------------
  'photo-warm-family': { pageBorderId: 'corner-flourish', blockBorderId: 'parchment', headingStyleId: 'centered-rule', ornamentId: 'fleur', kicker: true, blockFillId: 'paper', blockDepthId: 'soft' },
  'photo-modern-minimal': { pageBorderId: 'pinstripe', blockBorderId: 'shadow-card', headingStyleId: 'top-banner', ornamentId: 'rule', kicker: false, blockFillId: 'clear', blockDepthId: 'flat' },
  'photo-gallery-frame': { pageBorderId: 'filigree', blockBorderId: 'tinted-panel', headingStyleId: 'centered-pill', ornamentId: 'diamond', kicker: true, blockFillId: 'paper', blockDepthId: 'raised', blockOverlap: 'over-image' },
  'photo-vintage-polaroid': { pageBorderId: 'dashed-craft', blockBorderId: 'ticket', headingStyleId: 'centered-pill', ornamentId: 'asterisk', kicker: false, blockFillId: 'paper', blockDepthId: 'raised', pageTextureId: 'aged', blockOverlap: 'over-image' },
  'photo-botanical-sage': { pageBorderId: 'corner-flourish', blockBorderId: 'parchment', headingStyleId: 'centered-pill', ornamentId: 'fleur', kicker: false, blockFillId: 'wash', blockDepthId: 'soft' },
  'photo-wedding-ivory': { pageBorderId: 'filigree', blockBorderId: 'parchment', headingStyleId: 'kicker-overline', ornamentId: 'crest', kicker: true, blockFillId: 'paper', blockDepthId: 'soft', pageTextureId: 'vellum', blockOverlap: 'over-image' },
  'photo-monochrome-noir': { pageBorderId: 'gallery-matte', blockBorderId: 'rule-only', headingStyleId: 'minimal-caps', ornamentId: 'rule', kicker: true, blockFillId: 'clear', blockDepthId: 'flat' },
  'photo-sunset-terracotta': { pageBorderId: 'ribbon-corners', blockBorderId: 'tinted-panel', headingStyleId: 'top-banner', ornamentId: 'diamond', kicker: false, blockFillId: 'wash', blockDepthId: 'raised', blockOverlap: 'stacked' },

  // --- Cookbooks: framed recipe cards, ingredient boxes ----------------
  'cook-warm-border': { pageBorderId: 'double-rule', blockBorderId: 'parchment', headingStyleId: 'top-banner', ornamentId: 'rule', kicker: false, blockFillId: 'paper', blockDepthId: 'raised', blockOverlap: 'over-image' },
  'cook-modern-spread': { pageBorderId: 'hairline', blockBorderId: 'tinted-panel', headingStyleId: 'left-bar', ornamentId: 'rule', kicker: true, blockFillId: 'clear', blockDepthId: 'flat' },
  'cook-cozy-bakehouse': { pageBorderId: 'soft-rounded', blockBorderId: 'tinted-panel', headingStyleId: 'centered-pill', ornamentId: 'fleur', kicker: false, blockFillId: 'paper', blockDepthId: 'raised', pageTextureId: 'linen', blockOverlap: 'over-image' },
  'cook-mediterranean-sun': { pageBorderId: 'double-rule', blockBorderId: 'parchment', headingStyleId: 'top-banner', ornamentId: 'diamond', kicker: false, blockFillId: 'paper', blockDepthId: 'soft' },
  'cook-rustic-farmhouse': { pageBorderId: 'corner-flourish', blockBorderId: 'double-rule', headingStyleId: 'centered-rule', ornamentId: 'fleur', kicker: true, blockFillId: 'paper', blockDepthId: 'soft', pageTextureId: 'aged' },
  'cook-plant-botanical': { pageBorderId: 'soft-rounded', blockBorderId: 'tinted-panel', headingStyleId: 'top-banner', ornamentId: 'fleur', kicker: false, blockFillId: 'wash', blockDepthId: 'soft' },
  'cook-french-bistro': { pageBorderId: 'filigree', blockBorderId: 'parchment', headingStyleId: 'centered-pill', ornamentId: 'crest', kicker: true, blockFillId: 'paper', blockDepthId: 'raised', blockOverlap: 'over-image' },
  'cook-fiesta-spice': { pageBorderId: 'ribbon-corners', blockBorderId: 'tinted-panel', headingStyleId: 'top-banner', ornamentId: 'star', kicker: false, blockFillId: 'wash', blockDepthId: 'raised', blockOverlap: 'stacked' },

  // --- Magazines: mastheads, rules, no ornamental frame ----------------
  'mag-bold-editorial': { pageBorderId: 'masthead-band', blockBorderId: 'rule-only', headingStyleId: 'masthead', ornamentId: 'rule', kicker: true, blockFillId: 'clear', blockDepthId: 'flat', blockOverlap: 'floating' },
  'mag-lifestyle-minimal': { pageBorderId: 'hairline', blockBorderId: 'shadow-card', headingStyleId: 'minimal-caps', ornamentId: 'dots', kicker: false, blockFillId: 'clear', blockDepthId: 'soft' },
  'mag-indigo-digest': { pageBorderId: 'inner-rule', blockBorderId: 'top-accent', headingStyleId: 'left-bar', ornamentId: 'diamond', kicker: true, blockFillId: 'wash', blockDepthId: 'soft' },
  'mag-art-culture': { pageBorderId: 'pinstripe', blockBorderId: 'rule-only', headingStyleId: 'masthead', ornamentId: 'rule', kicker: true, blockFillId: 'clear', blockDepthId: 'flat' },
  'mag-tech-future': { pageBorderId: 'masthead-band', blockBorderId: 'tinted-panel', headingStyleId: 'masthead', ornamentId: 'diamond', kicker: true, blockFillId: 'rich', blockDepthId: 'raised', blockOverlap: 'stacked' },
  'mag-travel-wanderlust': { pageBorderId: 'ribbon-corners', blockBorderId: 'shadow-card', headingStyleId: 'top-banner', ornamentId: 'star', kicker: false, blockFillId: 'paper', blockDepthId: 'raised', blockOverlap: 'over-image' },
  'mag-fashion-vogue': { pageBorderId: 'inner-rule', blockBorderId: 'parchment', headingStyleId: 'centered-pill', ornamentId: 'crest', kicker: true, blockFillId: 'paper', blockDepthId: 'soft', pageTextureId: 'vellum', blockOverlap: 'over-image' },
  'mag-sports-action': { pageBorderId: 'masthead-band', blockBorderId: 'top-accent', headingStyleId: 'masthead', ornamentId: 'rule', kicker: true, blockFillId: 'rich', blockDepthId: 'flat' },

  // --- Storybooks: arch windows and ornamented frames ------------------
  'story-starlight-frame': { pageBorderId: 'filigree', blockBorderId: 'parchment', headingStyleId: 'kicker-overline', ornamentId: 'star', kicker: true, dropCap: true, blockFillId: 'paper', blockDepthId: 'raised', pageTextureId: 'vellum', blockOverlap: 'over-image' },
  'story-sunny-adventure': { pageBorderId: 'arch-window', blockBorderId: 'tinted-panel', headingStyleId: 'centered-pill', ornamentId: 'star', kicker: false, blockFillId: 'wash', blockDepthId: 'soft' },
  'story-ocean-treasure': { pageBorderId: 'arch-window', blockBorderId: 'tinted-panel', headingStyleId: 'top-banner', ornamentId: 'dots', kicker: false },
  'story-woodland-friends': { pageBorderId: 'corner-flourish', blockBorderId: 'parchment', headingStyleId: 'centered-pill', ornamentId: 'fleur', kicker: false, blockFillId: 'paper', blockDepthId: 'raised', pageTextureId: 'linen', blockOverlap: 'stacked' },
  'story-cosmic-rocket': { pageBorderId: 'ribbon-corners', blockBorderId: 'shadow-card', headingStyleId: 'top-banner', ornamentId: 'star', kicker: false, blockFillId: 'rich', blockDepthId: 'raised' },
  'story-fairy-castle': { pageBorderId: 'filigree', blockBorderId: 'parchment', headingStyleId: 'kicker-overline', ornamentId: 'crest', kicker: true, blockFillId: 'paper', blockDepthId: 'raised', pageTextureId: 'vellum', blockOverlap: 'over-image' },
  'story-dino-jungle': { pageBorderId: 'dashed-craft', blockBorderId: 'tinted-panel', headingStyleId: 'top-banner', ornamentId: 'asterisk', kicker: false },
  'story-pastel-lullaby': { pageBorderId: 'soft-rounded', blockBorderId: 'tinted-panel', headingStyleId: 'centered-pill', ornamentId: 'star', kicker: false, blockFillId: 'wash', blockDepthId: 'soft', pageTextureId: 'vellum' },

  // --- How-to guides: banners, numbered steps, callouts ----------------
  'info-blue-guide': { pageBorderId: 'none', blockBorderId: 'shadow-card', headingStyleId: 'masthead', ornamentId: 'rule', kicker: true, blockFillId: 'clear', blockDepthId: 'flat' },
  'info-emerald-handbook': { pageBorderId: 'hairline', blockBorderId: 'tinted-panel', headingStyleId: 'left-bar', ornamentId: 'diamond', kicker: true, blockFillId: 'wash', blockDepthId: 'soft' },
  'info-amber-workshop': { pageBorderId: 'dashed-craft', blockBorderId: 'ticket', headingStyleId: 'top-banner', ornamentId: 'asterisk', kicker: false, blockFillId: 'paper', blockDepthId: 'soft', blockOverlap: 'over-image' },
  'info-purple-masterclass': { pageBorderId: 'soft-rounded', blockBorderId: 'tinted-panel', headingStyleId: 'top-banner', ornamentId: 'star', kicker: true, blockFillId: 'paper', blockDepthId: 'raised', blockOverlap: 'floating' },
  'info-teal-wellness': { pageBorderId: 'soft-rounded', blockBorderId: 'left-accent', headingStyleId: 'top-banner', ornamentId: 'dots', kicker: false, blockFillId: 'wash', blockDepthId: 'soft' },
  'info-slate-business': { pageBorderId: 'pinstripe', blockBorderId: 'hairline', headingStyleId: 'minimal-caps', ornamentId: 'rule', kicker: true, blockFillId: 'paper', blockDepthId: 'soft' },
  'info-coral-parenting': { pageBorderId: 'soft-rounded', blockBorderId: 'tinted-panel', headingStyleId: 'top-banner', ornamentId: 'fleur', kicker: false, blockFillId: 'paper', blockDepthId: 'soft' },
  'info-indigo-tech': { pageBorderId: 'pinstripe', blockBorderId: 'shadow-card', headingStyleId: 'masthead', ornamentId: 'diamond', kicker: true, blockFillId: 'rich', blockDepthId: 'soft' },

  // --- Chapter books: the classic print samples ------------------------
  'book-modern-clean': { pageBorderId: 'hairline', blockBorderId: 'rule-only', headingStyleId: 'minimal-caps', ornamentId: 'rule', kicker: true, blockFillId: 'clear', blockDepthId: 'flat' },
  'book-warm-classic': { pageBorderId: 'filigree', blockBorderId: 'parchment', headingStyleId: 'kicker-overline', ornamentId: 'fleur', dropCap: true, kicker: true, pageNumbers: 'roman', blockFillId: 'paper', blockDepthId: 'soft' },
  'book-vintage-memoir': { pageBorderId: 'corner-flourish', blockBorderId: 'parchment', headingStyleId: 'centered-rule', ornamentId: 'fleur', dropCap: true, kicker: true, pageNumbers: 'roman', blockFillId: 'paper', blockDepthId: 'soft', pageTextureId: 'aged', blockOverlap: 'stacked' },
  'book-thriller-noir': { pageBorderId: 'inner-rule', blockBorderId: 'rule-only', headingStyleId: 'minimal-caps', ornamentId: 'rule', kicker: true, blockFillId: 'clear', blockDepthId: 'flat' },
  'book-romance-blush': { pageBorderId: 'corner-flourish', blockBorderId: 'parchment', headingStyleId: 'centered-pill', ornamentId: 'fleur', dropCap: true, kicker: false, blockFillId: 'paper', blockDepthId: 'soft', pageTextureId: 'vellum', blockOverlap: 'stacked' },
  'book-scifi-cosmos': { pageBorderId: 'pinstripe', blockBorderId: 'tinted-panel', headingStyleId: 'kicker-overline', ornamentId: 'star', kicker: true, blockFillId: 'rich', blockDepthId: 'raised' },
  'book-poetry-ivory': { pageBorderId: 'inner-rule', blockBorderId: 'underline-only', headingStyleId: 'kicker-overline', ornamentId: 'diamond', kicker: true, blockFillId: 'clear', blockDepthId: 'flat', pageTextureId: 'vellum' },
  'book-historical-crest': { pageBorderId: 'crest-corners',
    blockBorderId: 'parchment',
    headingStyleId: 'kicker-overline',
    ornamentId: 'crest',
    dropCap: true,
    // The sample shows a maroon illuminated initial and "— Page I —", so the
    // rendered chapter matches the picture the author chose from.
    dropCapStyle: 'boxed',
    kicker: true,
    pageNumbers: 'roman',
    pageNumberWord: 'Page',
    // Cream card blocks lifted off a gently aged page, as in the sample.
    blockFillId: 'paper',
    blockDepthId: 'soft',
    pageTextureId: 'aged'
  },

  // --- Workbooks --------------------------------------------------------
  'work-teal-planner': { pageBorderId: 'hairline', blockBorderId: 'hairline', headingStyleId: 'top-banner', ornamentId: 'rule', kicker: true },
  'work-indigo-journal': { pageBorderId: 'soft-rounded', blockBorderId: 'rule-only', headingStyleId: 'centered-pill', ornamentId: 'dots', kicker: false }
});

/** Category-level fallbacks, used when a template has no explicit override. */
const CATEGORY_DESIGN_DEFAULTS = Object.freeze({
  photobook: { pageBorderId: 'inner-rule', blockBorderId: 'parchment', headingStyleId: 'centered-rule', ornamentId: 'diamond', kicker: true },
  cookbook: { pageBorderId: 'double-rule', blockBorderId: 'parchment', headingStyleId: 'top-banner', ornamentId: 'rule', kicker: false },
  magazine: { pageBorderId: 'masthead-band', blockBorderId: 'rule-only', headingStyleId: 'masthead', ornamentId: 'rule', kicker: true },
  storybook: { pageBorderId: 'arch-window', blockBorderId: 'parchment', headingStyleId: 'centered-pill', ornamentId: 'star', kicker: false },
  informational: { pageBorderId: 'hairline', blockBorderId: 'tinted-panel', headingStyleId: 'top-banner', ornamentId: 'diamond', kicker: true },
  book: { pageBorderId: 'double-rule', blockBorderId: 'rule-only', headingStyleId: 'kicker-overline', ornamentId: 'fleur', kicker: true },
  workbook: { pageBorderId: 'hairline', blockBorderId: 'hairline', headingStyleId: 'top-banner', ornamentId: 'rule', kicker: true }
});

export function getTemplateCategoryId(templateId) {
  const key = String(templateId || '');
  if (!key) return null;
  for (const [categoryId, templates] of Object.entries(TEMPLATES_BY_CATEGORY)) {
    if ((templates || []).some((template) => template.id === key)) return categoryId;
  }
  return null;
}

const DEFAULTS = Object.freeze({
  pageBorderId: 'inner-rule',
  blockBorderId: 'parchment',
  headingStyleId: 'centered-rule',
  ornamentId: 'fleur',
  dropCap: false,
  dropCapStyle: 'plain',
  blockFillId: 'auto',
  blockDepthId: 'soft',
  blockOverlap: 'inline',
  pageTextureId: 'none',
  kicker: true,
  pageNumbers: 'arabic',
  pageNumberWord: '',
  borderColor: '',
  blockColor: '',
  accentColor: ''
});

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

/**
 * Resolve a template plus the author's design choices into the exact
 * decoration spec every renderer uses.
 *
 * @param {object} template  A visual template from the catalogue.
 * @param {object} overrides `coverConfig.design` — any of the DEFAULTS keys.
 * @param {object} [options] `{ fontFamily }` — a book-wide font choice.
 */
export function resolveTemplateDesign(template = {}, overrides = {}, options = {}) {
  const categoryId = getTemplateCategoryId(template?.id) || template?.categoryId || 'book';
  const categoryDefaults = CATEGORY_DESIGN_DEFAULTS[categoryId] || CATEGORY_DESIGN_DEFAULTS.book;
  const templateDefaults = TEMPLATE_DESIGN_OVERRIDES[template?.id] || {};
  const safeOverrides = overrides && typeof overrides === 'object' ? overrides : {};

  const derived = {
    ...DEFAULTS,
    pageBorderId: pick(
      template?.pageBorderId,
      BORDER_BY_TEMPLATE_BORDER_STYLE[template?.borderStyle],
      categoryDefaults.pageBorderId,
      DEFAULTS.pageBorderId
    ),
    headingStyleId: pick(
      template?.headingStyleId,
      HEADING_BY_TEMPLATE_HEADING_STYLE[template?.headingStyle],
      categoryDefaults.headingStyleId,
      DEFAULTS.headingStyleId
    ),
    ...categoryDefaults,
    ...templateDefaults
  };

  const pageBg = toHex(pick(template?.pageBg, '#FFFFFF'), '#FFFFFF');
  const pageText = toHex(pick(template?.pageText, '#1F2937'), '#1F2937');
  const templateBorder = toHex(pick(template?.borderColor, pageText), pageText);
  const templateAccent = toHex(pick(template?.accentColor, templateBorder), templateBorder);

  const borderColor = toHex(pick(safeOverrides.borderColor, templateBorder), templateBorder);
  const accentColor = toHex(pick(safeOverrides.accentColor, templateAccent), templateAccent);
  const blockColor = toHex(pick(safeOverrides.blockColor, templateBorder), templateBorder);

  const fontFamily = pick(options.fontFamily, template?.fontFamily, 'Plus Jakarta Sans');

  const design = {
    categoryId,
    templateId: template?.id || '',
    templateName: template?.name || '',
    fontFamily,
    fontStack: fontStackFor(fontFamily),
    serif: isSerifFont(fontFamily),
    displaySerif: isDisplaySerif(fontFamily),
    pageBg,
    pageText,
    borderColor,
    accentColor,
    blockColor,
    matteColor: mixColors(pageText, pageBg, 0.72),
    // Text colours that stay readable no matter which palette or override.
    headingColor: readableInk(accentColor, pageBg, { fallback: pageText, min: 4.5 }),
    bodyText: readableInk(pageText, pageBg, { fallback: pageText, min: 4.6 }),
    mutedText: mutedInk(pageText, pageBg),
    borderInk: readableInk(borderColor, pageBg, { fallback: pageText, min: 3 }),
    accentInk: readableInk(accentColor, pageBg, { fallback: pageText, min: 3.2 }),
    pageBorderId: getPageBorderStyle(pick(safeOverrides.pageBorderId, derived.pageBorderId)).id,
    blockBorderId: getBlockBorderStyle(pick(safeOverrides.blockBorderId, derived.blockBorderId)).id,
    headingStyleId: getHeadingStyle(pick(safeOverrides.headingStyleId, derived.headingStyleId)).id,
    ornamentId: getOrnament(pick(safeOverrides.ornamentId, derived.ornamentId)).id,
    dropCap: pick(safeOverrides.dropCap, derived.dropCap) !== false,
    dropCapStyle: pick(safeOverrides.dropCapStyle, derived.dropCapStyle) === 'boxed' ? 'boxed' : 'plain',
    // Block colour, card depth and aged-paper choice.
    blockFillId: getBlockFill(pick(safeOverrides.blockFillId, derived.blockFillId)).id,
    blockDepthId: getBlockDepth(pick(safeOverrides.blockDepthId, derived.blockDepthId)).id,
    blockOverlap: getBlockPlacement(pick(safeOverrides.blockOverlap, derived.blockOverlap)).id,
    pageTextureId: getPageTexture(pick(safeOverrides.pageTextureId, derived.pageTextureId)).id,
    kicker: pick(safeOverrides.kicker, derived.kicker) !== false,
    // An explicit empty string means "number only", so check the key itself
    // rather than falling back to the template's wording.
    pageNumberWord: String(
      Object.prototype.hasOwnProperty.call(safeOverrides, 'pageNumberWord')
        ? safeOverrides.pageNumberWord
        : derived.pageNumberWord
    ).slice(0, 12),
    pageNumbers: PAGE_NUMBER_FORMATS.some((format) => format.id === safeOverrides.pageNumbers)
      ? safeOverrides.pageNumbers
      : (PAGE_NUMBER_FORMATS.some((format) => format.id === derived.pageNumbers) ? derived.pageNumbers : 'arabic'),
    // Book-wide font override (project.coverConfig.fontFamily).
    fontOverride: Boolean(options.fontFamily),
    presetId: safeOverrides.presetId || ''
  };

  // Resolve the paint that depends on the colours above, once, so every
  // renderer (studio, wizard preview, Introduction page, export) agrees.
  design.blockFill = blockFillColor(design);
  design.blockDepthShadow = blockDepthShadow(design);
  design.pageTexture = pageTextureLayers(design);

  return design;
}

/**
 * The concrete typography/layout treatment for a page heading.
 *
 * Shared by the page renderer, the Introduction page and the cover so a
 * template's heading always looks the same everywhere. `titleColor` is
 * contrast-checked against whatever surface the heading actually sits on
 * (an accent banner, a pill, or the page itself).
 */
export function headingTreatment(design = {}, options = {}) {
  const styleId = getHeadingStyle(options.headingStyleId || design.headingStyleId).id;
  const pageBg = design.pageBg || '#FFFFFF';
  const accent = design.accentColor || design.borderColor || '#8F6534';
  const border = design.borderColor || accent;
  const ornament = getOrnament(design.ornamentId);
  const base = {
    styleId,
    align: 'center',
    kicker: Boolean(design.kicker),
    kickerColor: design.borderInk || border,
    dividerColor: design.borderInk || border,
    ornament,
    wrapperStyle: {},
    titleStyle: {
      color: design.headingColor || accent,
      fontFamily: design.fontStack,
      fontWeight: design.serif ? 700 : 800,
      letterSpacing: design.serif ? '0.005em' : '0.01em'
    },
    titleSize: 'clamp(1.4rem, 3.1vw, 2.15rem)',
    titleTransform: 'none',
    subtitleColor: design.mutedText || design.pageText,
    bandStyle: null
  };

  switch (styleId) {
    case 'top-banner':
      return {
        ...base,
        align: 'center',
        titleStyle: {
          ...base.titleStyle,
          color: readableInk('#FFFFFF', accent, { fallback: design.pageText, min: 4.5 }),
          letterSpacing: '0.06em'
        },
        titleTransform: 'uppercase',
        bandStyle: {
          background: `linear-gradient(160deg, ${accent}, ${mixColors(accent, '#000000', 0.16)})`,
          borderRadius: 8,
          padding: '0.7rem 1rem',
          boxShadow: `inset 0 0 0 1px ${withAlpha('#FFFFFF', 0.18)}`
        },
        subtitleColor: readableInk(withAlpha('#FFFFFF', 0.92), accent, { fallback: '#FFFFFF', min: 3.2 })
      };
    case 'centered-pill':
      return {
        ...base,
        align: 'center',
        titleStyle: {
          ...base.titleStyle,
          color: readableInk(accent, pageBg, { fallback: design.pageText, min: 4.5 })
        },
        titleTransform: 'none',
        wrapperStyle: {
          display: 'inline-block',
          border: `2px solid ${withAlpha(accent, 0.75)}`,
          borderRadius: 999,
          padding: '0.4rem 1.35rem',
          background: withAlpha(accent, 0.08)
        }
      };
    case 'left-bar':
      return {
        ...base,
        align: 'left',
        titleStyle: { ...base.titleStyle, color: readableInk(design.headingColor, pageBg, { fallback: design.pageText }) },
        wrapperStyle: {
          borderLeft: `6px solid ${accent}`,
          paddingLeft: '0.8rem',
          textAlign: 'left'
        }
      };
    case 'kicker-overline':
      return { ...base, align: 'center', kicker: true };
    case 'masthead':
      return {
        ...base,
        align: 'left',
        kicker: true,
        titleStyle: {
          ...base.titleStyle,
          color: readableInk(accent, pageBg, { fallback: design.pageText, min: 4.5 }),
          letterSpacing: '0.08em'
        },
        titleTransform: 'uppercase',
        wrapperStyle: {
          borderTop: `4px solid ${accent}`,
          borderBottom: `1px solid ${withAlpha(border, 0.55)}`,
          paddingTop: '0.55rem',
          paddingBottom: '0.55rem',
          textAlign: 'left'
        }
      };
    case 'minimal-caps':
      return {
        ...base,
        align: 'left',
        kicker: false,
        titleStyle: {
          ...base.titleStyle,
          color: readableInk(design.pageText, pageBg, { fallback: design.pageText }),
          letterSpacing: '0.14em',
          fontWeight: 700
        },
        titleTransform: 'uppercase',
        titleSize: 'clamp(1rem, 2vw, 1.35rem)'
      };
    case 'centered-rule':
    default:
      return {
        ...base,
        align: 'center',
        dividerColor: accent,
        titleStyle: {
          ...base.titleStyle,
          color: readableInk(accent, pageBg, { fallback: design.pageText, min: 4.5 })
        }
      };
  }
}

/** Build the CSS for one text block using the resolved design. */
export function blockStyleFor(design, options = {}) {
  const style = getBlockBorderStyle(design?.blockBorderId);
  const css = style.style({
    pageBg: design?.pageBg || '#FFFFFF',
    border: design?.blockColor || design?.borderColor || '#8F6534',
    accent: design?.accentColor || design?.borderColor || '#8F6534',
    pageText: design?.pageText || '#1F2937',
    radius: options.radius
  });

  // Fill and depth are layered on top of the chosen block treatment: a
  // parchment card can also be a warm coloured card, and every block can sit
  // a little above the page.
  const fill = blockFillColor(design, options.fillId);
  const depth = blockDepthShadow(design, options.depthId);
  const baseShadow = options.keepBaseShadow === false ? '' : (css.boxShadow || '');

  return {
    ...css,
    ...(fill ? { background: fill } : null),
    ...(depth ? { boxShadow: [baseShadow, depth].filter(Boolean).join(', ') } : null),
    ...(options.style || {})
  };
}

/** The three colours offered as one-tap border choices for a template. */
export function borderColorChoices(template = {}) {
  const pageBg = toHex(template.pageBg || '#FFFFFF');
  const pageText = toHex(template.pageText || '#1F2937');
  const border = toHex(template.borderColor || pageText);
  const accent = toHex(template.accentColor || border);
  return [
    { value: border, label: 'Template border' },
    { value: accent, label: 'Template accent' },
    { value: pageText, label: 'Ink' },
    { value: mixColors(border, pageText, 0.55), label: 'Deep shade' },
    { value: mixColors(accent, pageBg, 0.25), label: 'Soft tint' },
    { value: '#B45309', label: 'Antique gold' },
    { value: '#1F2937', label: 'Charcoal' },
    { value: '#7F1D1D', label: 'Deep red' },
    { value: '#1E3A5F', label: 'Navy' },
    { value: '#14532D', label: 'Forest' }
  ];
}

/** Roman/arabic page number label, wrapped in the template's ornament. */
export function pageNumberLabel(pageIndex, design) {
  const format = design?.pageNumbers || 'arabic';
  if (format === 'none') return '';
  const number = Number(pageIndex) + 1;
  return format === 'roman' ? toRoman(Math.max(1, number)) : String(Math.max(1, number));
}
