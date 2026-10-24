import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  Images,
  LoaderCircle,
  Search,
  Settings2,
  Upload,
  X
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { imageFitsSlot } from '../data/slotRules';
import {
  SAMPLE_ARTWORK,
  SAMPLE_CATEGORIES,
  SAMPLE_LICENSE,
  SAMPLE_PRINT_DPI,
  formatPrintSize,
  samplePickerResults,
  sampleToSearchResult
} from '../data/sampleArtwork';

/**
 * The one place a reader adds a picture to a page or a cover.
 *
 * The upload section offers two ways in, as the workflow asks for:
 *
 *   1. Search photo sites — Pexels + Pixabay, when the account has an API key.
 *   2. Upload your own — straight from this device.
 *
 * When neither is usable (no API key saved, or no network) the free artwork
 * bundled with the app is right there underneath as the fallback, so a page can
 * still be illustrated. Those samples are always listed; they never require a
 * key, a connection, or a credit line.
 */

function FitBadge({ image, slotRule }) {
  if (!slotRule || !(image.width > 0) || !(image.height > 0)) return null;
  const fit = imageFitsSlot(image.width, image.height, slotRule);
  const label = fit === 'good' ? 'Fits this frame' : fit === 'crop' ? 'Will crop to fit' : 'Different shape';
  const colors = fit === 'good'
    ? 'bg-emerald-700/90 text-white'
    : fit === 'crop'
      ? 'bg-amber-600/90 text-white'
      : 'bg-slate-800/85 text-slate-200';
  return (
    <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[9px] font-bold ${colors}`}>
      {label} · {image.width}×{image.height}
    </span>
  );
}

/**
 * Artwork thumbnail that is never silently blank.
 *
 * If the prepared thumbnail fails, it falls back to the full-size file, and if
 * that fails too it shows a labelled placeholder. A grey hole in the grid is
 * indistinguishable from "the library is empty", which is exactly the wrong
 * thing for a user to see — so a failure has to be visible and diagnosable.
 */
function SampleThumb({ item, thumbUrl, fullUrl, onFail }) {
  const [source, setSource] = useState(thumbUrl);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setSource(thumbUrl);
    setFailed(false);
    setAttempt(0);
  }, [thumbUrl]);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-stone-200 p-2 text-center dark:bg-stone-800">
        <ImageIcon className="h-5 w-5 text-stone-500" />
        <span className="text-[9px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-300">Image file</span>
        <span className="break-all text-[9px] text-stone-500 dark:text-stone-400">{item.file}</span>
      </div>
    );
  }

  const handleError = () => {
    if (source === thumbUrl) {
      setSource(fullUrl);            // the full-page file is a second copy
    } else if (attempt === 0) {
      setAttempt(1);
      setSource(`${fullUrl}${fullUrl.includes('?') ? '&' : '?'}retry=1`);
    } else {
      setFailed(true);
      onFail?.(item);
    }
  };

  return (
    <img
      src={source}
      alt={item.alt}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className="h-full w-full object-cover"
    />
  );
}

export default function StockImageSearchModal({
  open,
  projectId,
  initialQuery = '',
  slotRule = null,
  onClose,
  onImageSelected,
  onAssetsChanged,
  onOpenProviderSettings,
  onRequestUpload
}) {
  const [view, setView] = useState('options');
  const [providers, setProviders] = useState({});
  const [providersLoaded, setProvidersLoaded] = useState(false);

  const [sampleQuery, setSampleQuery] = useState('');
  const [sampleCategory, setSampleCategory] = useState('all');
  const [brokenSamples, setBrokenSamples] = useState([]);

  const [stockQuery, setStockQuery] = useState('');
  const [provider, setProvider] = useState('all');
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState('');

  useEffect(() => {
    if (!open) return;
    setView('options');
    setSampleQuery('');
    setSampleCategory('all');
    setBrokenSamples([]);
    setStockQuery(initialQuery || '');
    setProvider('all');
    setImages([]);
    setMessage('');
    setError('');
    setProviders({});
    setProvidersLoaded(false);

    let cancelled = false;
    // Knowing whether a photo-site key exists decides whether option 1 is a
    // working button or a link to settings. Failure here is harmless: the free
    // samples still work, so the dialog never becomes a dead end.
    apiRequest('/api/image-providers')
      .then((result) => {
        if (!cancelled) setProviders(result?.providers ? Object.fromEntries(result.providers.map((p) => [p.id, p])) : {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProvidersLoaded(true);
      });
    return () => { cancelled = true; };
  }, [open, initialQuery]);

  const { items: sampleResults, usedFallback: sampleFilterMissed } = useMemo(
    () => samplePickerResults({ query: sampleQuery, category: sampleCategory, slotRule }),
    [sampleQuery, sampleCategory, slotRule]
  );

  const sampleCounts = useMemo(
    () => SAMPLE_ARTWORK.reduce((counts, item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
      return counts;
    }, {}),
    []
  );

  if (!open) return null;

  const savedProviders = Object.values(providers).filter((entry) => entry?.configured);
  const stockReady = savedProviders.length > 0;

  const openProviderSettings = () => {
    onClose?.();
    onOpenProviderSettings?.();
  };

  const handleSearch = async (event) => {
    event?.preventDefault?.();
    setSearching(true);
    setError('');
    setMessage('');
    setImages([]);
    try {
      const params = new URLSearchParams({ q: stockQuery.trim(), provider });
      // Fetch photos shaped for the frame they must fill (portrait frame → portrait photos).
      if (slotRule?.orientation) params.set('orientation', slotRule.orientation);
      const result = await apiRequest(`/api/projects/${projectId}/assets/search?${params.toString()}`);
      setImages(result.images || []);
      setMessage(result.message || '');
    } catch (searchError) {
      setError(searchError.message || 'Could not search stock images. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const saveImage = async ({ imageKey, body, failureMessage }) => {
    setImportingId(imageKey);
    setError('');
    try {
      const result = await apiRequest(`/api/projects/${projectId}/assets/import-stock`, {
        method: 'POST',
        body
      });
      try {
        await onAssetsChanged?.();
      } catch {
        // The imported image is already saved; the caller can refresh the asset list later.
      }
      onImageSelected?.(result.asset);
      onClose?.();
    } catch (importError) {
      setError(importError.message || failureMessage);
    } finally {
      setImportingId('');
    }
  };

  const handleImport = (image) => saveImage({
    imageKey: `${image.provider}:${image.id}`,
    body: {
      id: image.id,
      provider: image.provider,
      imageUrl: image.imageUrl,
      fallbackImageUrl: image.fallbackImageUrl,
      sourceUrl: image.sourceUrl,
      creatorAttribution: image.creatorAttribution,
      altText: image.altText
    },
    failureMessage: 'Could not import this image. Try another result.'
  });

  // The bundled artwork is read from disk by the server, so nothing is fetched
  // over the network and nothing can break when the internet is down.
  const handleUseSample = (sample) => saveImage({
    imageKey: `sample:${sample.id}`,
    body: {
      id: sample.id,
      provider: 'sample',
      altText: sample.alt,
      caption: sample.title
    },
    failureMessage: 'Could not add this free sample. Try another image.'
  });

  const handleUploadOwn = () => {
    onClose?.();
    onRequestUpload?.();
  };

  const usesSlotArt = sampleResults.length !== SAMPLE_ARTWORK.length && slotRule;

  const optionCard = ({ icon: Icon, title, detail, meta, onClick, disabled = false, badge }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || Boolean(importingId)}
      className={`flex flex-1 items-start gap-3 rounded-2xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
        badge
          ? 'border-amber-300 bg-amber-50 hover:border-amber-600 dark:border-amber-800 dark:bg-amber-950/30'
          : 'border-stone-300 bg-white hover:border-amber-700 dark:border-stone-600 dark:bg-stone-900'
      }`}
    >
      <span className="mt-0.5 rounded-xl bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-stone-900 dark:text-stone-100">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">{detail}</span>
        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">{meta}</span>
      </span>
    </button>
  );

  const dialog = (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !searching && !importingId) onClose?.();
      }}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-image-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-[#15120F]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 p-4 dark:border-stone-700 sm:p-5">
          <div>
            <h2 id="upload-image-title" className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-stone-100">
              <Upload className="h-5 w-5 text-amber-700" /> Upload an image
            </h2>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">
              {view === 'stock'
                ? 'Search Pexels and Pixabay. The image is saved into this book’s asset library with its creator, source and licence.'
                : 'Two ways to add a picture. Every image is saved into this book’s asset library.'}
            </p>
            {slotRule && (
              <p className="mt-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                For this frame: {slotRule.aspectLabel} {slotRule.orientation} · best {slotRule.recommendedWidth} × {slotRule.recommendedHeight} px — you will crop &amp; centre the photo next.
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close image upload"
            onClick={onClose}
            disabled={Boolean(importingId)}
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-40 dark:hover:bg-stone-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {error && (
            <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          )}

          {view === 'options' ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                {stockReady ? (
                  optionCard({
                    icon: Search,
                    title: 'Find from photo sites',
                    detail: 'Search Pexels and Pixabay — millions of photos, with the licence recorded for you.',
                    meta: `Connected: ${savedProviders.map((entry) => entry.name).join(' + ')}`,
                    onClick: () => setView('stock')
                  })
                ) : (
                  optionCard({
                    icon: Settings2,
                    title: 'Find from photo sites',
                    detail: 'Pexels and Pixabay need an API key before they can be searched. Add one and come back.',
                    meta: providersLoaded ? 'No API key saved — add one' : 'Checking API keys…',
                    onClick: openProviderSettings,
                    disabled: !providersLoaded,
                    badge: true
                  })
                )}
                {onRequestUpload && optionCard({
                  icon: Upload,
                  title: 'Upload your own',
                  detail: 'Choose a photo from this device. JPEG, PNG or WebP, up to 8 MB.',
                  meta: 'From your computer or phone',
                  onClick: handleUploadOwn
                })}
              </div>

              {!stockReady && providersLoaded && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  Photo-site search and your own uploads are not available yet, so the free artwork below is the fallback — it is included with the app and works offline.
                </p>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                    <Images className="h-4 w-4 text-amber-700" />
                    Free samples
                    <span className="rounded-full bg-amber-800 px-2 py-0.5 text-[10px] font-bold text-white">{SAMPLE_ARTWORK.length}</span>
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Included · offline · no credit needed
                  </span>
                </div>

                <label className="sr-only" htmlFor="sample-image-query">Filter free sample images</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="sample-image-query"
                    autoFocus
                    value={sampleQuery}
                    onChange={(event) => setSampleQuery(event.target.value)}
                    placeholder="Filter free samples — e.g. bread, forest, wedding, desk"
                    maxLength={160}
                    className="min-h-11 w-full rounded-xl border border-stone-300 bg-stone-50 pl-9 pr-3 text-sm text-stone-900 outline-none focus:border-amber-700 dark:border-stone-600 dark:bg-stone-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_CATEGORIES.map((category) => {
                    const active = sampleCategory === category.id;
                    const count = category.id === 'all' ? SAMPLE_ARTWORK.length : (sampleCounts[category.id] || 0);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSampleCategory(category.id)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                          active
                            ? 'border-amber-800 bg-amber-800 text-white'
                            : 'border-stone-300 bg-white text-stone-700 hover:border-amber-700 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200'
                        }`}
                      >
                        {category.label}
                        <span className={`ml-1 text-[10px] font-semibold ${active ? 'text-white/75' : 'text-stone-500 dark:text-stone-400'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {brokenSamples.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  <span>
                    <strong>{brokenSamples.length} of {SAMPLE_ARTWORK.length}</strong> sample files could not be loaded by this browser
                    ({brokenSamples.slice(0, 3).join(', ')}{brokenSamples.length > 3 ? '…' : ''}). The files are installed in the app;
                    this usually means the page cannot reach them yet.
                  </span>
                  <a
                    href="/artwork-gallery.html"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1 font-bold underline underline-offset-2"
                  >
                    <ExternalLink className="h-3 w-3" /> Open the artwork gallery to check the files
                  </a>
                </div>
              )}

              {sampleFilterMissed && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  No match for{sampleQuery.trim() ? ` “${sampleQuery.trim()}”` : ' this filter'} — showing all {SAMPLE_ARTWORK.length} free samples.
                </p>
              )}

              {usesSlotArt && (
                <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  Sorted for this frame — the best-fitting images come first.
                </p>
              )}

              {sampleResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sampleResults.map((sample) => {
                    const result = sampleToSearchResult(sample);
                    const importing = importingId === `sample:${sample.id}`;
                    return (
                      <article key={sample.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
                        <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800">
                          <SampleThumb
                            item={sample}
                            thumbUrl={result.previewUrl}
                            fullUrl={result.imageUrl}
                            onFail={(failedItem) => setBrokenSamples((list) => (
                              list.includes(failedItem.id) ? list : [...list, failedItem.id]
                            ))}
                          />
                          <span className="absolute left-2 top-2 rounded-full bg-amber-800/95 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                            Free sample
                          </span>
                          <FitBadge image={sample} slotRule={slotRule} />
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{sample.title}</p>
                          <p className="min-h-8 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">{sample.alt}</p>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-stone-500 dark:text-stone-400">
                            <span className="truncate">{result.categoryLabel}</span>
                            <span className="shrink-0 font-semibold">No credit needed</span>
                          </div>
                          <p className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                            {sample.width} × {sample.height} px · prints to {formatPrintSize(sample)} at {SAMPLE_PRINT_DPI} dpi
                          </p>
                          <button
                            type="button"
                            disabled={Boolean(importingId)}
                            onClick={() => handleUseSample(sample)}
                            className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3 text-xs font-bold text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-amber-800 dark:hover:bg-amber-700"
                          >
                            {importing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                            {importing ? 'Adding to book…' : slotRule ? 'Use & frame this image' : 'Use this image'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-10 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                  No free artwork is installed in this copy of the app. Reinstall it, or upload a picture from your device.
                </div>
              )}

              <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                {SAMPLE_LICENSE.summary}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setView('options')}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-[11px] font-bold text-stone-700 hover:border-amber-700 dark:border-stone-600 dark:text-stone-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to the free samples
              </button>

              <form onSubmit={handleSearch} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
                <label className="sr-only" htmlFor="stock-image-query">Search images</label>
                <input
                  id="stock-image-query"
                  autoFocus
                  value={stockQuery}
                  onChange={(event) => setStockQuery(event.target.value)}
                  placeholder="e.g. misty forest, sourdough bread, city at night"
                  maxLength={160}
                  className="min-h-11 rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm text-stone-900 outline-none focus:border-amber-700 dark:border-stone-600 dark:bg-stone-900 dark:text-white"
                />
                <label className="sr-only" htmlFor="stock-image-provider">Image source</label>
                <select
                  id="stock-image-provider"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  className="min-h-11 rounded-xl border border-stone-300 bg-stone-50 px-3 text-xs font-semibold text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                >
                  <option value="all">Pexels + Pixabay</option>
                  <option value="pexels">Pexels only</option>
                  <option value="pixabay">Pixabay only</option>
                </select>
                <button
                  type="submit"
                  disabled={searching || Boolean(importingId) || stockQuery.trim().length < 2}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </form>

              <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                API keys stay encrypted on the server. Review the provider’s current licence and restrictions before publishing; attribution and the source page are saved with each imported image.
              </p>

              {message && (
                <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  {message}
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((image) => {
                    const imageKey = `${image.provider}:${image.id}`;
                    const importing = importingId === imageKey;
                    return (
                      <article key={imageKey} className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
                        <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800">
                          <img
                            src={image.previewUrl}
                            alt={image.altText || 'Stock image search result'}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                            {image.providerName}
                          </span>
                          <FitBadge image={image} slotRule={slotRule} />
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="min-h-8 text-[11px] leading-relaxed text-stone-700 dark:text-stone-200">
                            {image.altText || 'No provider description supplied.'}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-stone-500 dark:text-stone-400">
                            <span className="truncate" title={image.creatorAttribution}>{image.creatorAttribution}</span>
                            <div className="flex shrink-0 items-center gap-2">
                              <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-amber-800 underline dark:text-amber-300">
                                Source <ExternalLink className="h-3 w-3" />
                              </a>
                              <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-amber-800 underline dark:text-amber-300">
                                Licence <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={Boolean(importingId)}
                            onClick={() => handleImport(image)}
                            className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3 text-xs font-bold text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-amber-800 dark:hover:bg-amber-700"
                          >
                            {importing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                            {importing ? 'Importing into book…' : slotRule ? 'Use & frame this image' : 'Use this image'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {!searching && !images.length && !message && (
                <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-10 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                  Enter a few words to search, or go back to the free samples included in the app.
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
