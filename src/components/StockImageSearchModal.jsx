import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Image as ImageIcon, LoaderCircle, Search, Settings2, X } from 'lucide-react';
import { apiRequest } from '../api/client';
import { imageFitsSlot } from '../data/slotRules';

export default function StockImageSearchModal({
  open,
  projectId,
  initialQuery = '',
  slotRule = null,
  onClose,
  onImageSelected,
  onAssetsChanged,
  onOpenProviderSettings
}) {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('all');
  const [images, setImages] = useState([]);
  const [providerStatus, setProviderStatus] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery || '');
    setProvider('all');
    setImages([]);
    setProviderStatus({});
    setMessage('');
    setError('');
  }, [open, initialQuery]);

  if (!open) return null;

  const handleSearch = async (event) => {
    event?.preventDefault?.();
    setSearching(true);
    setError('');
    setMessage('');
    setImages([]);
    try {
      const params = new URLSearchParams({ q: query.trim(), provider });
      // Fetch photos shaped for the frame they must fill (portrait frame → portrait photos).
      if (slotRule?.orientation) params.set('orientation', slotRule.orientation);
      const result = await apiRequest(`/api/projects/${projectId}/assets/search?${params.toString()}`);
      setImages(result.images || []);
      setProviderStatus(result.providers || {});
      setMessage(result.message || '');
    } catch (searchError) {
      setProviderStatus({});
      setError(searchError.message || 'Could not search stock images. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (image) => {
    const imageKey = `${image.provider}:${image.id}`;
    setImportingId(imageKey);
    setError('');
    try {
      const result = await apiRequest(`/api/projects/${projectId}/assets/import-stock`, {
        method: 'POST',
        body: {
          id: image.id,
          provider: image.provider,
          imageUrl: image.imageUrl,
          fallbackImageUrl: image.fallbackImageUrl,
          sourceUrl: image.sourceUrl,
          creatorAttribution: image.creatorAttribution,
          altText: image.altText
        }
      });
      try {
        await onAssetsChanged?.();
      } catch {
        // The imported image is already saved; the caller can refresh the asset list later.
      }
      onImageSelected?.(result.asset);
      onClose?.();
    } catch (importError) {
      setError(importError.message || 'Could not import this image. Try another result.');
    } finally {
      setImportingId('');
    }
  };

  const openProviderSettings = () => {
    onClose?.();
    onOpenProviderSettings?.();
  };

  const noProviderConfigured = Object.values(providerStatus).length > 0 &&
    Object.values(providerStatus).every((status) => status.status === 'not_configured');

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
        aria-labelledby="stock-image-search-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-[#15120F]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 p-4 dark:border-stone-700 sm:p-5">
          <div>
            <h2 id="stock-image-search-title" className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-stone-100">
              <ImageIcon className="h-5 w-5 text-amber-700" /> Find a stock photo
            </h2>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">
              Search Pexels and Pixabay. Selected images are saved into this book’s asset library with the creator, source link, and stock-license record.
            </p>
            {slotRule && (
              <p className="mt-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                For this frame: {slotRule.aspectLabel} {slotRule.orientation} · best {slotRule.recommendedWidth} × {slotRule.recommendedHeight} px — you will crop &amp; centre the photo next.
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close stock-image search"
            onClick={onClose}
            disabled={Boolean(importingId)}
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-40 dark:hover:bg-stone-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
            <label className="sr-only" htmlFor="stock-image-query">Search images</label>
            <input
              id="stock-image-query"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
              disabled={searching || Boolean(importingId) || query.trim().length < 2}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            API keys stay encrypted on the server. Review the provider’s current license and restrictions before publishing; attribution and the source page are saved with each imported image.
          </p>

          {(error || message) && (
            <div role={error ? 'alert' : 'status'} className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-xs ${error ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200' : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'}`}>
              <span>{error || message}</span>
              {noProviderConfigured && (
                <button type="button" onClick={openProviderSettings} className="inline-flex w-fit items-center gap-1 font-bold underline underline-offset-2">
                  <Settings2 className="h-3.5 w-3.5" /> Open API keys settings
                </button>
              )}
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
                      {slotRule && image.width > 0 && image.height > 0 && (() => {
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
                      })()}
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
                            License <ExternalLink className="h-3 w-3" />
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

          {!searching && !images.length && !message && !error && (
            <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-10 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
              Enter a few words to find images related to this book page.
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
