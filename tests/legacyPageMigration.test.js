import { describe, expect, it } from 'vitest';
import { migrateLegacyPageStructuredData } from '../src/utils/legacyPageMigration.js';
import {
  buildChapterPagePatch,
  getChapterPageForEditor,
  getChapterPages
} from '../src/utils/chapterPages.js';

describe('additive migration of legacy page fields into the shared editor', () => {
  it.each([
    {
      category: 'photobook',
      page: {
        mosaicVariant: 2,
        photos: [{ photoUrl: 'data:image/png;base64,cGhvdG8=', caption: 'Harbor at dawn', location: 'Benoni' }]
      },
      contentHtml: '<p>A copper dawn settled over the harbor.</p>',
      expected: {
        pageStructure: 2,
        curatorialNote: '<p>A copper dawn settled over the harbor.</p>',
        captions: [{ title: 'Harbor at dawn', location: 'Benoni', imageUrl: 'data:image/png;base64,cGhvdG8=' }]
      }
    },
    {
      category: 'cookbook',
      page: {
        servings: '4',
        prepTime: '15 minutes',
        ingredients: [{ amount: '1', unit: 'cup', item: 'oats' }],
        steps: [{ step: 1, detail: 'Stir gently.' }],
        headnote: 'A family breakfast favorite.'
      },
      expected: {
        servings: '4',
        prepTime: '15 minutes',
        ingredientsHtml: '1 cup oats',
        stepsHtml: '1. — Stir gently.',
        chefNotes: 'A family breakfast favorite.'
      }
    },
    {
      category: 'magazine',
      page: {
        bodyText: '<p>A reported feature with a clear opening.</p>',
        kicker: 'CITY LIFE',
        byline: 'By N. Writer',
        quote: 'A bright, memorable line.',
        sidebarItems: ['First highlight', 'Second highlight']
      },
      expected: {
        articleBody: '<p>A reported feature with a clear opening.</p>',
        kicker: 'CITY LIFE',
        byline: 'By N. Writer',
        pullQuote: 'A bright, memorable line.',
        sidebarContent: 'First highlight\nSecond highlight'
      }
    },
    {
      category: 'storybook',
      page: {
        narrative: '<p>Milo crossed the moonlit orchard.</p>',
        lesson: 'Asking for help is brave.',
        illustrationPrompt: 'A silver lantern beneath blue trees.'
      },
      expected: {
        storyText: '<p>Milo crossed the moonlit orchard.</p>',
        moral: 'Asking for help is brave.',
        illustrationPrompt: 'A silver lantern beneath blue trees.'
      }
    },
    {
      category: 'informational',
      page: {
        objective: 'Plan a safe, practical route.',
        tipTitle: 'Check the weather',
        learningObjectives: ['Pack water', 'Tell someone your route'],
        referenceTable: { caption: 'Signals', headers: ['Signal', 'Meaning'], rows: [['Blue', 'Clear'] ] },
        checklistItems: ['Choose a route', 'Share the plan'],
        comparisonOptions: { left: 'Short route', right: 'Shaded route' }
      },
      expected: {
        overview: 'Plan a safe, practical route.',
        calloutTitle: 'Check the weather',
        calloutBody: 'Pack water\nTell someone your route',
        tableNotes: 'Signals\nSignal | Meaning\nBlue | Clear',
        roadmapSteps: 'Choose a route\nShare the plan',
        comparisonLeft: 'Short route',
        comparisonRight: 'Shaded route'
      }
    },
    {
      category: 'book',
      page: {
        manuscript: '<p>She opened the old atlas.</p>',
        openingQuote: 'A new road begins.',
        authorNote: 'Keep the mystery quiet.'
      },
      expected: {
        chapterText: '<p>She opened the old atlas.</p>',
        epigraph: 'A new road begins.',
        marginNote: 'Keep the mystery quiet.'
      }
    }
  ])('maps $category legacy content without removing the original fields', ({ category, page, contentHtml = '', expected }) => {
    const { structuredData, changed } = migrateLegacyPageStructuredData({ contentHtml, structuredData: page }, category);
    expect(changed).toBe(true);
    expect(structuredData).toMatchObject(expected);
    for (const [key, value] of Object.entries(page)) {
      expect(structuredData[key]).toEqual(value);
    }
  });

  it('keeps legacy top-level page fields, images, captions, and layout state through a normal save patch', () => {
    const chapter = {
      id: 'legacy-chapter',
      title: 'Chapter title',
      contentHtml: '<p>Opening text</p>',
      structuredData: {
        pageStructure: 0,
        pages: [{
          id: 'legacy-page-1',
          title: '',
          contentHtml: '<p>Opening text</p>',
          imageUrl: 'data:image/jpeg;base64,aW1hZ2U=',
          captions: [{ title: 'Old caption', location: 'Garden', imageUrl: 'data:image/jpeg;base64,aW1hZ2U=' }],
          mosaicVariant: 4,
          isFlipped: true,
          oldLayoutName: 'archival-spread',
          structuredData: { legacyBody: '<p>Unstructured text</p>' }
        }]
      }
    };

    const pages = getChapterPages(chapter);
    expect(pages[0].structuredData).toMatchObject({
      imageUrl: 'data:image/jpeg;base64,aW1hZ2U=',
      captions: [{ title: 'Old caption', location: 'Garden', imageUrl: 'data:image/jpeg;base64,aW1hZ2U=' }],
      mosaicVariant: 4,
      isFlipped: true,
      oldLayoutName: 'archival-spread',
      legacyBody: '<p>Unstructured text</p>'
    });

    const editorPage = getChapterPageForEditor(chapter, 0);
    const patch = buildChapterPagePatch(chapter, 0, {
      title: 'Chapter title',
      structuredData: { chapterText: '<p>Revised safely</p>' }
    });
    expect(editorPage.structuredData).toMatchObject(pages[0].structuredData);
    expect(patch.structuredData.pages[0].structuredData).toMatchObject({
      imageUrl: 'data:image/jpeg;base64,aW1hZ2U=',
      captions: [{ title: 'Old caption', location: 'Garden', imageUrl: 'data:image/jpeg;base64,aW1hZ2U=' }],
      mosaicVariant: 4,
      isFlipped: true,
      oldLayoutName: 'archival-spread',
      legacyBody: '<p>Unstructured text</p>',
      chapterText: '<p>Revised safely</p>'
    });
  });
});
