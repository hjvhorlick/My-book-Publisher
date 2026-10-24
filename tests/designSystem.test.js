import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  BOOK_CATEGORIES,
  TEMPLATES_BY_CATEGORY
} from '../src/data/visualTemplatesCatalog.js';
import {
  PAGE_BORDER_STYLES,
  BLOCK_BORDER_STYLES,
  HEADING_STYLES,
  ORNAMENTS,
  DESIGN_PRESETS,
  PAGE_NUMBER_FORMATS,
  resolveTemplateDesign,
  blockStyleFor,
  borderColorChoices,
  contrastRatio,
  headingTreatment,
  pageNumberLabel,
  readableInk,
  toRoman,
  withAlpha
} from '../src/data/designSystem.js';
import { getTextSlotRule } from '../src/data/slotRules.js';
import { getAiFieldProfile } from '../src/data/aiPromptCatalog.js';
import ExactTemplatePageRenderer from '../src/components/ExactTemplatePageRenderer.jsx';
import IntroductionPageEditor from '../src/components/IntroductionPageEditor.jsx';
import CoverEditor from '../src/components/CoverEditor.jsx';
import PageDesignControls from '../src/components/PageDesignControls.jsx';

const ALL_TEMPLATES = BOOK_CATEGORIES.flatMap((category) =>
  (TEMPLATES_BY_CATEGORY[category.id] || []).map((template) => ({ category, template }))
);

function samplePage(template, categoryId, extra = {}) {
  return {
    id: 'sample-chapter',
    title: template.defaultPages?.[0]?.title || 'Sample Chapter Title',
    subtitle: template.defaultPages?.[0]?.subtitle || '',
    sectionType: BOOK_CATEGORIES.find((category) => category.id === categoryId)?.sectionType || 'chapter',
    layoutId: template.layoutId,
    updatedAt: '2026-01-01T00:00:00.000Z',
    structuredData: {
      pageStructure: 0,
      chapterText: '<p>The lantern had been waiting at the edge of the path.</p>',
      storyText: '<p>The lantern had been waiting at the edge of the path.</p>',
      articleBody: '<p>The lantern had been waiting at the edge of the path.</p>',
      overview: '<p>The lantern had been waiting at the edge of the path.</p>',
      ...extra
    }
  };
}

describe('template design system', () => {
  it('records a page border, text-block border, heading and ornament for every one of the 50 templates', () => {
    expect(PAGE_BORDER_STYLES.length).toBeGreaterThanOrEqual(14);
    expect(BLOCK_BORDER_STYLES.length).toBeGreaterThanOrEqual(10);
    expect(HEADING_STYLES.length).toBeGreaterThanOrEqual(7);
    expect(ORNAMENTS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(PAGE_BORDER_STYLES.map((style) => style.id)).size).toBe(PAGE_BORDER_STYLES.length);
    expect(new Set(BLOCK_BORDER_STYLES.map((style) => style.id)).size).toBe(BLOCK_BORDER_STYLES.length);

    let checked = 0;
    for (const [categoryId, templates] of Object.entries(TEMPLATES_BY_CATEGORY)) {
      for (const template of templates) {
        const design = resolveTemplateDesign(template);
        expect(PAGE_BORDER_STYLES.some((style) => style.id === design.pageBorderId), template.id).toBe(true);
        expect(BLOCK_BORDER_STYLES.some((style) => style.id === design.blockBorderId), template.id).toBe(true);
        expect(HEADING_STYLES.some((style) => style.id === design.headingStyleId), template.id).toBe(true);
        expect(ORNAMENTS.some((ornament) => ornament.id === design.ornamentId), template.id).toBe(true);
        expect(['arabic', 'roman', 'none']).toContain(design.pageNumbers);
        expect(design.pageBg).toMatch(/^#[0-9A-F]{6}$/);
        expect(design.categoryId).toBe(categoryId);
        // Every decorative rule must be drawn from the template palette.
        expect(design.borderColor).toMatch(/^#[0-9A-F]{6}$/);
        // Text ink is contrast-checked, never the raw accent.
        expect(contrastRatio(design.bodyText, design.pageBg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(design.headingColor, design.pageBg)).toBeGreaterThanOrEqual(4.4);
        checked += 1;
      }
    }
    expect(checked).toBe(50);
  });

  it('matches the distinctive sample previews (crest chapter book, poetry, tech magazine, starlight storybook)', () => {
    const find = (id) => ALL_TEMPLATES.find((entry) => entry.template.id === id).template;

    const crest = resolveTemplateDesign(find('book-historical-crest'));
    // The crest sample is framed with printed scroll-work, not a plain rule.
    expect(crest.pageBorderId).toBe('florentine');
    expect(crest.blockBorderId).toBe('parchment');
    expect(crest.headingStyleId).toBe('kicker-overline');
    expect(crest.dropCap).toBe(true);
    expect(crest.kicker).toBe(true);
    expect(crest.pageNumbers).toBe('roman');
    expect(crest.fontFamily).toBe('Newsreader');

    const poetry = resolveTemplateDesign(find('book-poetry-ivory'));
    expect(poetry.pageBorderId).toBe('fleur-trellis');
    expect(poetry.blockBorderId).toBe('underline-only');
    expect(poetry.ornamentId).toBe('diamond');

    const tech = resolveTemplateDesign(find('mag-tech-future'));
    expect(tech.pageBorderId).toBe('masthead-band');
    expect(tech.headingStyleId).toBe('masthead');
    expect(tech.kicker).toBe(true);

    const starlight = resolveTemplateDesign(find('story-starlight-frame'));
    // The sample shows a printed star band, so the frame is ornament, not a rule.
    expect(starlight.pageBorderId).toBe('starlit-frame');
    expect(starlight.dropCap).toBe(true);
    expect(starlight.fontFamily).toBe('Lora');
  });

  it('reproduces the sample picture exactly: illuminated initial and printed page numbers', () => {
    const crest = resolveTemplateDesign(TEMPLATES_BY_CATEGORY.book[7]);
    expect(crest.dropCap).toBe(true);
    expect(crest.dropCapStyle).toBe('boxed');
    expect(crest.pageNumberWord).toBe('Page');
    expect(crest.pageNumbers).toBe('roman');
    // A different template keeps its own plain furniture — no leaked wording.
    const plain = resolveTemplateDesign(TEMPLATES_BY_CATEGORY.book[1]);
    expect(plain.pageNumberWord).toBe('');
    expect(plain.dropCapStyle).toBe('plain');
    // The author can switch the wording back off.
    expect(resolveTemplateDesign(TEMPLATES_BY_CATEGORY.book[7], { pageNumberWord: '' }).pageNumberWord).toBe('');
  });

  it('offers a creative direction that visibly changes the page, for preview before choosing', () => {
    const template = TEMPLATES_BY_CATEGORY.cookbook[0];
    const base = resolveTemplateDesign(template);
    expect(DESIGN_PRESETS.length).toBeGreaterThanOrEqual(6);
    DESIGN_PRESETS.forEach((preset) => {
      const directed = resolveTemplateDesign(template, preset.design);
      expect(directed.pageBorderId).toBe(preset.design.pageBorderId);
      expect(directed.blockBorderId).toBe(preset.design.blockBorderId);
      expect(directed.headingStyleId).toBe(preset.design.headingStyleId);
      expect(
        `${directed.pageBorderId}|${directed.blockBorderId}|${directed.headingStyleId}`
      ).not.toBe(`${base.pageBorderId}|${base.blockBorderId}|${base.headingStyleId}`);
    });
  });

  it('draws the illuminated initial on the page instead of a plain coloured letter', () => {
    const crest = TEMPLATES_BY_CATEGORY.book[7];
    const markup = renderToStaticMarkup(
      React.createElement(ExactTemplatePageRenderer, {
        project: { id: 'p', title: 'The Crown of Valencia', publicationType: 'book', coverConfig: { visualTemplateId: crest.id } },
        chapter: samplePage(crest, 'book'),
        chapterIndex: 0,
        totalChapters: 1,
        pageIndex: 0,
        totalPages: 1,
        editable: false,
        assets: []
      })
    );
    expect(markup).toContain('fq-dropcap--boxed');
    expect(markup).toContain('--fq-dropcap-bg:');
    expect(markup).toContain('— Page I —');
  });

  it('lets the author pick a border colour, a text-block colour and a border ornament', () => {
    const template = TEMPLATES_BY_CATEGORY.book[7]; // royal burgundy crest template
    const overridden = resolveTemplateDesign(template, {
      borderColor: '#123456',
      blockColor: '#654321',
      pageBorderId: 'filigree',
      blockBorderId: 'ticket',
      headingStyleId: 'masthead',
      ornamentId: 'star',
      dropCap: false,
      kicker: false,
      pageNumbers: 'arabic'
    });
    expect(overridden.borderColor).toBe('#123456');
    expect(overridden.blockColor).toBe('#654321');
    expect(overridden.pageBorderId).toBe('filigree');
    expect(overridden.blockBorderId).toBe('ticket');
    expect(overridden.headingStyleId).toBe('masthead');
    expect(overridden.ornamentId).toBe('star');
    expect(overridden.dropCap).toBe(false);
    expect(overridden.kicker).toBe(false);
    expect(overridden.pageNumbers).toBe('arabic');

    const blockCss = blockStyleFor(overridden, { radius: 6 });
    expect(String(blockCss.border)).toContain('101, 67, 33');

    const choices = borderColorChoices(template);
    expect(choices.length).toBeGreaterThanOrEqual(6);
    expect(choices[0].value).toBe(template.borderColor.toUpperCase());
  });

  it('ignores invalid stored choices instead of breaking the page', () => {
    const template = TEMPLATES_BY_CATEGORY.book[0];
    const design = resolveTemplateDesign(template, {
      pageBorderId: 'not-a-border',
      blockBorderId: 'not-a-block',
      headingStyleId: 'nope',
      ornamentId: 'nope',
      pageNumbers: 'klingon'
    });
    expect(PAGE_BORDER_STYLES.some((style) => style.id === design.pageBorderId)).toBe(true);
    expect(BLOCK_BORDER_STYLES.some((style) => style.id === design.blockBorderId)).toBe(true);
    expect(HEADING_STYLES.some((style) => style.id === design.headingStyleId)).toBe(true);
    expect(ORNAMENTS.some((ornament) => ornament.id === design.ornamentId)).toBe(true);
    expect(design.pageNumbers).toBe('arabic');
  });

  it('keeps words readable even for a border colour equal to the page tint', () => {
    const template = TEMPLATES_BY_CATEGORY.book[6]; // midnight sci-fi
    const design = resolveTemplateDesign(template, { borderColor: '#0B132B' });
    expect(contrastRatio(design.bodyText, design.pageBg)).toBeGreaterThanOrEqual(4.5);
    // A decorative rule only needs to be visible, not high contrast.
    expect(contrastRatio(design.borderInk, design.pageBg)).toBeGreaterThan(1);
    expect(readableInk('#FFFFFF', '#FFFFFF', { fallback: '#111827' })).not.toBe('#FFFFFF');
    expect(headingTreatment({ ...design, headingStyleId: 'minimal-caps' }).titleStyle.color).toBeTruthy();
  });

  it('formats page numbers as arabic or roman and wraps them like a printed book', () => {
    expect(PAGE_NUMBER_FORMATS.map((format) => format.id)).toEqual(['arabic', 'roman', 'none']);
    expect(toRoman(1)).toBe('I');
    expect(toRoman(4)).toBe('IV');
    expect(toRoman(9)).toBe('IX');
    expect(toRoman(14)).toBe('XIV');
    expect(toRoman(40)).toBe('XL');
    const template = TEMPLATES_BY_CATEGORY.book[0];
    expect(pageNumberLabel(0, resolveTemplateDesign(template, { pageNumbers: 'arabic' }))).toBe('1');
    expect(pageNumberLabel(11, resolveTemplateDesign(template, { pageNumbers: 'roman' }))).toBe('XII');
    expect(pageNumberLabel(0, resolveTemplateDesign(template, { pageNumbers: 'none' }))).toBe('');
  });

  it('offers coherent one-tap creative directions', () => {
    expect(DESIGN_PRESETS.length).toBeGreaterThanOrEqual(6);
    const template = TEMPLATES_BY_CATEGORY.book[2];
    for (const preset of DESIGN_PRESETS) {
      const design = resolveTemplateDesign(template, preset.design);
      expect(PAGE_BORDER_STYLES.some((style) => style.id === design.pageBorderId), preset.id).toBe(true);
      expect(BLOCK_BORDER_STYLES.some((style) => style.id === design.blockBorderId), preset.id).toBe(true);
      expect(HEADING_STYLES.some((style) => style.id === design.headingStyleId), preset.id).toBe(true);
      expect(contrastRatio(design.headingColor, design.pageBg), preset.id).toBeGreaterThanOrEqual(4.4);
    }
  });

  it('draws the chosen border, colours and page furniture on the finished page', () => {
    const template = TEMPLATES_BY_CATEGORY.book.find((item) => item.id === 'book-historical-crest');
    const designOverrides = {
      borderColor: '#8B1A1A',
      blockColor: '#7F1D1D',
      pageBorderId: 'crest-corners',
      pageNumbers: 'roman',
      dropCap: true,
      kicker: true
    };
    const project = {
      id: 'project-design-test',
      title: 'The Crown of Valencia',
      publicationType: 'book',
      coverConfig: { visualTemplateId: template.id, design: designOverrides }
    };
    const chapter = samplePage(template, 'book');

    const markup = renderToStaticMarkup(
      React.createElement(ExactTemplatePageRenderer, {
        project,
        chapter,
        chapterIndex: 0,
        totalChapters: 1,
        pageIndex: 0,
        totalPages: 1,
        editable: false,
        assets: []
      })
    );

    expect(markup).toContain('data-page-border="crest-corners"');
    expect(markup).toContain('data-heading-style="kicker-overline"');
    expect(markup).toContain('data-page-kicker="true"');
    expect(markup).toContain('CHAPTER I');
    expect(markup).toContain('— Page I —');
    expect(markup).toContain('fq-dropcap');
    expect(markup).toContain('8B1A1A');
    expect(markup).toContain('data-block-border="parchment"');

    const plainMarkup = renderToStaticMarkup(
      React.createElement(ExactTemplatePageRenderer, {
        project: { ...project, coverConfig: { visualTemplateId: template.id } },
        chapter,
        chapterIndex: 0,
        totalChapters: 1,
        pageIndex: 0,
        totalPages: 1,
        editable: false,
        assets: []
      })
    );
    // Without overrides the template's own printed frame applies.
    expect(plainMarkup).toContain('data-page-border="florentine"');
    expect(plainMarkup).toContain('data-border-scroll');
    expect(plainMarkup).toContain('data-border-pattern');
    expect(plainMarkup).toContain('— Page I —');
    expect(plainMarkup).toContain('CHAPTER I');
  });

  it('applies the chosen page design to the Introduction page too', () => {
    const template = TEMPLATES_BY_CATEGORY.book.find((item) => item.id === 'book-warm-classic');
    const project = {
      id: 'intro-design',
      title: 'A Warm Book',
      publicationType: 'book',
      coverConfig: { visualTemplateId: template.id, design: { pageBorderId: 'holographic-vortex', borderColor: '#8B1A1A' } }
    };
    const markup = renderToStaticMarkup(
      React.createElement(IntroductionPageEditor, {
        project,
        visualTemplate: template,
        introduction: { title: 'Before We Begin', contentHtml: '<p>For those who waited up.</p>' },
        onUpdateProject: async () => {},
        editable: false
      })
    );
    // An unknown stored border id is repaired to a real ornament rather than
    // leaving the page undecorated.
    expect(markup).toContain('data-page-kind="introduction"');
    expect(markup).not.toContain('data-page-border="holographic-vortex"');
    // A real ornamental border resolves to itself and draws its artwork.
    expect(resolveTemplateDesign(template, { pageBorderId: 'gilded-arch' }).pageBorderId).toBe('gilded-arch');
    expect(markup).toContain('Before We Begin');
    expect(markup).toContain('For those who waited up.');
  });
});

describe('front-matter and cover typing surfaces', () => {
  it('gives the Introduction page a full-page writing budget instead of a 100-word note cap', () => {
    const rule = getTextSlotRule({ categoryId: 'book', fieldKey: 'introduction', rows: 18, maxWords: 700 });
    expect(rule.maxWords).toBeGreaterThanOrEqual(500);
    expect(rule.formatLabel).toBe('Main page text');
    expect(getAiFieldProfile('book', 'introduction').maxWords).toBe(700);
    expect(getAiFieldProfile('photobook', 'coverBlurb').maxWords).toBeLessThanOrEqual(60);
  });

  it('renders an Introduction page whose heading and body are visible while typing', () => {
    const template = TEMPLATES_BY_CATEGORY.book.find((item) => item.id === 'book-thriller-noir');
    const project = {
      id: 'intro-typing',
      title: 'Dark Water',
      publicationType: 'book',
      coverConfig: { visualTemplateId: template.id }
    };
    const markup = renderToStaticMarkup(
      React.createElement(IntroductionPageEditor, {
        project,
        visualTemplate: template,
        introduction: { title: 'A Note Before the Story', contentHtml: '' },
        onUpdateProject: async () => {},
        editable: true
      })
    );
    // A visible typing surface with an explicit ink colour — not a faint
    // inherited colour on a dark page.
    expect(markup).toContain('fq-page-field');
    expect(markup).toContain('--fq-field-ink');
    expect(markup).toContain('aria-label="Introduction page heading"');
    expect(markup).toContain('aria-label="Introduction page text editor');
    expect(markup).toContain('/ 700 words');
    expect(markup).toContain('data-page-number="1"');
  });

  it('gives the cover designer legible fields and a cover-wording budget', () => {
    const template = TEMPLATES_BY_CATEGORY.photobook[0];
    const project = {
      id: 'cover-typing',
      title: 'Salt & Light',
      authorName: 'A. Author',
      publicationType: 'photobook',
      coverConfig: { visualTemplateId: template.id }
    };
    const markup = renderToStaticMarkup(
      React.createElement(CoverEditor, {
        project,
        visualTemplate: template,
        categoryId: 'photobook',
        trimSize: '10x8',
        assets: [],
        onUpdateProject: async () => {}
      })
    );
    const fieldCount = (markup.match(/fq-page-field/g) || []).length;
    expect(fieldCount).toBeGreaterThanOrEqual(4);
    expect(markup).toContain('--fq-field-ink:#0F172A');
    expect(markup).toContain('words — a cover line reads best when it is short.');
    expect(markup).toContain('Book cover · background + word art');
  });

  it('shows every page-border, block and creative-direction choice in the design panel', () => {
    const template = TEMPLATES_BY_CATEGORY.cookbook[0];
    const markup = renderToStaticMarkup(
      React.createElement(PageDesignControls, {
        project: {
          id: 'design-panel',
          publicationType: 'cookbook',
          coverConfig: { visualTemplateId: template.id }
        },
        visualTemplate: template,
        onUpdateProject: async () => {}
      })
    );
    expect((markup.match(/aria-label="Page border: /g) || []).length).toBe(PAGE_BORDER_STYLES.length);
    expect((markup.match(/aria-label="Text-block border: /g) || []).length).toBe(BLOCK_BORDER_STYLES.length);
    expect((markup.match(/aria-label="Apply the [^"]* page design"/g) || []).length).toBe(DESIGN_PRESETS.length);
    expect(markup).toContain('aria-label="Page border colour"');
    expect(markup).toContain('aria-label="Text-block border colour"');
    expect(markup).toContain('aria-label="Page heading style"');
    expect(markup).toContain('aria-label="Page ornament"');
    expect(markup).toContain('aria-label="Page number style"');
    expect(markup).toContain('Custom page border colour');
    expect(markup).toContain('Use template design');
    // The template's own border colour is offered as the first swatch.
    expect(markup).toContain(`Page border colour: Template border`);
    expect(markup).toContain(template.borderColor.toUpperCase());
  });
});
