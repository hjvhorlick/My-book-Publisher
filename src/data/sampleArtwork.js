/**
 * BUNDLED SAMPLE ARTWORK — the free, offline image library.
 *
 * Why this exists
 * ---------------
 * Stock-photo search needs an internet connection and a Pexels/Pixabay API key.
 * A writer on a train, a school laptop with no network, or a first-time user
 * who has not added a key yet should still be able to put a picture on a page.
 * Every image listed in `sampleArtwork.json` ships inside the app, so it can be
 * searched and imported with no network, no key and no licence homework.
 *
 * The artwork covers every book category (photo book, cookbook, magazine,
 * picture book, how-to, chapter book and workbook) so the template previews and
 * the image picker always have something on-theme to offer.
 *
 * Licensing: these are original images created for this app. They are free for
 * personal and commercial use inside a book, with no attribution required. The
 * licence is recorded on every imported asset so a published book's credits
 * stay accurate.
 */

import catalog from './sampleArtwork.json';

export const SAMPLE_ARTWORK_VERSION = catalog.version;

/**
 * Artwork filenames carry a content hash (`family-picnic.9f3a1c7d.jpg`), so a
 * changed image is always a changed URL. That is what makes the one-year
 * immutable cache honest: nothing is ever rewritten under an existing name, and
 * no query string is needed (some proxies drop those).
 */
export const SAMPLE_LICENSE = catalog.license;
export const SAMPLE_ARTWORK = catalog.items;
export const SAMPLE_PROVIDER = 'sample';

/** Category chips, in the order the wizard introduces the book types. */
export const SAMPLE_CATEGORIES = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'photobook', label: 'Photo books' },
  { id: 'cookbook', label: 'Cookbooks' },
  { id: 'magazine', label: 'Magazines' },
  { id: 'storybook', label: 'Picture books' },
  { id: 'informational', label: 'How-to' },
  { id: 'book', label: 'Chapter books' },
  { id: 'workbook', label: 'Workbooks' }
]);

/** A compact, varied set for the cover designer's quick-pick strip. */
export const COVER_SAMPLE_IDS = Object.freeze([
  'nature-waterfall',
  'family-picnic',
  'travel-mountains',
  'book-harbor',
  'book-homestead',
  'wedding-walk',
  'wedding-bride',
  'story-castle',
  'story-lantern',
  'story-rocket',
  'dish-bistro',
  'dish-market',
  'mag-couture',
  'work-journal'
]);

export const COVER_SAMPLES = Object.freeze(
  COVER_SAMPLE_IDS
    .map((id) => SAMPLE_ARTWORK.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      title: item.title,
      url: sampleArtworkUrl(item),
      thumbUrl: sampleArtworkThumbUrl(item)
    }))
);

export const COVER_SAMPLE_URLS = Object.freeze(COVER_SAMPLES.map((sample) => sample.url));

const CATEGORY_LABELS = Object.fromEntries(SAMPLE_CATEGORIES.map((c) => [c.id, c.label]));

export function sampleCategoryLabel(categoryId) {
  return CATEGORY_LABELS[categoryId] || 'Book art';
}

/** Public URL served by Vite in dev and by Express in production. */
export function sampleArtworkUrl(item) {
  return item?.file ? `/sample-artwork/${item.file}` : '';
}

/**
 * Lightweight copy for grids, thumbnails and miniature page mock-ups. Every
 * image also ships as a 480 px thumbnail (see scripts/prepare-sample-artwork.mjs)
 * so browsing the library never downloads the full-page files.
 */
export function sampleArtworkThumbUrl(item) {
  return item?.file ? `/sample-artwork/thumbs/${item.file}` : '';
}

/** Versioned URL for one catalogue id, for template default-artwork lists. */
export function sampleUrlForId(id) {
  const item = SAMPLE_ARTWORK.find((entry) => entry.id === id);
  return item ? sampleArtworkUrl(item) : '';
}

/** Print resolution the library is prepared for. */
export const SAMPLE_PRINT_DPI = 300;

/** Largest print the file supports at full quality, in inches. */
export function samplePrintSize(item, dpi = SAMPLE_PRINT_DPI) {
  if (!item?.width || !item?.height) return null;
  return { widthIn: item.width / dpi, heightIn: item.height / dpi };
}

export function formatPrintSize(item, dpi = SAMPLE_PRINT_DPI) {
  const size = samplePrintSize(item, dpi);
  if (!size) return '';
  return `${size.widthIn.toFixed(1)} × ${size.heightIn.toFixed(1)} in`;
}

/** Normalise a catalogue item into the same shape the stock search returns. */
export function sampleToSearchResult(item) {
  return {
    id: item.id,
    provider: SAMPLE_PROVIDER,
    providerName: 'Free sample',
    previewUrl: sampleArtworkThumbUrl(item),
    imageUrl: sampleArtworkUrl(item),
    fallbackImageUrl: '',
    sourceUrl: sampleArtworkUrl(item),
    creatorAttribution: SAMPLE_LICENSE.attribution,
    altText: item.alt,
    title: item.title,
    tags: item.tags,
    category: item.category,
    categoryLabel: sampleCategoryLabel(item.category),
    width: item.width,
    height: item.height
  };
}

function rankForSlot(item, slotRule) {
  if (!slotRule || !item.width || !item.height) return 0;
  const ratio = (item.width / item.height) / slotRule.aspectRatio;
  if (ratio >= 0.8 && ratio <= 1.25) return 0;
  if (ratio >= 0.55 && ratio <= 1.8) return 1;
  return 2;
}

/**
 * Filter the bundled library by free text and category.
 * Text matches the title, description, tags, collection and category label, so
 * "bread", "wedding" and "picture book" all find something useful.
 */
/**
 * Results for the picker. The library ships inside the app, so the picker must
 * never show an empty panel — an empty image picker reads as "the images are
 * missing". When a filter matches nothing we fall back to the whole library and
 * report `usedFallback` so the UI can explain itself.
 */
export function samplePickerResults({ query = '', category = 'all', slotRule = null, items = SAMPLE_ARTWORK } = {}) {
  const matches = searchSampleArtwork({ query, category, slotRule, items });
  if (matches.length) return { items: matches, usedFallback: false };
  const filtering = Boolean(String(query || '').trim()) || (category && category !== 'all');
  if (!filtering) return { items: matches, usedFallback: false };
  return { items: searchSampleArtwork({ slotRule, items }), usedFallback: true };
}

export function searchSampleArtwork({ query = '', category = 'all', slotRule = null, items = SAMPLE_ARTWORK } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  const words = needle ? needle.split(/\s+/).filter(Boolean) : [];

  const scored = items
    .filter((item) => !category || category === 'all' || item.category === category)
    .map((item, index) => {
      if (!words.length) return { item, index, score: 0 };
      // Match whole words (prefixes allowed) rather than raw substrings, so
      // "here" does not match "gathered" and a nonsense filter stays empty
      // instead of returning random pictures.
      const haystackWords = [
        item.title,
        item.alt,
        item.collection,
        sampleCategoryLabel(item.category),
        ...(item.tags || [])
      ]
        .join(' ')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

      // Forgiving on purpose: a filter box that returns nothing looks broken.
      // Any matching word keeps the image, and images matching more words rank
      // first ("forest mushrooms" shows mushrooms before ferns).
      const score = words.reduce(
        (total, word) => total + (haystackWords.some((entry) => entry.startsWith(word)) ? 1 : 0),
        0
      );
      return { item, index, score };
    })
    .filter((entry) => !words.length || entry.score > 0);

  const ranked = slotRule
    ? scored.sort((a, b) => b.score - a.score
      || rankForSlot(a.item, slotRule) - rankForSlot(b.item, slotRule)
      || a.index - b.index)
    : scored.sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked.map((entry) => entry.item);
}
