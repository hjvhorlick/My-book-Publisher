import { describe, expect, it } from 'vitest';
import { AI_FIELD_PROFILES, buildAiFieldPrompt } from '../src/data/aiPromptCatalog.js';
import {
  FIELD_FORMATS,
  IMAGE_HEIGHT_CLASSES_IN_USE,
  getFitStatus,
  getImageSlotRule,
  getTextSlotRule,
  imageFitsSlot
} from '../src/data/slotRules.js';
import {
  countRichTextWords,
  getRichTextStats,
  trimPlainTextToWordLimit,
  trimRichHtmlToWordLimit
} from '../src/utils/richText.js';
import {
  clampPan,
  coverScale,
  filterString,
  outputSizeForSlot,
  visibleSourceRect
} from '../src/utils/imageCrop.js';

describe('template slot rules — the recorded space for every block', () => {
  it('gives every AI-catalogue field a rule inside its curated ceiling', () => {
    for (const [categoryId, fields] of Object.entries(AI_FIELD_PROFILES)) {
      for (const [fieldKey, profile] of Object.entries(fields)) {
        expect(FIELD_FORMATS[fieldKey], `${categoryId}/${fieldKey} needs a registered format`).toBeTruthy();
        for (const rows of [1, 2, 4, 8, 13]) {
          const rule = getTextSlotRule({ categoryId, fieldKey, rows });
          expect(rule.maxWords, `${categoryId}/${fieldKey}`).toBeGreaterThan(0);
          expect(rule.maxWords, `${categoryId}/${fieldKey}`).toBeLessThanOrEqual(profile.maxWords);
          expect(rule.idealMinWords).toBeGreaterThanOrEqual(1);
          expect(rule.idealMinWords).toBeLessThanOrEqual(rule.idealMaxWords);
          expect(rule.idealMaxWords).toBe(rule.maxWords);
          expect(rule.maxChars).toBeGreaterThan(rule.maxWords);
          expect(rule.guidance.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it('shrinks the budget with the physical space (fewer rows, fewer words)', () => {
    const small = getTextSlotRule({ categoryId: 'book', fieldKey: 'chapterText', rows: 4 });
    const large = getTextSlotRule({ categoryId: 'book', fieldKey: 'chapterText', rows: 12 });
    expect(small.maxWords).toBeLessThan(large.maxWords);
    const title = getTextSlotRule({ categoryId: 'cookbook', fieldKey: 'chapterTitle', rows: 1 });
    expect(title.plainText).toBe(true);
    expect(title.singleLine).toBe(true);
    expect(title.tools.headings).toBe(false);
    const body = getTextSlotRule({ categoryId: 'magazine', fieldKey: 'articleBody', rows: 9 });
    expect(body.tools.headings).toBe(true);
    expect(body.tools.lists).toBe(true);
  });

  it('reports fit honestly across the range', () => {
    const rule = getTextSlotRule({ categoryId: 'photobook', fieldKey: 'curatorialNote', rows: 3 });
    expect(getFitStatus(0, rule).status).toBe('empty');
    expect(getFitStatus(3, rule).status).toBe('short');
    expect(getFitStatus(rule.maxWords, rule).status).toBe('nearFull');
    expect(getFitStatus(rule.maxWords + 5, rule).status).toBe('over');
    expect(getFitStatus(Math.round(rule.maxWords * 0.6), rule).status).toBe('ideal');
  });

  it('records a usable rule for every image frame height the templates use', () => {
    for (const heightClass of IMAGE_HEIGHT_CLASSES_IN_USE) {
      for (const shape of ['rect', 'square', 'arch', 'oval']) {
        const rule = getImageSlotRule({ heightClass, shape });
        expect(rule.aspectRatio).toBeGreaterThan(0.2);
        expect(rule.aspectRatio).toBeLessThan(5);
        expect(['landscape', 'portrait', 'square']).toContain(rule.orientation);
        expect(rule.recommendedWidth).toBeGreaterThanOrEqual(900);
        expect(rule.recommendedHeight).toBe(Math.round(rule.recommendedWidth / rule.aspectRatio));
      }
    }
    const tallArch = getImageSlotRule({ heightClass: 'h-72 sm:h-96', shape: 'arch' });
    expect(tallArch.orientation).toBe('portrait');
    const cameo = getImageSlotRule({ heightClass: 'h-28 sm:h-36', shape: 'arch' });
    expect(cameo.orientation).toBe('landscape');
    const measured = getImageSlotRule({ heightClass: 'h-48', shape: 'rect', measuredAspect: 0.75 });
    expect(measured.aspectRatio).toBeCloseTo(0.75);
    expect(measured.orientation).toBe('portrait');

    const slot = getImageSlotRule({ heightClass: 'h-48 sm:h-60', shape: 'rect' });
    expect(imageFitsSlot(1500, 1000, slot)).toBe('good');
    expect(imageFitsSlot(1000, 1000, slot)).toBe('crop');
    expect(imageFitsSlot(600, 1800, slot)).toBe('poor');
  });

  it('passes the template space to the AI prompt', () => {
    const prompt = buildAiFieldPrompt({
      categoryId: 'cookbook',
      fieldKey: 'chefNotes',
      maxWords: 36,
      idealMinWords: 14,
      bookTitle: 'The Botanical Table'
    });
    expect(prompt).toContain('Maximum length: 36 words.');
    expect(prompt).toContain('this block holds 14–36 words');
  });
});

describe('fit enforcement helpers', () => {
  it('trims rich HTML to the word budget with balanced tags', () => {
    const html = '<p><strong>One two three</strong> four five six seven eight nine ten.</p><p>Eleven twelve.</p>';
    const trimmed = trimRichHtmlToWordLimit(html, 5);
    expect(countRichTextWords(trimmed)).toBe(5);
    expect(trimmed).toContain('<strong>One two three</strong>');
    expect(trimmed.endsWith('</p>')).toBe(true);
    expect(trimRichHtmlToWordLimit('<p>Short.</p>', 10)).toBe('<p>Short.</p>');
  });

  it('trims plain text at a sentence boundary when one is in budget', () => {
    const text = 'One fine morning. The harbour bells rang across the still and silver water today.';
    expect(trimPlainTextToWordLimit(text, 6)).toBe('One fine morning. The harbour bells');
    expect(trimPlainTextToWordLimit(text, 4)).toBe('One fine morning.');
    expect(trimPlainTextToWordLimit('Short text.', 10)).toBe('Short text.');
  });

  it('counts editor stats', () => {
    const stats = getRichTextStats('<p>Two sentences here. And another one follows now!</p>');
    expect(stats.words).toBe(8);
    expect(stats.sentences).toBe(2);
    expect(stats.characters).toBeGreaterThan(20);
  });
});

describe('image crop geometry', () => {
  it('covers the frame and keeps the visible window inside the photo', () => {
    for (const rotation of [0, 90, 180, 270]) {
      for (const zoom of [1, 1.8, 3]) {
        const rect = visibleSourceRect({
          imageWidth: 2400, imageHeight: 1600, aspectRatio: 0.8,
          zoom, offsetX: 0.05, offsetY: -0.04, rotation
        });
        expect(rect.sx).toBeGreaterThanOrEqual(-0.001);
        expect(rect.sy).toBeGreaterThanOrEqual(-0.001);
        expect(rect.sx + rect.sw).toBeLessThanOrEqual(2400.001);
        expect(rect.sy + rect.sh).toBeLessThanOrEqual(1600.001);
        // In original-image coordinates a quarter turn swaps the axes.
        expect(rect.sw / rect.sh).toBeCloseTo(rotation % 180 === 90 ? 1 / 0.8 : 0.8, 2);
      }
    }
    expect(coverScale(2400, 1600, 1.5)).toBeGreaterThan(0);
  });

  it('clamps panning so empty edges can never be saved', () => {
    const clamped = clampPan({
      offsetX: 99, offsetY: -99, imageWidth: 2000, imageHeight: 2000,
      aspectRatio: 1.5, zoom: 1, rotation: 0
    });
    expect(Math.abs(clamped.offsetX)).toBeLessThanOrEqual(clamped.maxX + 1e-9);
    expect(Math.abs(clamped.offsetY)).toBeLessThanOrEqual(clamped.maxY + 1e-9);
  });

  it('sizes the exported crop for print without inventing pixels', () => {
    const rule = getImageSlotRule({ heightClass: 'h-64 sm:h-[330px]', shape: 'rect' });
    const big = outputSizeForSlot(rule, { sw: 3000, sh: 2000 });
    expect(big.width).toBe(rule.recommendedWidth);
    const small = outputSizeForSlot(rule, { sw: 500, sh: 333 });
    expect(small.width).toBe(500);
    expect(filterString({ brightness: 110, contrast: 90, saturation: 100 })).toBe('brightness(1.1) contrast(0.9) saturate(1)');
  });
});
