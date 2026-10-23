import { describe, expect, it } from 'vitest';
import {
  appendChapterPage,
  buildChapterPagePatch,
  buildChapterPagesPatch,
  deleteChapterPage,
  getChapterPageForEditor,
  getChapterPages
} from '../src/utils/chapterPages.js';

function makeChapter() {
  return {
    id: 'chapter-1',
    title: 'Chapter 1',
    subtitle: '',
    contentHtml: '<p>Opening page</p>',
    structuredData: {
      pageStructure: 2,
      chapterText: 'Opening page',
      pages: [{
        id: 'page-1',
        contentHtml: '<p>Opening page</p>',
        structuredData: { pageStructure: 2, chapterText: 'Opening page' }
      }]
    }
  };
}

describe('chapter page persistence helpers', () => {
  it('migrates a legacy chapter record to page one and keeps its chapter heading', () => {
    const legacyChapter = {
      id: 'legacy-chapter',
      title: 'Legacy Title',
      contentHtml: '<p>Legacy content</p>',
      structuredData: { pageStructure: 3, chapterText: 'Legacy content' }
    };

    expect(getChapterPages(legacyChapter)).toHaveLength(1);
    expect(getChapterPageForEditor(legacyChapter, 0)).toMatchObject({
      title: 'Legacy Title',
      contentHtml: '<p>Legacy content</p>',
      structuredData: { pageStructure: 3 }
    });
  });

  it('saves page-one title changes on the chapter so the Index title updates automatically', () => {
    const chapter = makeChapter();
    const patch = buildChapterPagePatch(chapter, 0, {
      title: 'A New Chapter Title',
      contentHtml: '<p>Revised page one</p>',
      structuredData: { chapterText: 'Revised page one', pageStructure: 4 }
    });

    expect(patch.title).toBe('A New Chapter Title');
    expect(patch.contentHtml).toBe('<p>Revised page one</p>');
    expect(patch.structuredData.pages[0]).toMatchObject({
      contentHtml: '<p>Revised page one</p>',
      structuredData: { pageStructure: 4 }
    });
  });

  it('appends a blank page to the current chapter on every call and preserves its layout', () => {
    const chapter = makeChapter();
    const once = appendChapterPage(chapter, 0);
    const twice = appendChapterPage({ ...chapter, structuredData: { ...chapter.structuredData, pages: once } }, 1);

    expect(once).toHaveLength(2);
    expect(twice).toHaveLength(3);
    expect(once[1].contentHtml).toBe('');
    expect(once[1].structuredData.pageStructure).toBe(2);
    expect(new Set(twice.map((page) => page.id)).size).toBe(3);
    expect(buildChapterPagesPatch(chapter, once).structuredData.pages).toHaveLength(2);
  });

  it('deletes extra pages but never deletes the chapter’s only page or Index entry', () => {
    const chapter = makeChapter();
    const pages = appendChapterPage(chapter, 0);
    const withTwo = { ...chapter, structuredData: { ...chapter.structuredData, pages } };

    const deleted = deleteChapterPage(withTwo, 0);
    expect(deleted.deleted).toBe(true);
    expect(deleted.pages).toHaveLength(1);
    expect(deleted.activePageIndex).toBe(0);
    const deletePatch = buildChapterPagesPatch(withTwo, deleted.pages);
    expect(deletePatch.structuredData.pageStructure).toBe(2);
    expect(deletePatch.contentHtml).toBe('');

    const onlyPage = deleteChapterPage(chapter, 0);
    expect(onlyPage.deleted).toBe(false);
    expect(onlyPage.pages).toHaveLength(1);
  });

  it('keeps edits for non-first pages separate from the chapter title', () => {
    const chapter = makeChapter();
    const pages = appendChapterPage(chapter, 0);
    const withTwo = { ...chapter, structuredData: { ...chapter.structuredData, pages } };
    const patch = buildChapterPagePatch(withTwo, 1, {
      title: 'A page heading',
      contentHtml: '<p>Page two content</p>',
      structuredData: { pageStructure: 4 }
    });

    expect(patch.title).toBeUndefined();
    expect(patch.contentHtml).toBeUndefined();
    expect(patch.structuredData.pages[1]).toMatchObject({
      title: 'A page heading',
      contentHtml: '<p>Page two content</p>',
      structuredData: { pageStructure: 4 }
    });
  });
});
