/**
 * ORNAMENTAL BORDER ARTWORK
 * -------------------------
 * The sample books in the chooser do not frame their pages with a single rule:
 * they use printed ornaments — curling scroll-work in the corners and small
 * motifs repeated along each edge (leaves, scallops, diamonds, waves, stars).
 *
 * A CSS `border` cannot draw those, so the page frames carry real vector
 * artwork. The artwork is stored as *geometry*, not as a picture, so the same
 * shapes are drawn three times from one definition:
 *
 *   - inline SVG in the studio and the writer's preview,
 *   - vector paths in the PDF (`server/designMirror.js`),
 *   - data-URI artwork in the EPUB stylesheet.
 *
 * Every shape therefore uses only straight and cubic-bezier segments plus
 * circles — the small subset the PDF renderer can reproduce exactly.
 */

import ornamentArt from './ornamentArt.json';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ */
/* Corner scroll-work                                                   */
/* ------------------------------------------------------------------ */

/**
 * The corner geometry and the edge motifs live in `ornamentArt.json`, beside
 * the page-border definitions, so the studio and the PDF/EPUB exporters draw
 * the identical shapes. This module turns that geometry into SVG.
 */
export const SCROLL_CORNER = Object.freeze(ornamentArt.scrollCorner);

/** Build one path element as SVG markup. */
function pathMarkup(path, color, opacity) {
  const alpha = ((path.opacity ?? 1) * opacity).toFixed(3);
  if (path.fill) {
    return `<path d="${path.d}" fill="${color}" stroke="none" opacity="${alpha}"/>`;
  }
  return `<path d="${path.d}" fill="none" stroke="${color}" stroke-width="${path.width}" stroke-linecap="round" opacity="${alpha}"/>`;
}

/** The corner as a compact standalone SVG (used for data URIs). */
export function scrollCornerSvg(color, opacity = 1, size = 100) {
  const body = [
    ...SCROLL_CORNER.paths.map((path) => pathMarkup(path, color, opacity)),
    ...SCROLL_CORNER.circles.map(
      (circle) =>
        `<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="${color}" opacity="${((circle.opacity ?? 1) * opacity).toFixed(3)}"/>`
    )
  ].join('');
  return `<svg xmlns="${SVG_NS}" viewBox="${SCROLL_CORNER.viewBox}" width="${size}" height="${size}">${body}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Repeated edge motifs                                                 */
/* ------------------------------------------------------------------ */

/**
 * One repeatable tile: `width` × `height` in px, drawn with the page edge at
 * the top of the tile. The same tile dresses all four sides, rotated by CSS,
 * and the foot of the page uses it turned over so the motifs point inward.
 */
export const EDGE_PATTERNS = Object.freeze(ornamentArt.edgePatterns);

export const EDGE_PATTERN_IDS = Object.freeze(Object.keys(EDGE_PATTERNS));

/** One motif tile as SVG markup (shared by the data URI and the renderers). */
export function motifSvg(motif, color, opacity = 1) {
  if (!motif) return '';
  const body = [
    ...(motif.paths || []).map((path) => pathMarkup(path, color, opacity)),
    ...(motif.circles || []).map(
      (circle) =>
        `<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="${color}" opacity="${((circle.opacity ?? 1) * opacity).toFixed(3)}"/>`
    )
  ].join('');
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${motif.width} ${motif.height}" width="${motif.width}" height="${motif.height}">${body}</svg>`;
}

/**
 * A motif tile as a standalone SVG, already turned the way the edge needs it:
 * the foot of the page is flipped so the motifs point inward, the sides are
 * given a quarter-turn. Turning the artwork (instead of scaling it) keeps every
 * motif the same size on all four edges.
 */
export function motifTileSvg(motifId, color = '#000000', opacity = 1, edge = 'top') {
  const motif = EDGE_PATTERNS[motifId];
  if (!motif) return '';
  const body = [
    ...(motif.paths || []).map((path) => pathMarkup(path, color, opacity)),
    ...(motif.circles || []).map(
      (circle) =>
        `<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="${color}" opacity="${((circle.opacity ?? 1) * opacity).toFixed(3)}"/>`
    )
  ].join('');
  const { width, height } = motifSize(motifId, edge);
  const rotation = edge === 'bottom' ? 180 : edge === 'left' ? 90 : edge === 'right' ? 270 : 0;
  const transform = rotation
    ? ` transform="rotate(${rotation} ${motif.width / 2} ${motif.height / 2})"`
    : '';
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${motif.width} ${motif.height}" width="${width}" height="${height}"><g${transform}>${body}</g></svg>`;
}

/** The tile's on-screen footprint once it has been turned for its edge. */
export function motifSize(motifId, edge = 'top') {
  const motif = EDGE_PATTERNS[motifId];
  if (!motif) return { width: 0, height: 0 };
  return edge === 'left' || edge === 'right'
    ? { width: motif.height, height: motif.width }
    : { width: motif.width, height: motif.height };
}

/** A CSS `url()` value that repeats the motif, safe for inline styles. */
export function edgePatternDataUri(motifId, color = '#000000', opacity = 1, edge = 'top') {
  const svg = motifTileSvg(motifId, color, Number(opacity), edge);
  if (!svg) return '';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Ready-to-spread CSS for one patterned edge.
 * `edge` is 'top' | 'bottom' | 'left' | 'right'.
 */
export function edgePatternStyle(motifId, edge, color, opacity = 1, scale = 1) {
  const motif = EDGE_PATTERNS[motifId];
  if (!motif) return null;
  const horizontal = edge === 'top' || edge === 'bottom';
  const size = motifSize(motifId, edge);
  const factor = Number(scale) > 0 ? Number(scale) : 1;
  const tileWidth = size.width * factor;
  const tileHeight = size.height * factor;
  return {
    backgroundImage: edgePatternDataUri(motifId, color, opacity, edge),
    backgroundRepeat: horizontal ? 'repeat-x' : 'repeat-y',
    backgroundSize: `${tileWidth}px ${tileHeight}px`,
    backgroundPosition: 'left top',
    height: horizontal ? tileHeight : '100%',
    width: horizontal ? '100%' : tileWidth
  };
}

/** Which corner of the 100 × 100 box each printed scroll-work must be rotated to. */
export const SCROLL_CORNER_ROTATIONS = Object.freeze(ornamentArt.cornerRotations);

/** Every corner as markup, for server-side SVG and the EPUB stylesheet. */
export function scrollCornersSvg(color, opacity = 1, size = 100) {
  const single = scrollCornerSvg(color, opacity, size);
  return SCROLL_CORNER_ROTATIONS.map((corner) => ({ corner, svg: single }));
}
