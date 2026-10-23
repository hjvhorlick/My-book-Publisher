export const MIN_CHAPTER_PAGE_COUNT = 1;

function pageStructuredData(value) {
  const data = value && typeof value === 'object' ? { ...value } : {};
  delete data.pages;
  return data;
}

/**
 * Read a chapter's page list, migrating the legacy single-page chapter fields into
 * page one in memory. The persisted record is upgraded the first time it is saved.
 */
export function getChapterPages(chapter) {
  if (!chapter) return [];

  const rootData = pageStructuredData(chapter.structuredData);
  const persistedPages = chapter.structuredData?.pages;
  if (Array.isArray(persistedPages) && persistedPages.length > 0) {
    return persistedPages.map((page, index) => {
      const sourcePage = page && typeof page === 'object' ? page : {};
      const {
        id,
        title,
        subtitle,
        contentHtml,
        structuredData,
        ...legacyPageFields
      } = sourcePage;
      return {
        id: id || `${chapter.id || 'chapter'}-page-${index + 1}`,
        title: title || '',
        subtitle: subtitle || '',
        contentHtml: contentHtml || (index === 0 ? chapter.contentHtml || '' : ''),
        // Older page arrays sometimes kept category fields beside, rather than inside,
        // structuredData. Fold their values into the editor view so a save preserves them.
        structuredData: {
          ...legacyPageFields,
          ...pageStructuredData(structuredData)
        }
      };
    });
  }

  return [
    {
      id: `${chapter.id || 'chapter'}-page-1`,
      title: '',
      subtitle: '',
      contentHtml: chapter.contentHtml || '',
      structuredData: rootData
    }
  ];
}

/** Compose the chapter-shaped object expected by the page editor for one page. */
export function getChapterPageForEditor(chapter, pageIndex = 0) {
  const pages = getChapterPages(chapter);
  if (!chapter || pages.length === 0) return null;

  const safeIndex = Math.max(0, Math.min(Number(pageIndex) || 0, pages.length - 1));
  const page = pages[safeIndex];
  const rootData = pageStructuredData(chapter.structuredData);
  const pageData = safeIndex === 0
    ? { ...rootData, ...page.structuredData }
    : { ...page.structuredData };

  return {
    ...chapter,
    title: safeIndex === 0 ? chapter.title : page.title,
    subtitle: safeIndex === 0 ? (chapter.subtitle || page.subtitle) : page.subtitle,
    contentHtml: page.contentHtml || '',
    structuredData: pageData
  };
}

/** Convert a page-editor save into the chapter-row update expected by the API. */
export function buildChapterPagePatch(chapter, pageIndex = 0, updates = {}) {
  if (!chapter) return {};
  const pages = getChapterPages(chapter);
  const safeIndex = Math.max(0, Math.min(Number(pageIndex) || 0, pages.length - 1));
  const currentPage = pages[safeIndex];
  const nextPage = { ...currentPage };

  if (updates.title !== undefined) {
    if (safeIndex === 0) {
      // Page one carries the chapter heading and therefore supplies the Index label.
      nextPage.title = '';
    } else {
      nextPage.title = String(updates.title);
    }
  }
  if (updates.subtitle !== undefined) {
    nextPage.subtitle = String(updates.subtitle || '');
  }
  if (updates.contentHtml !== undefined) {
    nextPage.contentHtml = String(updates.contentHtml || '');
  }
  if (updates.structuredData && typeof updates.structuredData === 'object') {
    nextPage.structuredData = {
      ...currentPage.structuredData,
      ...pageStructuredData(updates.structuredData)
    };
  }

  const nextPages = pages.map((page, index) => index === safeIndex ? nextPage : page);
  const rootData = pageStructuredData(chapter.structuredData);
  const nextRootData = {
    ...rootData,
    ...(safeIndex === 0 ? nextPage.structuredData : {}),
    pages: nextPages
  };
  const patch = { structuredData: nextRootData };

  if (safeIndex === 0) {
    if (updates.title !== undefined) patch.title = String(updates.title);
    if (updates.subtitle !== undefined) patch.subtitle = String(updates.subtitle || '');
    if (updates.contentHtml !== undefined) patch.contentHtml = String(updates.contentHtml || '');
  }

  if (updates.sectionType !== undefined) patch.sectionType = updates.sectionType;
  if (updates.layoutId !== undefined) patch.layoutId = updates.layoutId;
  return patch;
}

/** Append a blank page while preserving the current chapter and its first-page title. */
export function appendChapterPage(chapter, sourcePageIndex = 0) {
  const pages = getChapterPages(chapter);
  if (!chapter || pages.length === 0) return pages;
  const safeIndex = Math.max(0, Math.min(Number(sourcePageIndex) || 0, pages.length - 1));
  const source = pages[safeIndex];
  const sourceStructure = Number(source.structuredData?.pageStructure);
  const pageId = `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return [
    ...pages,
    {
      id: pageId,
      title: '',
      subtitle: '',
      contentHtml: '',
      structuredData: {
        ...(Number.isInteger(sourceStructure) && sourceStructure >= 0
          ? { pageStructure: sourceStructure % 5 }
          : { pageStructure: 0 }),
        isFlipped: false,
        mosaicVariant: 0
      }
    }
  ];
}

/** Delete a page without ever allowing a chapter/Index entry to have zero pages. */
export function deleteChapterPage(chapter, pageIndex = 0) {
  const pages = getChapterPages(chapter);
  if (pages.length <= MIN_CHAPTER_PAGE_COUNT) {
    return { pages, deleted: false, activePageIndex: 0 };
  }

  const safeIndex = Math.max(0, Math.min(Number(pageIndex) || 0, pages.length - 1));
  const nextPages = pages.filter((_, index) => index !== safeIndex);
  return {
    pages: nextPages,
    deleted: true,
    activePageIndex: Math.min(safeIndex, nextPages.length - 1)
  };
}

/** Root structured-data patch used by page creation and deletion controls. */
export function buildChapterPagesPatch(chapter, pages) {
  if (!chapter) return {};
  const existingPages = getChapterPages(chapter);
  const nextPages = pages.length > 0 ? pages : existingPages;
  const rootData = pageStructuredData(chapter.structuredData);
  const firstPageData = pageStructuredData(nextPages[0]?.structuredData);
  const firstPageChanged = nextPages[0]?.id !== existingPages[0]?.id;

  return {
    structuredData: {
      ...(firstPageChanged ? firstPageData : { ...rootData, ...firstPageData }),
      pages: nextPages
    },
    ...(firstPageChanged ? { contentHtml: nextPages[0]?.contentHtml || '' } : {})
  };
}
