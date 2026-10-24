/**
 * SLOT RULES REGISTRY — the on-record space budget for every text block and
 * image frame used by the 48 visual templates (6 categories × 8 templates ×
 * 5 page structures).
 *
 * Why this file exists
 * --------------------
 * A book page only looks "exactly as designed" when each block receives the
 * amount of text (and the image shape) its space was designed for. This
 * registry is the single source of truth for that budget:
 *
 *  - The block text editor (BlockTextEditor) reads a field's rule and refuses
 *    to place more words into the page than the rule allows. Typing shows a
 *    live "fit" meter, long pastes are shortened to the remaining budget,
 *    and a "Trim to fit" action repairs over-limit text.
 *  - AI generation receives the same rule (ideal range + hard maximum) in
 *    its prompt, and the server trims output to the maximum, so AI copy
 *    fills the block instead of overflowing it.
 *  - The stock-photo search receives the image slot's orientation so the
 *    fetcher looks for portrait photos for portrait frames, etc.
 *  - The image editor crops to the slot's aspect ratio and exports at the
 *    slot's recommended print size.
 *
 * How the text budget was measured (audit, Oct 2026)
 * --------------------------------------------------
 * Every text slot in TemplateStructurePageRenderer declares how many lines
 * (`rows`) its card/frame provides at the template's body size. At the
 * templates' typography, one full line holds roughly WORDS_PER_LINE words.
 * The space budget is therefore `rows × WORDS_PER_LINE`, and the field's
 * curated ceiling from the AI prompt catalog (`AI_FIELD_PROFILES` maxWords —
 * e.g. a pull quote should stay a quote even in a tall card) caps it. The
 * smaller of the two is the block's hard maximum; 40–100 % of the maximum is
 * the "ideal" range that visually fills the space.
 *
 * How the image budget was measured
 * ---------------------------------
 * Every image frame declares a Tailwind height class and a frame shape in
 * the page structures. Heights in use range from h-24 (small cameos) to
 * h-96 (full storybook arch). At click time the app also measures the
 * rendered frame, which refines the aspect ratio to the exact designed
 * space; the registry values below are the recorded fallbacks plus the
 * recommended print resolutions per size class.
 */

import { getAiFieldProfile } from './aiPromptCatalog';

export const SLOT_RULES_VERSION = '2026-10-23.1';

/** Words that fit on one line of template body text (audit assumption). */
export const WORDS_PER_LINE = 12;

/** Average characters per word incl. spacing/punctuation, for char budgets. */
const CHARS_PER_WORD = 7;

/**
 * What kind of writing each field holds. The format controls which editor
 * tools are offered (a title never needs headings or lists) and whether the
 * stored value is plain single-line text.
 */
export const FIELD_FORMATS = Object.freeze({
  // Page furniture
  chapterTitle: 'title',
  pageSubtitle: 'subtitle',
  // Photo books
  curatorialNote: 'note',
  photoCaption: 'caption',
  photoLocation: 'shortLabel',
  // Cookbooks
  course: 'shortLabel',
  servings: 'shortLabel',
  prepTime: 'shortLabel',
  cookTime: 'shortLabel',
  difficulty: 'shortLabel',
  ingredients: 'list',
  steps: 'steps',
  chefNotes: 'note',
  // Magazines
  kicker: 'shortLabel',
  byline: 'shortLabel',
  articleBody: 'body',
  pullQuote: 'quote',
  sidebarContent: 'list',
  // Children's picture books
  illustrationPrompt: 'note',
  storyText: 'body',
  moral: 'quote',
  // How-to & guides
  calloutTitle: 'shortLabel',
  overview: 'body',
  calloutBody: 'note',
  tableNotes: 'list',
  roadmapSteps: 'steps',
  comparisonLeft: 'body',
  comparisonRight: 'body',
  // Story / memoir / chapter books
  chapterText: 'body',
  epigraph: 'quote',
  marginNote: 'note'
});

export const TEXT_FORMAT_RULES = Object.freeze({
  title: {
    label: 'Heading line',
    singleLine: true,
    plainText: true,
    idealFrom: 0.25,
    minWordsFloor: 3,
    guidance: 'One short, memorable heading. It is set in large display type, so every extra word makes it wrap and shrink the design.',
    tools: { basic: false, headings: false, lists: false, quote: false, alignment: false, color: false }
  },
  subtitle: {
    label: 'Supporting line',
    singleLine: false,
    plainText: false,
    idealFrom: 0.35,
    minWordsFloor: 6,
    guidance: 'One supporting sentence under the heading. Add context the heading does not repeat.',
    tools: { basic: true, headings: false, lists: false, quote: false, alignment: true, color: true }
  },
  caption: {
    label: 'Photo caption',
    singleLine: false,
    plainText: false,
    idealFrom: 0.3,
    minWordsFloor: 8,
    guidance: 'A caption sits in a small plaque under the photo. One vivid line reads best; two short lines still fit.',
    tools: { basic: true, headings: false, lists: false, quote: false, alignment: true, color: true }
  },
  shortLabel: {
    label: 'Short detail',
    singleLine: true,
    plainText: true,
    idealFrom: 0.2,
    minWordsFloor: 2,
    guidance: 'A tiny detail chip on the page — a few words only, like a label on a museum card.',
    tools: { basic: false, headings: false, lists: false, quote: false, alignment: false, color: false }
  },
  quote: {
    label: 'Pull quote',
    singleLine: false,
    plainText: false,
    idealFrom: 0.4,
    minWordsFloor: 8,
    guidance: 'Set in large italic type as a design feature. Short and memorable wins — if it needs a second sentence, it is too long for this space.',
    tools: { basic: true, headings: false, lists: false, quote: false, alignment: true, color: true }
  },
  note: {
    label: 'Note card',
    singleLine: false,
    plainText: false,
    idealFrom: 0.4,
    minWordsFloor: 12,
    guidance: 'A small companion card beside the main content. Two or three focused sentences fill it beautifully.',
    tools: { basic: true, headings: false, lists: true, quote: true, alignment: true, color: true }
  },
  list: {
    label: 'List',
    singleLine: false,
    plainText: false,
    idealFrom: 0.45,
    minWordsFloor: 16,
    guidance: 'One item per line so the design can space the list evenly down the card.',
    tools: { basic: true, headings: false, lists: true, quote: false, alignment: true, color: true }
  },
  steps: {
    label: 'Numbered steps',
    singleLine: false,
    plainText: false,
    idealFrom: 0.45,
    minWordsFloor: 20,
    guidance: 'Ordered steps, one action per step. The template numbers and spaces them for scanning.',
    tools: { basic: true, headings: false, lists: true, quote: false, alignment: true, color: true }
  },
  body: {
    label: 'Main page text',
    singleLine: false,
    plainText: false,
    idealFrom: 0.55,
    minWordsFloor: 30,
    guidance: 'The reading column of this page. Filling most of the space keeps the page balanced against its photos and frames.',
    tools: { basic: true, headings: true, lists: true, quote: true, alignment: true, color: true }
  }
});

function clampWords(value, floor, ceiling) {
  return Math.max(floor, Math.min(ceiling, Math.round(value)));
}

/**
 * The recorded rule for one text block on one page.
 *
 * @param {object} input
 * @param {string} input.categoryId  Book category (photobook, cookbook, …)
 * @param {string} input.fieldKey    Structured-data field key
 * @param {number} [input.rows]      Lines of space this structure gives the block
 * @param {number} [input.maxWords]  Explicit override already computed by a caller
 * @param {string} [input.fieldLabel] Display label override
 */
export function getTextSlotRule({ categoryId, fieldKey, rows = 4, maxWords, fieldLabel } = {}) {
  const profile = getAiFieldProfile(categoryId, fieldKey);
  const format = FIELD_FORMATS[fieldKey] || 'note';
  const formatRule = TEXT_FORMAT_RULES[format];
  const safeRows = Math.max(1, Math.floor(Number(rows) || 4));
  const spaceWords = safeRows * WORDS_PER_LINE;
  const ceiling = Math.max(1, profile.maxWords || 100);
  const computedMax = clampWords(
    Number(maxWords) > 0 ? Number(maxWords) : Math.min(ceiling, spaceWords),
    formatRule.minWordsFloor,
    Math.max(ceiling, formatRule.minWordsFloor)
  );
  const idealMinWords = Math.max(1, Math.round(computedMax * formatRule.idealFrom));

  return {
    fieldKey: fieldKey || 'pageText',
    label: fieldLabel || profile.label,
    format,
    formatLabel: formatRule.label,
    guidance: formatRule.guidance,
    aiFormat: profile.format,
    rows: safeRows,
    wordsPerLine: WORDS_PER_LINE,
    maxWords: computedMax,
    idealMinWords,
    idealMaxWords: computedMax,
    maxChars: computedMax * CHARS_PER_WORD,
    singleLine: formatRule.singleLine,
    plainText: formatRule.plainText,
    tools: formatRule.tools
  };
}

/**
 * How well a word count fits a rule. Used by the editor's fit meter, the
 * small counter on each Edit button, and the AI prompt's target range.
 */
export function getFitStatus(wordCount, rule) {
  const count = Math.max(0, Number(wordCount) || 0);
  const max = Math.max(1, rule?.maxWords || 100);
  const idealMin = Math.max(1, rule?.idealMinWords || Math.round(max * 0.4));
  const percent = Math.round((count / max) * 100);
  if (count === 0) return { status: 'empty', percent: 0, label: 'Empty space' };
  if (count > max) return { status: 'over', percent: Math.min(percent, 140), label: `${count - max} words too many for this space` };
  if (count >= Math.round(max * 0.88)) return { status: 'nearFull', percent, label: 'Almost full — fits, but no room to spare' };
  if (count >= idealMin) return { status: 'ideal', percent, label: 'Fits this space beautifully' };
  return { status: 'short', percent, label: 'Fits, with room for a little more' };
}

/* ------------------------------------------------------------------ */
/* Image slots                                                         */
/* ------------------------------------------------------------------ */

// Tailwind spacing heights (px) used by the page structures.
const HEIGHT_PX = {
  'h-24': 96, 'h-28': 112, 'h-32': 128, 'h-36': 144, 'h-40': 160,
  'h-44': 176, 'h-48': 192, 'h-52': 208, 'h-56': 224, 'h-60': 240,
  'h-64': 256, 'h-72': 288, 'h-80': 320, 'h-96': 384
};

/** Every distinct frame height class the templates use (audited). */
export const IMAGE_HEIGHT_CLASSES_IN_USE = Object.freeze([
  'h-24 sm:h-28', 'h-24 sm:h-32', 'h-28 sm:h-36', 'h-32 sm:h-40',
  'h-36 sm:h-48', 'h-40 sm:h-52', 'h-44 sm:h-56', 'h-48 sm:h-60',
  'h-48 sm:h-64', 'h-52 sm:h-64', 'h-56 sm:h-72', 'h-64 sm:h-80',
  'h-64 sm:h-[320px]', 'h-64 sm:h-[330px]', 'h-72 sm:h-96'
]);

export const IMAGE_SIZE_CLASSES = Object.freeze({
  hero: { label: 'Hero photo', recommendedWidth: 1800 },
  large: { label: 'Large photo', recommendedWidth: 1600 },
  medium: { label: 'Photo', recommendedWidth: 1200 },
  small: { label: 'Small photo', recommendedWidth: 900 }
});

function designHeightPx(heightClass = '') {
  const arbitrary = String(heightClass).match(/sm:h-\[(\d+)px\]/);
  if (arbitrary) return Number(arbitrary[1]);
  const classes = String(heightClass).split(/\s+/);
  const smClass = classes.find((item) => item.startsWith('sm:'));
  const key = (smClass ? smClass.slice(3) : classes[0]) || 'h-48';
  return HEIGHT_PX[key] || 192;
}

const COMMON_RATIOS = [
  [21 / 9, '21:9'], [16 / 9, '16:9'], [3 / 2, '3:2'], [4 / 3, '4:3'],
  [1, '1:1'], [4 / 5, '4:5'], [3 / 4, '3:4'], [2 / 3, '2:3']
];

export function aspectLabelFor(ratio) {
  if (!ratio || !Number.isFinite(ratio)) return 'photo';
  let best = COMMON_RATIOS[0];
  for (const candidate of COMMON_RATIOS) {
    if (Math.abs(candidate[0] - ratio) < Math.abs(best[0] - ratio)) best = candidate;
  }
  return best[1];
}

export function orientationForAspect(ratio) {
  if (!ratio || !Number.isFinite(ratio)) return 'landscape';
  if (ratio > 1.12) return 'landscape';
  if (ratio < 0.89) return 'portrait';
  return 'square';
}

/**
 * The recorded rule for one image frame.
 *
 * @param {object} input
 * @param {string} [input.heightClass]  Tailwind heights from the structure
 * @param {string} [input.shape]        Frame shape: rect | square | arch | oval
 * @param {number} [input.measuredAspect] Rendered width/height, when known —
 *   the exact designed space, preferred over the recorded estimate.
 */
export function getImageSlotRule({ heightClass = 'h-48', shape = 'rect', measuredAspect } = {}) {
  const heightPx = designHeightPx(heightClass);
  const sizeClass = heightPx >= 288 ? 'hero' : heightPx >= 208 ? 'large' : heightPx >= 160 ? 'medium' : 'small';

  let aspectRatio;
  if (Number(measuredAspect) > 0.2 && Number(measuredAspect) < 6) {
    aspectRatio = Number(measuredAspect);
  } else if ((shape === 'arch' || shape === 'oval') && heightPx >= 208) {
    aspectRatio = 4 / 5; // tall arch/cameo frames are portrait spaces
  } else if (heightPx <= 144) {
    aspectRatio = 3 / 2; // cameo rows are wide, short frames
  } else if (shape === 'square') {
    aspectRatio = 4 / 3;
  } else {
    aspectRatio = 3 / 2; // banners and standard rectangle frames
  }

  const orientation = orientationForAspect(aspectRatio);
  const recommendedWidth = IMAGE_SIZE_CLASSES[sizeClass].recommendedWidth;
  return {
    sizeClass,
    sizeLabel: IMAGE_SIZE_CLASSES[sizeClass].label,
    shape,
    heightClass,
    designHeightPx: heightPx,
    aspectRatio,
    aspectLabel: aspectLabelFor(aspectRatio),
    orientation,
    recommendedWidth,
    recommendedHeight: Math.round(recommendedWidth / aspectRatio),
    /** Warn when a source image is smaller than half the print recommendation. */
    minUsableWidth: Math.round(recommendedWidth / 2),
    measured: Boolean(Number(measuredAspect) > 0)
  };
}

/** Does a candidate photo (w×h) suit a slot without heavy cropping? */
export function imageFitsSlot(width, height, rule) {
  if (!width || !height || !rule) return null;
  const candidate = width / height;
  const ratio = candidate / rule.aspectRatio;
  if (ratio >= 0.8 && ratio <= 1.25) return 'good';
  if (ratio >= 0.55 && ratio <= 1.8) return 'crop';
  return 'poor';
}
