import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, LoaderCircle, Search, Trash2, Upload } from 'lucide-react';
import { apiRequest } from '../api/client';
import CoverArtwork from './CoverArtwork';
import StockImageSearchModal from './StockImageSearchModal';
import { shrinkImageToDataUrl } from '../utils/imageResize';
import { COVER_SAMPLES } from '../data/sampleArtwork';

const DEFAULT_WORD_ART = {
  text: '',
  fillMode: 'none', // 'none' = outline letters only (no background behind them)
  strokeColor: '#FDE08D',
  strokeWidth: 1.5,
  fillColor: '#FFFFFF',
  uppercase: true
};

/**
 * Book cover designer: background image + word-art title (outline letters with a
 * narrow border, no fill background), a short line from the author, the author's
 * name, and an optional author photo (yes/no). All fields persist as sibling keys
 * inside project.coverConfig via onUpdateProject.
 */
export default function CoverEditor({
  project,
  visualTemplate,
  categoryId = 'photobook',
  trimSize = '6x9',
  assets = [],
  onUpdateProject,
  onRegisterFlush,
  onAssetsChanged,
  onOpenAiSettings,
  notify
}) {
  const tpl = visualTemplate || {};
  const saved = project?.coverConfig || {};

  const [coverImage, setCoverImage] = useState(saved.coverImage || '');
  const [coverOverlay, setCoverOverlay] = useState(
    Number.isFinite(Number(saved.coverOverlay)) ? Number(saved.coverOverlay) : 0.3
  );
  const [wordArt, setWordArt] = useState({ ...DEFAULT_WORD_ART, ...(saved.wordArt || {}) });
  const [coverBlurb, setCoverBlurb] = useState(saved.coverBlurb || '');
  const [coverAuthorName, setCoverAuthorName] = useState(
    saved.coverAuthorName ?? project?.authorName ?? project?.author_name ?? ''
  );
  const [showAuthorPhoto, setShowAuthorPhoto] = useState(Boolean(saved.showAuthorPhoto));
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState(saved.authorPhotoUrl || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyImage, setBusyImage] = useState('');
  const [stockOpen, setStockOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState('cover');

  const draftRef = useRef({});
  const dirtyRef = useRef(false);
  const fileTargetRef = useRef('cover'); // 'cover' | 'author'
  const coverFileRef = useRef(null);
  const authorFileRef = useRef(null);
  const debounceRef = useRef(null);

  const currentDraft = () => ({
    coverImage,
    coverOverlay,
    wordArt: { ...wordArt },
    coverBlurb,
    coverAuthorName,
    showAuthorPhoto,
    authorPhotoUrl: showAuthorPhoto ? authorPhotoUrl : ''
  });

  draftRef.current = currentDraft();
  dirtyRef.current = hasChanges;

  const doSave = useCallback(async (draft) => {
    if (!onUpdateProject) return;
    setSaving(true);
    try {
      await onUpdateProject({ coverConfig: draft });
      setHasChanges(false);
      dirtyRef.current = false;
    } catch (error) {
      notify?.(error?.message || 'Could not save the cover design. Please try again.', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  }, [onUpdateProject, notify]);

  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  const saveNow = useCallback(async () => {
    if (!dirtyRef.current) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await doSaveRef.current(draftRef.current);
  }, []);

  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  // Navigation flush (App calls this before leaving the studio).
  useEffect(() => {
    if (!onRegisterFlush) return undefined;
    onRegisterFlush(() => saveNowRef.current());
    return () => onRegisterFlush(null);
  }, [onRegisterFlush]);

  // Debounced autosave while editing.
  const markDirty = useCallback(() => {
    setHasChanges(true);
    dirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSaveRef.current(draftRef.current).catch(() => {});
    }, 1100);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Adopt server state after save/reload only when clean.
  const savedSignature = JSON.stringify({
    ci: saved.coverImage || '',
    co: saved.coverOverlay,
    wa: saved.wordArt || null,
    cb: saved.coverBlurb || '',
    ca: saved.coverAuthorName,
    sp: Boolean(saved.showAuthorPhoto),
    ap: saved.authorPhotoUrl || ''
  });
  const lastSavedRef = useRef(savedSignature);
  useEffect(() => {
    if (savedSignature === lastSavedRef.current) return;
    lastSavedRef.current = savedSignature;
    if (dirtyRef.current) return;
    setCoverImage(saved.coverImage || '');
    setCoverOverlay(Number.isFinite(Number(saved.coverOverlay)) ? Number(saved.coverOverlay) : 0.3);
    setWordArt({ ...DEFAULT_WORD_ART, ...(saved.wordArt || {}) });
    setCoverBlurb(saved.coverBlurb || '');
    setCoverAuthorName(saved.coverAuthorName ?? project?.authorName ?? project?.author_name ?? '');
    setShowAuthorPhoto(Boolean(saved.showAuthorPhoto));
    setAuthorPhotoUrl(saved.authorPhotoUrl || '');
  }, [savedSignature, project?.authorName, project?.author_name]);

  const applyImage = useCallback(async (source, target = 'cover') => {
    setBusyImage(target);
    try {
      const dataUrl = String(source).startsWith('data:') || String(source).startsWith('blob:')
        ? await shrinkImageToDataUrl(source)
        : String(source); // sample-artwork path stays a path (tiny, already optimized)
      if (target === 'cover') setCoverImage(dataUrl);
      else setAuthorPhotoUrl(dataUrl);
      markDirty();
    } catch (error) {
      notify?.(error?.message || 'Could not use that image. Please try another one.', 'error');
    } finally {
      setBusyImage('');
    }
  }, [markDirty, notify]);

  const handleFilePicked = useCallback(async (event) => {
    const file = event.target.files?.[0];
    const target = fileTargetRef.current;
    event.target.value = '';
    if (!file || !project?.id) return;
    setBusyImage(target);
    try {
      // Keep the full asset in the library for reuse, then store a shrunk copy on the cover.
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      formData.append('assetType', 'cover');
      const created = await apiRequest(`/api/projects/${project.id}/assets`, { method: 'POST', body: formData });
      await onAssetsChanged?.();
      const uploaded = created?.asset?.dataUrl || created?.asset?.fileUrl;
      if (uploaded) {
        const dataUrl = await shrinkImageToDataUrl(uploaded);
        if (target === 'cover') setCoverImage(dataUrl);
        else setAuthorPhotoUrl(dataUrl);
        markDirty();
      }
    } catch (error) {
      notify?.(error?.message || 'Could not upload that image. Please try again.', 'error');
    } finally {
      setBusyImage('');
    }
  }, [project?.id, onAssetsChanged, markDirty, notify]);

  const pickFromAssets = useCallback((event) => {
    const assetId = event.target.value;
    event.target.value = '';
    if (!assetId) return;
    const asset = assets.find((a) => String(a.id) === String(assetId));
    const url = asset?.dataUrl || asset?.fileUrl || '';
    if (url) applyImage(url, fileTargetRef.current);
  }, [assets, applyImage]);

  const draftForPreview = {
    ...saved,
    ...draftRef.current,
    visualTemplateId: saved.visualTemplateId
  };

  // The cover designer sits on the studio's dark navy surface. Fields use a
  // warm paper surface with opaque ink and a visible placeholder, so the
  // author can always see exactly what they are typing.
  const labelStyle = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest';
  const labelInk = '#F5C451';
  const helperInk = '#F3D78B';
  const panelStyle = {
    borderRadius: 18,
    border: '1px solid rgba(229, 184, 75, 0.42)',
    background: 'rgba(6, 17, 40, 0.55)',
    boxShadow: 'inset 0 1px 0 rgba(253, 224, 141, 0.12)'
  };
  const fieldVars = {
    '--fq-field-bg': '#FFFDF7',
    '--fq-field-bg-hover': '#FFFFFF',
    '--fq-field-bg-focus': '#FFFFFF',
    '--fq-field-ink': '#0F172A',
    '--fq-field-muted': '#6B5B45',
    '--fq-field-border': 'rgba(229, 184, 75, 0.75)',
    '--fq-field-focus': 'rgba(245, 196, 81, 0.45)'
  };
  const inputClass = 'fq-page-field text-sm font-medium';
  const coverWords = String(coverBlurb || '').trim() ? String(coverBlurb).trim().split(/\s+/).length : 0;
  const coverBlurbLimit = 40;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold uppercase tracking-widest" style={{ color: labelInk }}>
          <ImageIcon className="mr-2 inline h-4 w-4" aria-hidden="true" />
          Book cover · background + word art
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: helperInk }}>
          <span aria-live="polite">{saving ? 'Saving…' : hasChanges ? 'Unsaved changes' : 'Saved'}</span>
          <button
            type="button"
            onClick={() => saveNow().catch(() => {})}
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-1.5 font-bold uppercase tracking-wider text-white transition disabled:opacity-40"
          >
            {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            {hasChanges ? 'Save Cover' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(260px,420px)_1fr]">
        {/* Live preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <CoverArtwork
            project={project}
            coverConfig={draftForPreview}
            visualTemplate={tpl}
            trimSize={trimSize}
            editable
            className="w-full shadow-2xl"
          />
          <p className="mt-2 text-center text-[11px] uppercase tracking-widest" style={{ color: helperInk }}>
            {trimSize} cover preview
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Background image */}
          <section className="p-4" style={panelStyle}>
            <h3 className={labelStyle} style={{ color: labelInk }}>1 · Background image</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { fileTargetRef.current = 'cover'; coverFileRef.current?.click(); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-bold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                disabled={busyImage === 'cover'}
              >
                {busyImage === 'cover' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload
              </button>
              <button
                type="button"
                onClick={() => { setStockTarget('cover'); setStockOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-bold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                <Search className="h-3.5 w-3.5" />
                Stock photos
              </button>
              {coverImage ? (
                <button
                  type="button"
                  onClick={() => { setCoverImage(''); markDirty(); }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove image
                </button>
              ) : null}
            </div>

            <label className={`${labelStyle} mt-4`} style={{ color: labelInk }} htmlFor="cover-from-library">From your asset library</label>
            <select
              id="cover-from-library"
              className={inputClass}
              style={fieldVars}
              defaultValue=""
              onChange={(e) => { fileTargetRef.current = 'cover'; pickFromAssets(e); }}
            >
              <option value="">Choose an image…</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.title || asset.filename || `Asset ${asset.id}`}</option>
              ))}
            </select>

            <p className={`${labelStyle} mt-4`} style={{ color: labelInk }}>Free sample artwork</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {COVER_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => applyImage(sample.url, 'cover')}
                  className={`overflow-hidden rounded-lg border-2 transition ${
                    coverImage === sample.url ? 'border-amber-500 ring-2 ring-amber-400/50' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  title={sample.title}
                >
                  <img src={sample.thumbUrl} alt={sample.title} className="h-12 w-full object-cover" />
                </button>
              ))}
            </div>

            <label className={`${labelStyle} mt-4`} style={{ color: labelInk }} htmlFor="cover-overlay">
              Image dim (helps the word art read) · {Math.round(coverOverlay * 100)}%
            </label>
            <input
              id="cover-overlay"
              type="range"
              min="0"
              max="0.7"
              step="0.05"
              value={coverOverlay}
              onChange={(e) => { setCoverOverlay(Number(e.target.value)); markDirty(); }}
              className="w-full accent-amber-600"
            />
          </section>

          {/* Word art */}
          <section className="p-4" style={panelStyle}>
            <h3 className={labelStyle} style={{ color: labelInk }}>2 · Word-art heading (book name)</h3>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: helperInk }} htmlFor="cover-title">
              Title shown on the cover
            </label>
            <input
              id="cover-title"
              type="text"
              className={inputClass}
              value={wordArt.text}
              placeholder={project?.title || 'Book title'}
              style={fieldVars}
              onChange={(e) => { setWordArt((w) => ({ ...w, text: e.target.value })); markDirty(); }}
            />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <span className={labelStyle} style={{ color: labelInk }}>Letter style</span>
                <div className="flex rounded-full p-1" style={{ border: '1px solid rgba(229,184,75,0.5)' }} role="radiogroup" aria-label="Word art letter style">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={wordArt.fillMode !== 'solid'}
                    onClick={() => { setWordArt((w) => ({ ...w, fillMode: 'none' })); markDirty(); }}
                    className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      wordArt.fillMode !== 'solid' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : ''
                    }`}
                  >
                    Outline only
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={wordArt.fillMode === 'solid'}
                    onClick={() => { setWordArt((w) => ({ ...w, fillMode: 'solid' })); markDirty(); }}
                    className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      wordArt.fillMode === 'solid' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : ''
                    }`}
                  >
                    Solid fill
                  </button>
                </div>
                <p className="mt-1.5 text-[11px]" style={{ color: helperInk }}>
                  Outline only = no background behind the letters, just a narrow border around each one.
                </p>
              </div>

              <div>
                <label className={labelStyle} style={{ color: labelInk }} htmlFor="cover-stroke-color">
                  Border colour
                </label>
                <input
                  id="cover-stroke-color"
                  type="color"
                  value={wordArt.strokeColor}
                  onChange={(e) => { setWordArt((w) => ({ ...w, strokeColor: e.target.value })); markDirty(); }}
                  className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600"
                />
              </div>

              <div>
                <label className={labelStyle} style={{ color: labelInk }} htmlFor="cover-stroke-width">
                  Border width · {wordArt.strokeWidth}px
                </label>
                <input
                  id="cover-stroke-width"
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={wordArt.strokeWidth}
                  onChange={(e) => { setWordArt((w) => ({ ...w, strokeWidth: Number(e.target.value) })); markDirty(); }}
                  className="w-full accent-amber-600"
                />
              </div>

              {wordArt.fillMode === 'solid' ? (
                <div>
                  <label className={labelStyle} style={{ color: labelInk }} htmlFor="cover-fill-color">Fill colour</label>
                  <input
                    id="cover-fill-color"
                    type="color"
                    value={wordArt.fillColor}
                    onChange={(e) => { setWordArt((w) => ({ ...w, fillColor: e.target.value })); markDirty(); }}
                    className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600"
                  />
                </div>
              ) : null}
            </div>
          </section>

          {/* Author wording + name + photo */}
          <section className="p-4" style={panelStyle}>
            <h3 className={labelStyle} style={{ color: labelInk }}>3 · Words from the author</h3>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: helperInk }} htmlFor="cover-blurb">
              A short piece of wording shown under the title
            </label>
            <textarea
              id="cover-blurb"
              rows={3}
              className={inputClass}
              style={{ ...fieldVars, resize: 'vertical', lineHeight: 1.55 }}
              value={coverBlurb}
              placeholder="A promise, a first line, or a note to the reader…"
              onChange={(e) => { setCoverBlurb(e.target.value); markDirty(); }}
            />
            <div className="mt-1 flex items-center justify-between text-[11px]" style={{ color: coverWords > coverBlurbLimit ? '#FCA5A5' : helperInk }}>
              <span>{coverWords} / {coverBlurbLimit} words — a cover line reads best when it is short.</span>
            </div>

            <label className={`${labelStyle} mt-4`} style={{ color: labelInk }} htmlFor="cover-author-name">Author name</label>
            <input
              id="cover-author-name"
              type="text"
              className={inputClass}
              value={coverAuthorName}
              placeholder={project?.authorName || project?.author_name || 'Author name'}
              style={fieldVars}
              onChange={(e) => { setCoverAuthorName(e.target.value); markDirty(); }}
            />

            <fieldset className="mt-4">
              <legend className={labelStyle} style={{ color: labelInk }}>Author photo on cover?</legend>
              <div className="flex gap-4 text-sm font-semibold" style={{ color: '#FDE08D' }}>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="cover-author-photo"
                    checked={!showAuthorPhoto}
                    onChange={() => { setShowAuthorPhoto(false); markDirty(); }}
                    className="accent-amber-600"
                  />
                  No thanks
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="cover-author-photo"
                    checked={showAuthorPhoto}
                    onChange={() => { setShowAuthorPhoto(true); markDirty(); }}
                    className="accent-amber-600"
                  />
                  Yes, add my photo
                </label>
              </div>
            </fieldset>

            {showAuthorPhoto ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { fileTargetRef.current = 'author'; authorFileRef.current?.click(); }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-bold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                    disabled={busyImage === 'author'}
                  >
                    {busyImage === 'author' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload photo
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStockTarget('author'); setStockOpen(true); }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-bold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Stock photos
                  </button>
                  {authorPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => { setAuthorPhotoUrl(''); markDirty(); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  ) : null}
                </div>
                <label className={`${labelStyle}`} style={{ color: labelInk }} htmlFor="cover-author-library">From your asset library</label>
                <select
                  id="cover-author-library"
                  className={inputClass}
                  style={fieldVars}
                  defaultValue=""
                  onChange={(e) => { fileTargetRef.current = 'author'; pickFromAssets(e); }}
                >
                  <option value="">Choose an image…</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.title || asset.filename || `Asset ${asset.id}`}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <input
        ref={coverFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFilePicked}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={authorFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFilePicked}
        aria-hidden="true"
        tabIndex={-1}
      />

      <StockImageSearchModal
        open={stockOpen}
        projectId={project?.id}
        onClose={() => setStockOpen(false)}
        onImageSelected={(image) => {
          const url = image?.dataUrl || image?.fileUrl || '';
          if (url) {
            applyImage(url, stockTarget);
            setStockOpen(false);
          }
        }}
        onAssetsChanged={onAssetsChanged}
        onOpenProviderSettings={onOpenAiSettings}
      />
    </div>
  );
}
