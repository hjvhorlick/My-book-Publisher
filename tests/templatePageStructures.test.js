import { describe, expect, it } from 'vitest';
import {
  BOOK_CATEGORIES,
  TEMPLATES_BY_CATEGORY
} from '../src/data/visualTemplatesCatalog.js';
import {
  PAGE_COUNT_OPTIONS,
  TEMPLATE_PAGE_STRUCTURE_COUNT,
  buildPlannedPagesList,
  getTemplatePageStructures
} from '../src/data/templatePageStructures.js';

describe('five page layouts and chapter planning', () => {
  it('offers the required 5, 10, 20, and 30 chapter choices', () => {
    expect(PAGE_COUNT_OPTIONS).toEqual([5, 10, 20, 30]);
  });

  it('provides five distinct, template-matched layouts for all 48 visual templates', () => {
    let templateCount = 0;

    for (const category of BOOK_CATEGORIES) {
      const templates = TEMPLATES_BY_CATEGORY[category.id];
      expect(templates).toHaveLength(8);

      for (const template of templates) {
        templateCount += 1;
        const layouts = getTemplatePageStructures(category.id, template);
        expect(layouts).toHaveLength(TEMPLATE_PAGE_STRUCTURE_COUNT);
        expect(new Set(layouts.map((layout) => layout.name)).size).toBe(5);
        expect(new Set(layouts.map((layout) => layout.borderName)).size).toBe(5);
        expect(new Set(layouts.map((layout) => layout.frameName)).size).toBe(5);
        expect(new Set(layouts.map((layout) => layout.cardName)).size).toBe(5);

        for (const layout of layouts) {
          expect(layout.templateId).toBe(template.id);
          expect(layout.pageBg).toBe(template.pageBg);
          expect(layout.pageText).toBe(template.pageText);
          expect(layout.borderColor).toBe(template.borderColor);
          expect(layout.accentColor).toBe(template.accentColor);
          expect(layout.fontFamily).toBe(template.fontFamily);
        }
      }
    }

    expect(templateCount).toBe(48);
  });

  it.each(PAGE_COUNT_OPTIONS)(
    'builds exactly %i chapter Index entries and preserves edited titles and layouts',
    (count) => {
      const categoryId = 'photobook';
      const template = TEMPLATES_BY_CATEGORY[categoryId][0];
      const chapters = buildPlannedPagesList({ count, template, categoryId });

      expect(chapters).toHaveLength(count);
      expect(chapters.map((chapter, index) => chapter.title)).toEqual(
        Array.from({ length: count }, (_, index) => `Chapter ${index + 1}`)
      );
      expect(chapters.map((chapter) => chapter.pageStructure)).toEqual(
        Array.from({ length: count }, () => 0)
      );

      chapters[0] = { ...chapters[0], title: 'My Chapter Title', pageStructure: 4 };
      const resized = buildPlannedPagesList({
        count: Math.max(count, 5),
        existingPages: chapters,
        template,
        categoryId
      });
      expect(resized[0].title).toBe('My Chapter Title');
      expect(resized[0].pageStructure).toBe(4);
      expect(resized.slice(1).every((chapter) => chapter.pageStructure === 0)).toBe(true);
    }
  );
});
