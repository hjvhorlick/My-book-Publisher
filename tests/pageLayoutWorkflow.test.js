import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BOOK_CATEGORIES,
  TEMPLATES_BY_CATEGORY
} from '../src/data/visualTemplatesCatalog.js';
import ExactTemplatePageRenderer from '../src/components/ExactTemplatePageRenderer.jsx';
import WritingStudioView from '../src/views/WritingStudioView.jsx';

function makePage(category, template) {
  return {
    id: `chapter-${category.id}`,
    title: 'Sample Chapter Title',
    subtitle: '',
    sectionType: category.sectionType,
    layoutId: template.layoutId,
    updatedAt: '2026-01-01T00:00:00.000Z',
    structuredData: {
      pageStructure: 0,
      mosaicVariant: 0,
      isFlipped: false,
      pages: [{ id: 'page-1', title: '', contentHtml: '', structuredData: { pageStructure: 0 } }]
    }
  };
}

describe('Step 4 chapter-page layout workflow', () => {
  it('renders all five editor layouts for every one of the 48 templates across six categories', () => {
    let pathsChecked = 0;
    for (const category of BOOK_CATEGORIES) {
      for (const template of TEMPLATES_BY_CATEGORY[category.id]) {
        for (let structureIndex = 0; structureIndex < 5; structureIndex += 1) {
          const chapter = makePage(category, template);
          chapter.structuredData.pageStructure = structureIndex;
          const markup = renderToStaticMarkup(
            React.createElement(ExactTemplatePageRenderer, {
              project: {
                id: `project-${category.id}-${template.id}`,
                publicationType: category.id,
                coverConfig: { visualTemplateId: template.id, fontFamily: template.fontFamily }
              },
              chapter,
              chapterIndex: 0,
              totalChapters: 1,
              pageIndex: 0,
              totalPages: 1,
              editable: true,
              onSaveChapter: async () => {},
              assets: []
            })
          );

          expect((markup.match(/aria-label="Use Layout [1-5] for this page:/g) || []).length)
            .toBe(5);
          expect(markup).toContain(`aria-label="Use Layout ${structureIndex + 1} for this page:`);
          expect(markup).toContain('aria-pressed="true"');
          expect(markup).toContain('Choose a layout for this page');
          expect(markup).toContain('Page subtitle editor');
          expect(markup).not.toContain('aria-label="Generate ');
          expect(markup).toContain('One page editor for every template');
          pathsChecked += 1;
        }
      }
    }
    expect(pathsChecked).toBe(240);
  });

  it('keeps AI and formatting tools inside block editors, off the designed page', () => {
    for (const category of BOOK_CATEGORIES) {
      const template = TEMPLATES_BY_CATEGORY[category.id][0];
      const project = {
        id: `ai-project-${category.id}`,
        title: 'Contextual Book',
        centralIdea: 'A thoughtful theme',
        publicationType: category.id,
        coverConfig: { visualTemplateId: template.id, fontFamily: template.fontFamily }
      };
      const chapter = makePage(category, template);
      chapter.structuredData.pageStructure = 4;
      const markup = renderToStaticMarkup(
        React.createElement(ExactTemplatePageRenderer, {
          project,
          chapter,
          chapterIndex: 0,
          totalChapters: 1,
          pageIndex: 0,
          totalPages: 1,
          editable: true,
          aiConfigured: true,
          onSaveChapter: async () => {},
          assets: []
        })
      );
      // Every block offers its small Edit button; the big inline toolbars and
      // per-field AI buttons deliberately no longer exist on the page.
      expect(markup).toContain('aria-label="Edit ');
      expect(markup).not.toContain('aria-label="Generate ');
      expect(markup).not.toContain('Write with AI');
      expect(markup).not.toContain('contentEditable="true"');
    }
  });

  it('provides an Edit button for every text block in every category and layout', () => {
    for (const category of BOOK_CATEGORIES) {
      for (const template of TEMPLATES_BY_CATEGORY[category.id]) {
        for (let structureIndex = 0; structureIndex < 5; structureIndex += 1) {
          const chapter = makePage(category, template);
          chapter.structuredData.pageStructure = structureIndex;
          const markup = renderToStaticMarkup(
            React.createElement(ExactTemplatePageRenderer, {
              project: {
                id: `ai-fields-${category.id}-${template.id}`,
                title: 'A Contextual Book',
                centralIdea: 'A clear topic',
                targetAudience: 'Interested readers',
                publicationType: category.id,
                coverConfig: { visualTemplateId: template.id, fontFamily: template.fontFamily }
              },
              chapter,
              chapterIndex: 1,
              totalChapters: 3,
              pageIndex: 2,
              totalPages: 4,
              chapterSummaries: [{ title: 'Earlier chapter', synopsis: 'A prior event.' }],
              editable: true,
              aiConfigured: true,
              onSaveChapter: async () => {},
              assets: []
            })
          );
          const editButtonCount = (markup.match(/aria-label="Edit /g) || []).length;
          // Heading + subtitle + at least the page's main blocks are editable.
          expect(editButtonCount, `${category.id}/${template.id}/layout-${structureIndex + 1}`).toBeGreaterThanOrEqual(3);
          expect(markup).not.toContain('contentEditable="true"');
        }
      }
    }
  });

  it('renders a clean published page: words and images only, no editing tools', () => {
    for (const category of BOOK_CATEGORIES) {
      const template = TEMPLATES_BY_CATEGORY[category.id][0];
      const chapter = makePage(category, template);
      const markup = renderToStaticMarkup(
        React.createElement(ExactTemplatePageRenderer, {
          project: {
            id: `published-${category.id}`,
            title: 'A Finished Book',
            publicationType: category.id,
            coverConfig: { visualTemplateId: template.id, fontFamily: template.fontFamily }
          },
          chapter,
          chapterIndex: 0,
          totalChapters: 1,
          pageIndex: 0,
          totalPages: 1,
          editable: false,
          aiConfigured: true,
          assets: []
        })
      );
      expect(markup, category.id).toContain('Sample Chapter Title');
      expect(markup, category.id).not.toContain('aria-label="Edit ');
      expect(markup, category.id).not.toContain('Tap Edit');
      expect(markup, category.id).not.toContain('contentEditable');
      expect(markup, category.id).not.toContain('Write with AI');
      expect(markup, category.id).not.toContain('Generate ');
      expect(markup, category.id).not.toContain('Layout 1 · Chapter');
      expect(markup, category.id).not.toContain('CLASSICAL PAGE DESIGN');
      expect(markup, category.id).not.toContain('Upload');
      expect(markup, category.id).not.toContain('Stock photos');
      // The running head carries the book title; the footer is just the page number.
      expect(markup, category.id).toContain('A Finished Book');
      expect(markup, category.id).toContain('— 1 —');
    }
  });

  it('keeps page-level creation and deletion tools inside the current chapter', () => {
    const category = BOOK_CATEGORIES[0];
    const template = TEMPLATES_BY_CATEGORY[category.id][0];
    const chapter = makePage(category, template);
    const markup = renderToStaticMarkup(
      React.createElement(WritingStudioView, {
        project: {
          id: 'project-page-test',
          title: 'Sample Book',
          publicationType: category.id,
          coverConfig: { visualTemplateId: template.id, fontFamily: template.fontFamily }
        },
        chapters: [chapter],
        activeChapter: chapter,
        activePageIndex: 0,
        assets: [],
        onSaveChapter: async () => chapter,
        onAssetsChanged: () => {},
        onUpdateProject: async () => {},
        notify: () => {}
      })
    );

    const layoutPosition = markup.indexOf('Choose a layout for this page');
    const savePosition = markup.indexOf('Save Page');
    expect(layoutPosition).toBeGreaterThan(-1);
    expect(markup).toContain('Sample Chapter Title');
    expect(savePosition).toBeGreaterThan(layoutPosition);
    expect(markup).toContain('Previous Page');
    expect(markup).toContain('Next Page');
    expect(markup).toContain('Delete Page');
    expect(markup).toContain('Select a page in this chapter');
    expect(markup).toContain('aria-label="Book font"');
    expect((markup.match(/aria-label="Use [^"]+ template"/g) || []).length).toBe(8);
    expect(markup).not.toContain('Continue to Step 5');
    expect(markup).not.toContain('Step 4 of 5');
    expect(markup).not.toContain('Front of Book (1 Index Page)');
    expect(markup).not.toContain('Save This Page');
  });
});
