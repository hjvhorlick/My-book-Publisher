const requested = new Set();

/**
 * Warm the browser cache for images a page is about to show (layout
 * previews, the page's photo frames). Switching layouts or returning to a
 * page then paints instantly instead of trickling photos in one by one.
 */
export function preloadImages(urls = []) {
  if (typeof window === 'undefined') return;
  urls.flat().forEach((url) => {
    const src = String(url || '').trim();
    if (!src || src.startsWith('data:') || requested.has(src)) return;
    requested.add(src);
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    if (typeof image.decode === 'function') image.decode().catch(() => {});
  });
}

/** Light thumbnail for a full-size template preview image. */
export function templatePreviewThumb(src = '') {
  return String(src).replace('/template-previews/', '/template-previews/thumbs/');
}
