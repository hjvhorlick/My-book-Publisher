import { describe, expect, it } from 'vitest';
import { BOOK_CATEGORIES } from '../src/data/visualTemplatesCatalog.js';
import {
  AI_FIELD_PROFILES,
  AI_PROMPT_CATALOG_VERSION,
  buildAiFieldPrompt,
  getAiFieldProfile
} from '../src/data/aiPromptCatalog.js';

describe('field-aware AI prompt catalog', () => {
  it('has maintainable prompt profiles for all six book categories', () => {
    expect(AI_PROMPT_CATALOG_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(Object.keys(AI_FIELD_PROFILES).sort()).toEqual(BOOK_CATEGORIES.map((category) => category.id).sort());
    for (const category of BOOK_CATEGORIES) {
      expect(Object.keys(AI_FIELD_PROFILES[category.id]).length).toBeGreaterThan(0);
      for (const profile of Object.values(AI_FIELD_PROFILES[category.id])) {
        expect(profile.label).toBeTruthy();
        expect(profile.format).toBeTruthy();
        expect(profile.maxWords).toBeGreaterThan(0);
      }
    }
  });

  it('covers every primary field rendered by the category-specific writing layouts', () => {
    const expected = {
      photobook: ['curatorialNote', 'photoCaption', 'photoLocation', 'chapterTitle', 'pageSubtitle'],
      cookbook: ['ingredients', 'steps', 'chefNotes', 'servings', 'prepTime', 'cookTime', 'course', 'difficulty', 'photoCaption', 'photoLocation', 'chapterTitle', 'pageSubtitle'],
      magazine: ['kicker', 'byline', 'articleBody', 'pullQuote', 'sidebarContent', 'photoCaption', 'photoLocation', 'chapterTitle', 'pageSubtitle'],
      storybook: ['storyText', 'moral', 'illustrationPrompt', 'photoCaption', 'photoLocation', 'chapterTitle', 'pageSubtitle'],
      informational: ['overview', 'calloutTitle', 'calloutBody', 'tableNotes', 'roadmapSteps', 'comparisonLeft', 'comparisonRight', 'photoCaption', 'photoLocation', 'chapterTitle', 'pageSubtitle'],
      book: ['chapterText', 'epigraph', 'marginNote', 'pullQuote', 'photoCaption', 'photoLocation', 'chapterTitle', 'pageSubtitle']
    };
    for (const [categoryId, fieldKeys] of Object.entries(expected)) {
      for (const fieldKey of fieldKeys) {
        expect(AI_FIELD_PROFILES[categoryId][fieldKey], `${categoryId}.${fieldKey}`).toBeTruthy();
      }
    }
  });

  it('adapts the hidden prompt to book, chapter, page, field, style, and exact word limit', () => {
    const prompt = buildAiFieldPrompt({
      categoryId: 'storybook',
      project: {
        title: 'Milo and the Moon Lantern',
        subtitle: 'A story about brave small steps',
        penName: 'A. Writer',
        centralIdea: 'friendship and courage',
        description: 'A child and a lantern travel through a midnight orchard.',
        targetAudience: 'Children aged 5–8',
        publicationType: 'storybook'
      },
      chapter: {
        title: 'The Blue Orchard',
        synopsis: 'Milo meets a quiet fox beneath blue trees.',
        guidance: { purpose: 'Show that asking for help can be brave.', questions: ['Who can Milo trust?'] }
      },
      chapterSummaries: [
        { title: 'The Lantern Wakes', synopsis: 'Milo finds a lantern.' },
        { title: 'The Blue Orchard', synopsis: 'Milo meets a quiet fox.' }
      ],
      bookTitle: 'Milo and the Moon Lantern',
      topic: 'friendship and courage',
      chapterTitle: 'The Blue Orchard',
      chapterIndex: 3,
      pageIndex: 5,
      totalPages: 8,
      totalChapters: 4,
      pageHeading: 'Under the Blue Trees',
      pageSubtitle: 'A light appears between the branches',
      templateName: 'Midnight Storybook',
      fieldKey: 'storyText',
      fieldContext: 'A silver lantern glows near the orchard gate.',
      maxWords: 42,
      currentText: '<p>The lantern <strong>blinked twice</strong>.</p>'
    });

    expect(prompt).toContain('Book title: Milo and the Moon Lantern');
    expect(prompt).toContain('Book type: Children’s Picture Book');
    expect(prompt).toContain('Central idea / topic: friendship and courage');
    expect(prompt).toContain('Book description: A child and a lantern travel through a midnight orchard.');
    expect(prompt).toContain('Intended reader: Children aged 5–8');
    expect(prompt).toContain('Current chapter: The Blue Orchard');
    expect(prompt).toContain('Chapter synopsis: Milo meets a quiet fox beneath blue trees.');
    expect(prompt).toContain('Purpose: Show that asking for help can be brave.');
    expect(prompt).toContain('The Lantern Wakes — Milo finds a lantern.');
    expect(prompt).toContain('Current page number: 6 of 8 in chapter 4 of 4');
    expect(prompt).toContain('Page heading: Under the Blue Trees');
    expect(prompt).toContain('Page subtitle / deck: A light appears between the branches');
    expect(prompt).toContain('Selected visual template: Midnight Storybook');
    expect(prompt).toContain('Field to fill: Picture-book story text (storyText)');
    expect(prompt).toContain('Relevant image or field details: A silver lantern glows near the orchard gate.');
    expect(prompt).toContain('Maximum length: 42 words.');
    expect(prompt).toContain('The lantern blinked twice.');
    expect(prompt).not.toContain('<strong>');
  });

  it('uses a safe, bounded generic profile for new fields until their prompt is catalogued', () => {
    const profile = getAiFieldProfile('book', 'newField');
    expect(profile.maxWords).toBe(100);
    expect(buildAiFieldPrompt({ categoryId: 'book', fieldKey: 'newField', maxWords: 9999 })).toContain('Maximum length: 500 words.');
  });
});
