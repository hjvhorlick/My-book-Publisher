/**
 * DESIGN MIRROR (server side)
 * ---------------------------
 * The studio, the wizard previews and the printed book all take their
 * decoration from `src/data/designData.json` (page borders, ornaments,
 * template defaults, page numbering) plus the colour maths in
 * `src/data/designSystem.js`. Exports are rendered on the server, where the
 * browser bundle cannot be imported, so this file mirrors that design for PDF
 * and EPUB — including the drawn scroll-work and printed edge patterns.
 *
 * The shared JSON is the single source of truth for *which* ornaments exist,
 * so a border added in the studio is available to the exporters immediately.
 */

const designData = require('../src/data/designData.json');
const ornamentArtData = require('../src/data/ornamentArt.json');

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
/* Shared design data                                                   */
/* ------------------------------------------------------------------ */

const PAGE_BORDER_LAYERS = Object.freeze(
  Object.fromEntries(designData.pageBorders.map((border) => [border.id, border.layers]))
);
const PAGE_BORDER_IDS = Object.freeze(Object.keys(PAGE_BORDER_LAYERS));
const BLOCK_BORDER_IDS = Object.freeze(designData.blockBorders.map((style) => style.id));
const HEADING_STYLE_IDS = Object.freeze(designData.headings.map((style) => style.id));
const PAGE_NUMBER_FORMATS = Object.freeze(designData.pageNumbers.map((format) => format.id));
const SANS_FONTS = Object.freeze(['Plus Jakarta Sans', 'Inter']);

// The ornament artwork is geometry, shared with the browser through the same
// JSON file, so a curl drawn in the studio prints exactly the same shape.
const scrollCornerGeometry = ornamentArtData.scrollCorner;
const edgePatternGeometry = ornamentArtData.edgePatterns;
const cornerRotations = ornamentArtData.cornerRotations;

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
 * Resolve the stored page design (`project.coverConfig`) into the values the
 * exporters need. Mirrors `resolveTemplateDesign`: category default → template
 * fidelity notes → the author's own choices.
 */
function resolveExportDesign(coverConfig = {}) {
  const config = coverConfig && typeof coverConfig === 'object' ? coverConfig : {};
  const overrides = config.design && typeof config.design === 'object' ? config.design : {};

  const templateId = pick(config.visualTemplateId, config.templateId, '');
  const categoryId = designData.templateCategory[templateId] || pick(config.categoryId, 'book');
  const categoryDefaults = designData.categoryDefaults[categoryId] || designData.categoryDefaults.book;
  const templateDefaults = designData.templateOverrides[templateId] || {};

  const pageBg = toHex(pick(config.pageBg, '#FFFFFF'), '#FFFFFF');
  const pageText = toHex(pick(config.pageText, '#1F2937'), '#1F2937');
  const templateBorder = toHex(pick(config.borderColor, pageText), pageText);
  const templateAccent = toHex(pick(config.accentColor, templateBorder), templateBorder);

  const borderColor = toHex(pick(overrides.borderColor, templateBorder), templateBorder);
  const accentColor = toHex(pick(overrides.accentColor, templateAccent), templateAccent);
  const blockColor = toHex(pick(overrides.blockColor, borderColor), borderColor);

  const pageBorderId = PAGE_BORDER_IDS.includes(pick(overrides.pageBorderId, templateDefaults.pageBorderId, categoryDefaults.pageBorderId))
    ? pick(overrides.pageBorderId, templateDefaults.pageBorderId, categoryDefaults.pageBorderId)
    : 'hairline';
  const blockBorderId = BLOCK_BORDER_IDS.includes(pick(overrides.blockBorderId, templateDefaults.blockBorderId, categoryDefaults.blockBorderId))
    ? pick(overrides.blockBorderId, templateDefaults.blockBorderId, categoryDefaults.blockBorderId)
    : 'hairline';
  const headingStyleId = HEADING_STYLE_IDS.includes(pick(overrides.headingStyleId, templateDefaults.headingStyleId, categoryDefaults.headingStyleId))
    ? pick(overrides.headingStyleId, templateDefaults.headingStyleId, categoryDefaults.headingStyleId)
    : 'centered-rule';
  const pageNumbers = PAGE_NUMBER_FORMATS.includes(pick(overrides.pageNumbers, templateDefaults.pageNumbers))
    ? pick(overrides.pageNumbers, templateDefaults.pageNumbers)
    : 'arabic';

  const fontFamily = pick(overrides.fontFamily, config.fontFamily, 'Georgia');
  const serif = !SANS_FONTS.includes(fontFamily);

  const dropCap = overrides.dropCap !== undefined ? overrides.dropCap !== false : templateDefaults.dropCap === true;

  return {
    categoryId,
    templateId,
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
    pageNumberWord: String(pick(overrides.pageNumberWord, templateDefaults.pageNumberWord) || '').slice(0, 12),
    dropCap,
    dropCapStyle: pick(overrides.dropCapStyle, templateDefaults.dropCapStyle) === 'boxed' ? 'boxed' : 'plain',
    kicker: outKicker(overrides, templateDefaults),
    blockFillId: pick(overrides.blockFillId, templateDefaults.blockFillId, 'auto'),
    blockDepthId: pick(overrides.blockDepthId, templateDefaults.blockDepthId, 'soft'),
    pageTextureId: pick(overrides.pageTextureId, templateDefaults.pageTextureId, 'none'),
    fontFamily,
    serif
  };
}

function outKicker(overrides, templateDefaults) {
  if (overrides.kicker !== undefined) return overrides.kicker !== false;
  return templateDefaults.kicker !== false;
}

function layerColor(layer, design) {
  switch (layer?.color) {
    case 'accent': return design.accentInk;
    case 'matte': return design.matteColor;
    case 'page': return design.pageBg;
    default: return design.borderInk;
  }
}

/* ------------------------------------------------------------------ */
/* Vector geometry: the tiny SVG subset the artwork uses                */
/* ------------------------------------------------------------------ */

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

/**
 * Parse an absolute-only SVG path (`M`, `L`, `C`, `Z`) into drawing steps.
 * The border artwork is authored inside that subset on purpose, so the same
 * paths can be replayed with PDFKit primitives.
 */
function parsePath(d) {
  const tokens = String(d || '').match(/[MLCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const steps = [];
  let index = 0;
  while (index < tokens.length) {
    const command = tokens[index];
    if (command === 'M' || command === 'L') {
      steps.push({ type: command, x: Number(tokens[index + 1]), y: Number(tokens[index + 2]) });
      index += 3;
    } else if (command === 'C') {
      steps.push({
        type: 'C',
        x1: Number(tokens[index + 1]),
        y1: Number(tokens[index + 2]),
        x2: Number(tokens[index + 3]),
        y2: Number(tokens[index + 4]),
        x: Number(tokens[index + 5]),
        y: Number(tokens[index + 6])
      });
      index += 7;
    } else if (command === 'Z') {
      steps.push({ type: 'Z' });
      index += 1;
    } else {
      index += 1;
    }
  }
  return steps;
}

/**
 * Replay parsed path steps in PDFKit, mapping a design-space box
 * (`width × height` at `origin`) onto the page.
 */
function tracePath(doc, d, box) {
  const steps = parsePath(d);
  if (!steps.length) return false;
  steps.forEach((step, stepIndex) => {
    if (step.type === 'M') {
      if (stepIndex === 0) doc.moveTo(box.x + step.x * box.sx, box.y + step.y * box.sy);
      else doc.lineTo(box.x + step.x * box.sx, box.y + step.y * box.sy);
      return;
    }
    if (step.type === 'L') {
      doc.lineTo(box.x + step.x * box.sx, box.y + step.y * box.sy);
      return;
    }
    if (step.type === 'C') {
      doc.bezierCurveTo(
        box.x + step.x1 * box.sx,
        box.y + step.y1 * box.sy,
        box.x + step.x2 * box.sx,
        box.y + step.y2 * box.sy,
        box.x + step.x * box.sx,
        box.y + step.y * box.sy
      );
      return;
    }
    doc.closePath();
  });
  return true;
}

/**
 * Picture-space helpers.
 *
 * Every ornament is described as plain drawing commands (paths, circles,
 * rectangles) in PDF page coordinates before anything is painted. The PDF
 * painter replays them with PDFKit, and the tests can measure them — so the
 * frame geometry is verifiable without opening a PDF.
 */

function mapSteps(steps, box) {
  return steps.map((step) => {
    if (step.type === 'M' || step.type === 'L') {
      return { type: step.type, x: box.x + step.x * box.sx, y: box.y + step.y * box.sy };
    }
    if (step.type === 'C') {
      return {
        type: 'C',
        x1: box.x + step.x1 * box.sx,
        y1: box.y + step.y1 * box.sy,
        x2: box.x + step.x2 * box.sx,
        y2: box.y + step.y2 * box.sy,
        x: box.x + step.x * box.sx,
        y: box.y + step.y * box.sy
      };
    }
    return { type: 'Z' };
  });
}

function rotatePoint(x, y, cx, cy, degrees) {
  const radians = (degrees * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: cy + dx * Math.sin(radians) + dy * Math.cos(radians)
  };
}

function rotateSteps(steps, cx, cy, degrees) {
  if (!degrees) return steps;
  return steps.map((step) => {
    if (step.type === 'Z') return step;
    if (step.type === 'C') {
      const first = rotatePoint(step.x1, step.y1, cx, cy, degrees);
      const second = rotatePoint(step.x2, step.y2, cx, cy, degrees);
      const point = rotatePoint(step.x, step.y, cx, cy, degrees);
      return { type: 'C', x1: first.x, y1: first.y, x2: second.x, y2: second.y, x: point.x, y: point.y };
    }
    const point = rotatePoint(step.x, step.y, cx, cy, degrees);
    return { type: step.type, x: point.x, y: point.y };
  });
}

function scrollCornerCommands(design, layer, originX, originY, scale, rotation) {
  const geometry = scrollCornerGeometry;
  const size = Math.max(10, (layer.size || 64) * scale);
  const opacity = layer.opacity ?? 1;
  const color = layerColor(layer, design);
  const centre = { x: originX + size / 2, y: originY + size / 2 };
  const box = { x: originX, y: originY, sx: size / 100, sy: size / 100 };
  const commands = [];

  (geometry.paths || []).forEach((path) => {
    const steps = rotateSteps(mapSteps(parsePath(path.d), box), centre.x, centre.y, rotation);
    commands.push({
      type: 'path',
      steps,
      fill: Boolean(path.fill),
      lineWidth: Math.max(0.25, (path.width || 1) * scale * 0.9),
      color: path.opacity === undefined || path.opacity === 1 ? color : mixColors(design.pageBg, color, path.opacity * opacity)
    });
  });
  (geometry.circles || []).forEach((circle) => {
    const point = rotatePoint(originX + circle.cx * (size / 100), originY + circle.cy * (size / 100), centre.x, centre.y, rotation);
    commands.push({
      type: 'circle',
      x: point.x,
      y: point.y,
      r: Math.max(0.3, circle.r * (size / 100)),
      color: circle.opacity === undefined || circle.opacity === 1 ? color : mixColors(design.pageBg, color, circle.opacity * opacity)
    });
  });

  return commands;
}

/**
 * Paint one motif tile centred on a point, turned as its edge needs.
 *
 * Centre positioning (rather than corner positioning) means a rotated tile
 * always lands exactly inside its printed band: the four edges cannot drift
 * apart, and nothing spills over the trim.
 */
function motifTileCommands(design, motif, layer, centreX, centreY, scale, rotation = 0) {
  if (!motif) return [];
  const color = layerColor(layer, design);
  const opacity = layer.opacity ?? 1;
  const ink = opacity >= 1 ? color : mixColors(design.pageBg, color, opacity);
  const width = motif.width * scale;
  const height = motif.height * scale;
  const x = centreX - width / 2;
  const y = centreY - height / 2;
  const commands = [];

  (motif.paths || []).forEach((path) => {
    const steps = rotateSteps(mapSteps(parsePath(path.d), { x, y, sx: scale, sy: scale }), centreX, centreY, rotation);
    commands.push({
      type: 'path',
      steps,
      fill: Boolean(path.fill),
      lineWidth: Math.max(0.2, (path.width || 1) * scale * 0.85),
      color: path.opacity === undefined || path.opacity >= 1 ? ink : mixColors(design.pageBg, ink, path.opacity)
    });
  });
  (motif.circles || []).forEach((circle) => {
    const point = rotatePoint(x + circle.cx * scale, y + circle.cy * scale, centreX, centreY, rotation);
    commands.push({
      type: 'circle',
      x: point.x,
      y: point.y,
      r: Math.max(0.2, circle.r * scale),
      color: circle.opacity === undefined || circle.opacity >= 1 ? ink : mixColors(design.pageBg, ink, circle.opacity)
    });
  });

  return commands;
}

function edgePatternCommands(design, layer, edge, pageWidthPt, pageHeightPt, scale) {
  const motif = edgePatternGeometry[layer.motif];
  if (!motif) return [];
  const inset = (layer.inset || 0) * scale;
  const motifWidth = motif.width * scale;
  const motifHeight = motif.height * scale;
  if (motifWidth <= 0) return [];
  const commands = [];
  const horizontal = edge === 'top' || edge === 'bottom';

  if (horizontal) {
    const usable = pageWidthPt - inset * 2;
    const count = Math.max(1, Math.floor(usable / motifWidth));
    const offset = inset + (usable - count * motifWidth) / 2;
    const centreY = edge === 'top' ? inset + motifHeight / 2 : pageHeightPt - inset - motifHeight / 2;
    for (let i = 0; i < count; i += 1) {
      // The foot of the page is the tile turned over, so motifs point inward.
      commands.push(...motifTileCommands(
        design,
        motif,
        layer,
        offset + i * motifWidth + motifWidth / 2,
        centreY,
        scale,
        edge === 'top' ? 0 : 180
      ));
    }
    return commands;
  }

  const usable = pageHeightPt - inset * 2;
  const count = Math.max(1, Math.floor(usable / motifWidth));
  const offset = inset + (usable - count * motifWidth) / 2;
  const centreX = edge === 'left' ? inset + motifHeight / 2 : pageWidthPt - inset - motifHeight / 2;
  for (let i = 0; i < count; i += 1) {
    // Sides turn the tile a quarter-turn so the motifs face into the page.
    commands.push(...motifTileCommands(
      design,
      motif,
      layer,
      centreX,
      offset + i * motifWidth + motifWidth / 2,
      scale,
      edge === 'left' ? 90 : 270
    ));
  }
  return commands;
}

/**
 * Every ornament the page border asks for, as drawing commands in PDF page
 * coordinates. This is the single place the frame geometry is decided.
 */
function pageOrnamentCommands(design, pageWidthPt, pageHeightPt) {
  if (!design) return [];
  const scale = Math.max(0.75, Math.min(1.6, pageWidthPt / 480));
  const layers = design.pageBorderLayers || [];
  const commands = [];

  layers.forEach((layer) => {
    if (layer.kind === 'band') {
      const thickness = Math.max(2, (layer.thickness || 4) * scale);
      commands.push({
        type: 'rect',
        x: 0,
        y: layer.edge === 'bottom' ? pageHeightPt - thickness : 0,
        width: pageWidthPt,
        height: thickness,
        fill: layerColor(layer, design)
      });
      return;
    }
    if (layer.kind === 'border') {
      const inset = Math.max(2, (layer.inset || 8) * scale);
      commands.push({
        type: 'rect',
        x: inset,
        y: inset,
        width: pageWidthPt - inset * 2,
        height: pageHeightPt - inset * 2,
        radius: Math.max(0, (layer.radius || 0) * scale * 0.5),
        stroke: layerColor(layer, design),
        lineWidth: Math.max(0.4, (layer.width || 1) * scale),
        dashed: layer.style === 'dashed' || layer.style === 'dotted'
      });
      return;
    }
    if (layer.kind === 'scroll') {
      const inset = (layer.inset || 0) * scale;
      const size = Math.max(10, (layer.size || 64) * scale);
      cornerRotations.forEach((corner) => {
        const x = corner.left !== undefined ? inset : pageWidthPt - inset - size;
        const y = corner.top !== undefined ? inset : pageHeightPt - inset - size;
        commands.push(...scrollCornerCommands(design, layer, x, y, scale, corner.rotate));
      });
      return;
    }
    if (layer.kind === 'pattern') {
      (layer.edges || ['top', 'bottom']).forEach((edge) => {
        commands.push(...edgePatternCommands(design, layer, edge, pageWidthPt, pageHeightPt, scale));
      });
    }
  });

  return commands;
}

function paintCommands(doc, commands) {
  commands.forEach((command) => {
    if (command.type === 'rect') {
      doc.lineWidth(command.lineWidth || 0);
      if (command.stroke) doc.strokeColor(command.stroke);
      if (command.fill) doc.fillColor(command.fill);
      if (command.dashed) doc.dash((command.lineWidth || 1) * 3, { space: (command.lineWidth || 1) * 2 });
      if (command.radius) doc.roundedRect(command.x, command.y, command.width, command.height, command.radius);
      else doc.rect(command.x, command.y, command.width, command.height);
      if (command.fill) doc.fill();
      if (command.stroke) doc.stroke();
      doc.undash();
      return;
    }
    if (command.type === 'circle') {
      doc.fillColor(command.color).circle(command.x, command.y, command.r).fill();
      return;
    }
    if (command.type !== 'path') return;
    doc.lineWidth(command.lineWidth || 1);
    if (command.fill) doc.fillColor(command.color);
    else doc.strokeColor(command.color);
    doc.strokeColor(command.fill ? command.color : command.color);
    const first = command.steps.find((step) => step.type === 'M');
    if (!first) return;
    doc.moveTo(first.x, first.y);
    command.steps.forEach((step, index) => {
      if (index === 0) return;
      if (step.type === 'L' || step.type === 'M') doc.lineTo(step.x, step.y);
      if (step.type === 'C') doc.bezierCurveTo(step.x1, step.y1, step.x2, step.y2, step.x, step.y);
      if (step.type === 'Z') doc.closePath();
    });
    if (command.fill) doc.fill();
    doc.stroke();
  });
}

/* ------------------------------------------------------------------ */
/* PDF page furniture                                                   */
/* ------------------------------------------------------------------ */

/**
 * Paint the page border and its ornaments on a PDFKit page. CSS design units
 * are tuned for a 480pt-wide page, so the geometry scales with the trim size.
 */
function paintPdfPageFurniture(doc, design, pageWidthPt, pageHeightPt) {
  if (!design) return;
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
  doc.lineCap('round');
  paintCommands(doc, pageOrnamentCommands(design, pageWidthPt, pageHeightPt));
  doc.restore();

  // Glyph ornaments keep their own text pass: PDFKit needs a font to draw them.
  (design.pageBorderLayers || []).forEach((layer) => {
    const scale = Math.max(0.75, Math.min(1.6, pageWidthPt / 480));
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

/* ------------------------------------------------------------------ */
/* EPUB stylesheet                                                      */
/* ------------------------------------------------------------------ */

function dataUri(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function motifSvg(motif, color, opacity, rotation = 0) {
  if (!motif) return '';
  const body = [
    ...(motif.paths || []).map((path) => {
      const alpha = ((path.opacity ?? 1) * opacity).toFixed(3);
      return path.fill
        ? `<path d="${path.d}" fill="${color}" stroke="none" opacity="${alpha}"/>`
        : `<path d="${path.d}" fill="none" stroke="${color}" stroke-width="${path.width}" stroke-linecap="round" opacity="${alpha}"/>`;
    }),
    ...(motif.circles || []).map(
      (circle) => `<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="${color}" opacity="${((circle.opacity ?? 1) * opacity).toFixed(3)}"/>`
    )
  ].join('');
  const turn = rotation
    ? ` transform="rotate(${rotation} ${motif.width / 2} ${motif.height / 2})"`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${motif.width} ${motif.height}" width="${motif.width}" height="${motif.height}"><g${turn}>${body}</g></svg>`;
}

function cornerSvg(design, layer) {
  const color = layerColor(layer, design);
  const opacity = layer.opacity ?? 1;
  const body = [
    ...(scrollCornerGeometry.paths || []).map((path) => {
      const alpha = ((path.opacity ?? 1) * opacity).toFixed(3);
      return path.fill
        ? `<path d="${path.d}" fill="${color}" stroke="none" opacity="${alpha}"/>`
        : `<path d="${path.d}" fill="none" stroke="${color}" stroke-width="${path.width}" stroke-linecap="round" opacity="${alpha}"/>`;
    }),
    ...(scrollCornerGeometry.circles || []).map(
      (circle) => `<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="${color}" opacity="${((circle.opacity ?? 1) * opacity).toFixed(3)}"/>`
    )
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${body}</svg>`;
}

/**
 * The exported reader (EPUB) gets the same page border, colours, heading
 * treatment, scroll-work corners and printed edge patterns as the studio.
 */
function epubDesignCss(design) {
  const layers = design.pageBorderLayers || [];
  const borders = layers.filter((layer) => layer.kind === 'border');
  const outer = borders[0] || null;
  const inner = borders[1] || null;
  const band = layers.find((layer) => layer.kind === 'band' && layer.edge === 'top');
  const glyphs = layers.filter((layer) => layer.kind === 'corners').map((layer) => layer.glyph).join(' ');
  const patternLayers = layers.filter((layer) => layer.kind === 'pattern');
  const scrollLayer = layers.find((layer) => layer.kind === 'scroll');

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

  // Ornamental artwork, expressed as background images so e-readers that
  // support CSS backgrounds show the same printed frame.
  const artwork = [];
  if (scrollLayer) {
    const uri = dataUri(cornerSvg(design, scrollLayer));
    const cornerSize = Math.round((scrollLayer.size || 64) * 0.8);
    [
      ['left top', 'left top'],
      ['right top', 'right top'],
      ['right bottom', 'right bottom'],
      ['left bottom', 'left bottom']
    ].forEach(([, position]) => {
      artwork.push({
        image: `${uri} ${position} no-repeat`,
        size: `${cornerSize}px ${cornerSize}px`,
        repeat: 'no-repeat'
      });
    });
  }
  patternLayers.forEach((layer) => {
    const motif = edgePatternGeometry[layer.motif];
    if (!motif) return;
    (layer.edges || ['top', 'bottom']).forEach((edge) => {
      const rotation = edge === 'bottom' ? 180 : edge === 'left' ? 90 : edge === 'right' ? 270 : 0;
      const uri = dataUri(motifSvg(motif, layerColor(layer, design), layer.opacity ?? 1, rotation));
      const horizontal = edge === 'top' || edge === 'bottom';
      const position = edge === 'top' ? 'left top' : edge === 'bottom' ? 'left bottom' : edge === 'left' ? 'left top' : 'right top';
      artwork.push({
        image: `${uri} ${position} ${horizontal ? 'repeat-x' : 'repeat-y'}`,
        size: horizontal ? `${motif.width}px ${motif.height}px` : `${motif.height}px ${motif.width}px`,
        repeat: horizontal ? 'repeat-x' : 'repeat-y'
      });
    });
  });
  const frameBackground = artwork.length
    ? `\n  background-image: ${artwork.map((item) => item.image).join(', ')};\n  background-size: ${artwork.map((item) => item.size).join(', ')};\n  background-repeat: ${artwork.map((item) => item.repeat).join(', ')};`
    : '';

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
  padding: 1.9em;${frameBackground}
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
  parsePath,
  pageOrnamentCommands,
  // exported for tests / reuse
  toHex,
  withAlpha,
  mixColors,
  readableInk,
  contrastRatio,
  toRoman,
  getPageBorderLayers
};
