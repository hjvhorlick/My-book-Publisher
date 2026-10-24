import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crop, FlipHorizontal, LoaderCircle, Search, Upload } from 'lucide-react';
import { getVisualTemplateForProject } from '../data/visualTemplatesCatalog';
import { getTemplatePageStructures } from '../data/templatePageStructures';
import { apiRequest } from '../api/client';
import { migrateLegacyPageStructuredData } from '../utils/legacyPageMigration';
import TemplateStructurePageRenderer from './TemplateStructurePageRenderer';
import PageStructureMiniPreview, { SAMPLE_ART_BY_CATEGORY } from './PageStructureMiniPreview';
import BookImage from './BookImage';
import { preloadImages } from '../utils/preloadImages';
import StockImageSearchModal from './StockImageSearchModal';
import ImageCropEditor from './ImageCropEditor';
import { getImageSlotRule } from '../data/slotRules';

const DEFAULT_ARTWORK_BY_TEMPLATE = {
  // Photo Books
  'photo-warm-family': ['/sample-artwork/wedding-walk.jpg', '/sample-artwork/family-picnic.jpg', '/sample-artwork/family-child.jpg', '/sample-artwork/family-grandparents.jpg', '/sample-artwork/family-garden.jpg', '/sample-artwork/family-dog.jpg'],
  'photo-modern-minimal': ['/sample-artwork/nature-waterfall.jpg', '/sample-artwork/travel-coast.jpg', '/sample-artwork/travel-mountains.jpg', '/sample-artwork/travel-cottage.jpg', '/sample-artwork/nature-stones.jpg', '/sample-artwork/mag-couture.jpg'],
  'photo-gallery-frame': ['/sample-artwork/travel-mountains.jpg', '/sample-artwork/travel-cottage.jpg', '/sample-artwork/nature-waterfall.jpg', '/sample-artwork/book-harbor.jpg', '/sample-artwork/mag-portrait.jpg'],
  'photo-vintage-polaroid': ['/sample-artwork/family-grandparents.jpg', '/sample-artwork/wedding-walk.jpg', '/sample-artwork/wedding-confetti.jpg', '/sample-artwork/travel-coast.jpg', '/sample-artwork/family-child.jpg'],
  'photo-botanical-sage': ['/sample-artwork/dish-herbs.jpg', '/sample-artwork/nature-ferns.jpg', '/sample-artwork/nature-mushrooms.jpg', '/sample-artwork/nature-stones.jpg', '/sample-artwork/nature-waterfall.jpg'],
  'photo-wedding-ivory': ['/sample-artwork/wedding-walk.jpg', '/sample-artwork/wedding-bride.jpg', '/sample-artwork/wedding-dance.jpg', '/sample-artwork/wedding-confetti.jpg'],
  'photo-monochrome-noir': ['/sample-artwork/mag-sculpture.jpg', '/sample-artwork/travel-mountains.jpg', '/sample-artwork/book-harbor.jpg', '/sample-artwork/mag-portrait.jpg', '/sample-artwork/book-homestead.jpg'],
  'photo-sunset-terracotta': ['/sample-artwork/travel-coast.jpg', '/sample-artwork/mag-runner.jpg', '/sample-artwork/nature-waterfall.jpg', '/sample-artwork/family-picnic.jpg', '/sample-artwork/wedding-confetti.jpg'],
  // Cookbooks
  'cook-warm-border': ['/sample-artwork/dish-pasta.jpg', '/sample-artwork/dish-bistro.jpg', '/sample-artwork/dish-market.jpg'],
  'cook-modern-spread': ['/sample-artwork/dish-market.jpg', '/sample-artwork/dish-bistro.jpg'],
  'cook-mediterranean-sun': ['/sample-artwork/dish-mediterranean.jpg', '/sample-artwork/dish-herbs.jpg'],
  'cook-rustic-farmhouse': ['/sample-artwork/dish-bakehouse.jpg', '/sample-artwork/dish-market.jpg', '/sample-artwork/dish-pasta.jpg'],
  'cook-plant-botanical': ['/sample-artwork/dish-herbs.jpg', '/sample-artwork/nature-ferns.jpg'],
  'cook-french-bistro': ['/sample-artwork/dish-pasta.jpg', '/sample-artwork/dish-bistro.jpg'],
  'cook-fiesta-spice': ['/sample-artwork/dish-market.jpg', '/sample-artwork/dish-mediterranean.jpg'],
  'cook-cozy-bakehouse': ['/sample-artwork/dish-bakehouse.jpg', '/sample-artwork/dish-pasta.jpg'],
  // Magazines
  'mag-bold-editorial': ['/sample-artwork/mag-sculpture.jpg', '/sample-artwork/mag-portrait.jpg'],
  'mag-lifestyle-minimal': ['/sample-artwork/mag-interior.jpg', '/sample-artwork/travel-coast.jpg', '/sample-artwork/nature-ferns.jpg'],
  'mag-indigo-digest': ['/sample-artwork/info-studio.jpg', '/sample-artwork/wedding-confetti.jpg'],
  'mag-art-culture': ['/sample-artwork/mag-sculpture.jpg', '/sample-artwork/mag-couture.jpg'],
  'mag-tech-future': ['/sample-artwork/work-desk.jpg', '/sample-artwork/info-studio.jpg'],
  'mag-travel-wanderlust': ['/sample-artwork/travel-mountains.jpg', '/sample-artwork/travel-coast.jpg', '/sample-artwork/mag-portrait.jpg'],
  'mag-fashion-vogue': ['/sample-artwork/mag-couture.jpg', '/sample-artwork/mag-portrait.jpg'],
  'mag-sports-action': ['/sample-artwork/mag-runner.jpg'],
  // Children's Picture Books
  'story-starlight-frame': ['/sample-artwork/story-lantern.jpg', '/sample-artwork/story-castle.jpg', '/sample-artwork/story-sea.jpg'],
  'story-sunny-adventure': ['/sample-artwork/story-balloon.jpg', '/sample-artwork/story-castle.jpg'],
  'story-ocean-treasure': ['/sample-artwork/story-turtle.jpg'],
  'story-woodland-friends': ['/sample-artwork/story-woodland.jpg', '/sample-artwork/story-squirrel.jpg'],
  'story-cosmic-rocket': ['/sample-artwork/story-rocket.jpg'],
  'story-fairy-castle': ['/sample-artwork/story-castle.jpg', '/sample-artwork/story-dragon.jpg'],
  'story-dino-jungle': ['/sample-artwork/story-dragon.jpg', '/sample-artwork/story-woodland.jpg'],
  'story-pastel-lullaby': ['/sample-artwork/story-lantern.jpg', '/sample-artwork/story-sea.jpg', '/sample-artwork/story-castle.jpg'],
  // How-To & Guide Books
  'info-blue-guide': ['/sample-artwork/work-desk.jpg', '/sample-artwork/info-workshop.jpg'],
  'info-emerald-handbook': ['/sample-artwork/dish-herbs.jpg', '/sample-artwork/nature-ferns.jpg'],
  'info-amber-workshop': ['/sample-artwork/info-workshop.jpg', '/sample-artwork/info-joinery.jpg'],
  'info-purple-masterclass': ['/sample-artwork/work-journal.jpg', '/sample-artwork/info-studio.jpg'],
  'info-teal-wellness': ['/sample-artwork/nature-waterfall.jpg', '/sample-artwork/mag-runner.jpg'],
  'info-slate-business': ['/sample-artwork/work-desk.jpg', '/sample-artwork/info-studio.jpg'],
  'info-coral-parenting': ['/sample-artwork/family-child.jpg', '/sample-artwork/family-garden.jpg', '/sample-artwork/family-picnic.jpg'],
  'info-indigo-tech': ['/sample-artwork/info-studio.jpg', '/sample-artwork/info-workshop.jpg'],
  // Story, Memoir & Chapter Books
  'book-modern-clean': ['/sample-artwork/travel-coast.jpg', '/sample-artwork/book-harbor.jpg'],
  'book-warm-classic': ['/sample-artwork/book-homestead.jpg', '/sample-artwork/book-desk.jpg', '/sample-artwork/book-reading.jpg', '/sample-artwork/family-grandparents.jpg'],
  'book-vintage-memoir': ['/sample-artwork/book-desk.jpg', '/sample-artwork/book-reading.jpg', '/sample-artwork/family-grandparents.jpg', '/sample-artwork/book-homestead.jpg'],
  'book-thriller-noir': ['/sample-artwork/book-harbor.jpg', '/sample-artwork/travel-mountains.jpg'],
  'book-romance-blush': ['/sample-artwork/wedding-bride.jpg', '/sample-artwork/wedding-walk.jpg'],
  'book-scifi-cosmos': ['/sample-artwork/book-harbor.jpg', '/sample-artwork/travel-mountains.jpg'],
  'book-poetry-ivory': ['/sample-artwork/nature-ferns.jpg', '/sample-artwork/dish-herbs.jpg'],
  'book-historical-crest': ['/sample-artwork/book-homestead.jpg', '/sample-artwork/book-desk.jpg'],
  // Workbooks
  'work-teal-planner': ['/sample-artwork/work-planner.jpg', '/sample-artwork/work-notes.jpg', '/sample-artwork/work-desk.jpg', '/sample-artwork/work-journal.jpg'],
  'work-indigo-journal': ['/sample-artwork/work-journal.jpg', '/sample-artwork/work-desk.jpg', '/sample-artwork/work-planner.jpg']
};

export default function ExactTemplatePageRenderer({
  project,
  chapter,
  chapterIndex = 0,
  totalChapters = 1,
  pageIndex = 0,
  totalPages = 1,
  chapterSummaries = [],
  assets = [],
  editable = true,
  aiConfigured = false,
  onSaveChapter,
  onRegisterSave,
  onRegisterPreview,
  onAssetsChanged,
  onBackToIndex,
  onOpenAiSettings
}) {
  const fileInputRef = useRef(null);
  const activePhotoTargetRef = useRef(null);
  const pageDraftSaveRef = useRef(null);
  const pageDraftPreviewRef = useRef(null);
  const previewContextRef = useRef(null);
  const migrationAttemptsRef = useRef(new Set());
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingPageLayout, setSavingPageLayout] = useState(false);
  const [stockSearchOpen, setStockSearchOpen] = useState(false);
  const [stockSlotRule, setStockSlotRule] = useState(null);
  const [cropSession, setCropSession] = useState(null);
  const [stockSearchInitialQuery, setStockSearchInitialQuery] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [layoutError, setLayoutError] = useState('');

  const categoryId = project?.publicationType || project?.bookType || 'photobook';
  const visualTemplate = getVisualTemplateForProject(project || {});
  const fontFamily = project?.coverConfig?.fontFamily || visualTemplate.fontFamily || 'Plus Jakarta Sans';
  const pageMigration = migrateLegacyPageStructuredData(chapter, categoryId);
  const pageData = pageMigration.structuredData;
  const rawStructure = pageData.pageStructure;
  const hasValidStructure = rawStructure !== null && rawStructure !== undefined && Number.isInteger(Number(rawStructure)) && Number(rawStructure) >= 0 && Number(rawStructure) < 5;
  const sourcePageStructureIndex = hasValidStructure
    ? Number(rawStructure) % 5
    : ((Number(pageIndex) || 0) % 5 + 5) % 5;
  const [selectedPageStructure, setSelectedPageStructure] = useState(sourcePageStructureIndex);
  const [isFlipped, setIsFlipped] = useState(Boolean(pageData.isFlipped));
  const pageStructures = useMemo(
    () => getTemplatePageStructures(categoryId, visualTemplate),
    [categoryId, visualTemplate]
  );
  const defaultArtList = DEFAULT_ARTWORK_BY_TEMPLATE[visualTemplate.id] || ['/sample-artwork/nature-waterfall.jpg'];
  const pageForEditor = useMemo(
    () => chapter ? { ...chapter, structuredData: pageData } : null,
    [chapter, pageData]
  );

  const registerPageDraftSave = useCallback((savePage) => {
    pageDraftSaveRef.current = savePage;
    onRegisterSave?.(savePage);
  }, [onRegisterSave]);

  const registerPageDraftPreview = useCallback((getPreviewPatch) => {
    pageDraftPreviewRef.current = getPreviewPatch;
  }, []);

  // Keep the latest editor context readable by the Preview button. The
  // getter combines the page renderer's unsaved draft patch with the layout
  // currently chosen here, so the preview is the finished page as it stands.
  previewContextRef.current = { chapter, pageData, pageStructures, selectedPageStructure, isFlipped };

  const getPagePreviewPatch = useCallback(() => {
    const context = previewContextRef.current || {};
    const draftPatch = pageDraftPreviewRef.current?.() || null;
    const structure = context.pageStructures?.[context.selectedPageStructure];
    return {
      ...(draftPatch || {}),
      title: draftPatch?.title ?? context.chapter?.title ?? '',
      subtitle: draftPatch?.subtitle ?? context.chapter?.subtitle ?? '',
      contentHtml: draftPatch?.contentHtml ?? context.chapter?.contentHtml ?? '',
      structuredData: {
        ...(context.pageData || {}),
        ...(draftPatch?.structuredData || {}),
        pageStructure: context.selectedPageStructure ?? 0,
        isFlipped: Boolean(context.isFlipped),
        ...(structure ? {
          structureName: structure.name,
          borderElement: structure.borderName,
          frameElement: structure.frameName,
          cardElement: structure.cardName
        } : {})
      }
    };
  }, []);

  useEffect(() => {
    if (!onRegisterPreview) return undefined;
    onRegisterPreview(getPagePreviewPatch);
    return () => onRegisterPreview(null);
  }, [onRegisterPreview, getPagePreviewPatch]);

  useEffect(() => {
    preloadImages([
      ...defaultArtList,
      ...(SAMPLE_ART_BY_CATEGORY[categoryId] || []),
      ...(Array.isArray(pageData.captions) ? pageData.captions.map((slot) => slot?.imageUrl) : []),
      pageData.heroImageUrl,
      visualTemplate.previewImage
    ]);
  }, [categoryId, chapter?.id, pageIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedPageStructure(sourcePageStructureIndex);
    setIsFlipped(Boolean(pageData.isFlipped));
    setLayoutError('');
  }, [chapter?.id, pageIndex, sourcePageStructureIndex, pageData.isFlipped]);

  // Upgrade saved pages in place the first time they are opened. The migration only
  // adds common editor fields and the default structure; it keeps legacy data intact.
  useEffect(() => {
    if (!editable || !onSaveChapter || !chapter?.id || (hasValidStructure && !pageMigration.changed)) return;
    const attemptKey = `${chapter.id}:${pageIndex}:${chapter.updatedAt || ''}:${sourcePageStructureIndex}`;
    if (migrationAttemptsRef.current.has(attemptKey)) return;
    migrationAttemptsRef.current.add(attemptKey);
    const structure = pageStructures[sourcePageStructureIndex];
    Promise.resolve(onSaveChapter(chapter.id, {
      title: chapter.title,
      subtitle: chapter.subtitle,
      sectionType: chapter.sectionType,
      layoutId: visualTemplate.layoutId,
      contentHtml: chapter.contentHtml || '',
      structuredData: {
        ...pageData,
        pageStructure: sourcePageStructureIndex,
        ...(structure ? {
          structureName: structure.name,
          borderElement: structure.borderName,
          frameElement: structure.frameName,
          cardElement: structure.cardName
        } : {})
      }
    })).catch((error) => {
      console.error('Could not prepare this page for the common editor:', error);
    });
  }, [
    editable,
    onSaveChapter,
    chapter?.id,
    chapter?.updatedAt,
    chapter?.title,
    chapter?.subtitle,
    chapter?.sectionType,
    chapter?.contentHtml,
    pageIndex,
    hasValidStructure,
    pageMigration.changed,
    pageData,
    pageStructures,
    sourcePageStructureIndex,
    visualTemplate.layoutId
  ]);

  const savePageControl = async (field, value) => {
    if (!editable || !onSaveChapter || !chapter?.id) return;
    const structure = field === 'pageStructure' ? pageStructures[value] : null;
    await onSaveChapter(chapter.id, {
      title: chapter.title,
      subtitle: chapter.subtitle,
      sectionType: chapter.sectionType,
      layoutId: visualTemplate.layoutId,
      structuredData: {
        [field]: value,
        ...(structure ? {
          structureName: structure.name,
          borderElement: structure.borderName,
          frameElement: structure.frameName,
          cardElement: structure.cardName
        } : {})
      }
    });
  };

  const handleSelectPageStructure = async (index) => {
    if (savingPageLayout || index === selectedPageStructure) return;
    setSavingPageLayout(true);
    setLayoutError('');
    try {
      await pageDraftSaveRef.current?.();
      await savePageControl('pageStructure', index);
      setSelectedPageStructure(index);
    } catch (error) {
      setLayoutError(error.message || 'Could not save this page layout. Try again.');
    } finally {
      setSavingPageLayout(false);
    }
  };

  // The frame's exact designed shape, refined by measuring the rendered slot.
  const refineSlotRule = (event, target, heightClass) => {
    let measuredAspect;
    try {
      const slotElement = event?.currentTarget?.closest?.('[data-image-slot]');
      if (slotElement?.clientWidth > 0 && slotElement?.clientHeight > 0) {
        measuredAspect = slotElement.clientWidth / slotElement.clientHeight;
      }
    } catch { /* recorded registry values still apply */ }
    return getImageSlotRule({ heightClass: heightClass || 'h-48', shape: target?.shape || 'rect', measuredAspect });
  };

  const closeCropSession = () => {
    setCropSession((session) => {
      if (session?.objectUrl) URL.revokeObjectURL(session.objectUrl);
      return null;
    });
  };

  const uploadImageFile = async (fileOrBlob, displayName, target) => {
    const formData = new FormData();
    if (fileOrBlob instanceof File) {
      formData.append('file', fileOrBlob);
    } else {
      formData.append('file', new File([fileOrBlob], `${(displayName || 'photo').replace(/\.[^.]+$/, '')}-framed.jpg`, { type: 'image/jpeg' }));
    }
    formData.append('title', (displayName || 'photo').replace(/\.[^.]+$/, ''));
    formData.append('assetType', 'illustration');
    formData.append('chapterId', chapter.id);
    const created = await apiRequest(`/api/projects/${project.id}/assets`, {
      method: 'POST',
      body: formData
    });
    await onAssetsChanged?.();
    const image = created?.asset?.dataUrl || created?.asset?.fileUrl;
    if (image) applyPhotoToTarget(image, target);
    return image;
  };

  const finishCropWithUpload = async (blob) => {
    const session = cropSession;
    if (!session) return;
    setUploadingPhoto(true);
    setUploadError('');
    try {
      await uploadImageFile(blob, session.displayName || 'framed-photo.jpg', session.target);
      closeCropSession();
    } catch (error) {
      setUploadError(error.message || 'Could not save the framed image. Please try again.');
      closeCropSession();
    } finally {
      setUploadingPhoto(false);
    }
  };

  const finishCropWithOriginal = async () => {
    const session = cropSession;
    if (!session) return;
    if (session.kind === 'upload' && session.file) {
      setUploadingPhoto(true);
      try {
        await uploadImageFile(session.file, session.file.name, session.target);
      } catch (error) {
        setUploadError(error.message || 'Could not upload this image. Please try again.');
      } finally {
        setUploadingPhoto(false);
      }
    } else if (session.originalUrl) {
      applyPhotoToTarget(session.originalUrl, session.target);
    }
    closeCropSession();
  };

  const triggerPhotoUpload = (target) => {
    if (!editable) return;
    activePhotoTargetRef.current = target;
    setUploadError('');
    fileInputRef.current?.click();
  };

  const openStockImageSearch = (target) => {
    if (!editable) return;
    activePhotoTargetRef.current = target;
    setStockSlotRule(target?.slotRule || null);
    setUploadError('');
    setStockSearchInitialQuery([chapter?.title, chapter?.synopsis, project?.centralIdea]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ')
      .slice(0, 150));
    setStockSearchOpen(true);
  };

  const applyPhotoToTarget = (url, target) => {
    if (!target) return;
    if (target.type === 'captionSlot' && target.onImageChange) {
      target.onImageChange(url);
      return;
    }
    const nextCaptions = Array.from({ length: target.totalCount || 1 }, (_, index) => {
      const old = Array.isArray(pageData.captions) ? pageData.captions[index] || {} : {};
      return index === target.index ? { ...old, imageUrl: url } : old;
    });
    void savePageControl('captions', nextCaptions);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    const target = activePhotoTargetRef.current;
    event.target.value = '';
    if (!file || !project?.id || !chapter?.id) return;
    setUploadError('');
    // Fit first, upload second: the stored photo is the framed one.
    const objectUrl = URL.createObjectURL(file);
    setCropSession({
      kind: 'upload',
      src: objectUrl,
      objectUrl,
      file,
      displayName: file.name,
      rule: target?.slotRule || getImageSlotRule({}),
      target
    });
  };

  const getCuratedPhotoSlots = (requiredCount) => {
    const existing = Array.isArray(pageData.captions) ? pageData.captions : [];
    return Array.from({ length: requiredCount }, (_, index) => {
      const current = existing[index] || {};
      return {
        ...current,
        title: current.title || current.caption || '',
        location: current.location || '',
        imageUrl: current.imageUrl || (index === 0 ? pageData.heroImageUrl : '') || defaultArtList[index % defaultArtList.length]
      };
    });
  };

  const renderPhotoSlot = ({ imageUrl, fallbackIndex = 0, target, heightClass = 'h-48', frameStyle = {} }) => {
    const resolvedUrl = imageUrl || defaultArtList[fallbackIndex % defaultArtList.length] || '/sample-artwork/nature-waterfall.jpg';
    const targetWithRule = (event) => ({ ...target, slotRule: refineSlotRule(event, target, heightClass) });
    return (
      <div data-image-slot="true" className={`relative w-full ${heightClass} overflow-hidden group`} style={frameStyle}>
        <BookImage
          src={resolvedUrl}
          alt="Book page artwork"
          eager={fallbackIndex === 0}
          fetchPriority={fallbackIndex === 0 ? 'high' : 'auto'}
          skeletonStyle={{ backgroundColor: `${visualTemplate.accentColor || '#B68745'}14` }}
        />
        {editable && (
          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-95">
            <button
              type="button"
              onClick={(event) => triggerPhotoUpload(targetWithRule(event))}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900/90 px-2.5 py-1 text-[10px] font-extrabold text-white shadow"
            >
              {uploadingPhoto ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              <span>{uploadingPhoto ? 'Uploading…' : 'Upload'}</span>
            </button>
            <button
              type="button"
              onClick={(event) => openStockImageSearch(targetWithRule(event))}
              aria-label="Search Pexels and Pixabay for a book photo"
              title="Search Pexels and Pixabay"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-800/95 px-2.5 py-1 text-[10px] font-extrabold text-white shadow"
            >
              <Search className="h-3 w-3" />
              <span>Stock photos</span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                const refinedTarget = targetWithRule(event);
                setCropSession({
                  kind: 'existing',
                  src: resolvedUrl,
                  originalUrl: resolvedUrl,
                  displayName: 'page-photo.jpg',
                  rule: refinedTarget.slotRule,
                  target: refinedTarget
                });
              }}
              aria-label="Edit image: crop and centre this photo for its frame"
              title="Crop & centre this photo for its frame"
              className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-slate-900 shadow"
            >
              <Crop className="h-3 w-3" />
              <span>Edit image</span>
            </button>
            {assets.length > 0 && (
              <select
                aria-label="Choose an uploaded image"
                value={imageUrl || ''}
                onChange={(event) => applyPhotoToTarget(event.target.value, target)}
                className="max-w-[125px] rounded-lg bg-white/95 px-1.5 py-1 text-[10px] font-bold text-slate-900 shadow"
              >
                <option value="">Sample art</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.dataUrl || asset.fileUrl || ''}>{asset.title || asset.originalName || asset.fileName}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!project || !chapter) return null;

  return (
    <div className="space-y-3">
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload an image for this page"
        />
      )}
      {editable && (
        <section
          className="space-y-3 rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(155deg, #0D234C 0%, #081838 58%, #050F26 100%)',
            color: '#FDE08D',
            border: '1.5px solid rgba(229, 184, 75, 0.65)',
            boxShadow: '0 14px 35px rgba(0, 0, 0, 0.75)'
          }}
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-bold sm:text-base">One page editor for every template</h2>
              <p className="text-[11px] text-[#F3D78B] sm:text-xs">
                Choose a layout for this page. The page border, text-block borders, heading treatment and colours come from
                your page design (change them under <strong>Photos, page design, template &amp; font</strong> above);
                writing tools and AI work the same in every category.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savingPageLayout && <span role="status" className="inline-flex items-center gap-1 text-[10px]"><LoaderCircle className="h-3 w-3 animate-spin" /> Saving layout…</span>}
              <button
                type="button"
                aria-label="Flip page layout left or right"
                aria-pressed={isFlipped}
                onClick={async () => {
                  const next = !isFlipped;
                  setIsFlipped(next);
                  try {
                    await savePageControl('isFlipped', next);
                  } catch (error) {
                    setIsFlipped(!next);
                    setLayoutError(error.message || 'Could not save the layout direction.');
                  }
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
                style={{ background: 'linear-gradient(180deg, #FCE38A 0%, #E5B84B 52%, #C49122 100%)', color: '#061128', border: '1.5px solid #FFF3B8' }}
              >
                <FlipHorizontal className="h-3.5 w-3.5" /> Flip layout
              </button>
            </div>
          </div>
          <div
            role="group"
            aria-label={`Layout choices for Chapter ${chapterIndex + 1}, Page ${pageIndex + 1}`}
            className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"
          >
            {pageStructures.map((structure) => {
              const isCurrent = selectedPageStructure === structure.index;
              return (
                <button
                  key={structure.index}
                  type="button"
                  disabled={savingPageLayout}
                  aria-label={`Use Layout ${structure.index + 1} for this page: ${structure.name}`}
                  aria-pressed={isCurrent}
                  onClick={() => handleSelectPageStructure(structure.index)}
                  title={`${structure.name} — ${structure.borderName}, ${structure.frameName}, ${structure.cardName}`}
                  className={`min-w-0 rounded-xl p-2 text-left transition hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FDE08D] ${isCurrent ? 'ring-2 ring-[#FDE08D]' : ''}`}
                  style={isCurrent
                    ? { background: 'linear-gradient(180deg, #FCE38A 0%, #E5B84B 100%)', color: '#061128', border: '1px solid #FFF3B8' }
                    : { backgroundColor: 'rgba(6, 17, 40, 0.9)', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.48)' }}
                >
                  <PageStructureMiniPreview
                    categoryId={categoryId}
                    template={visualTemplate}
                    designOverrides={project?.coverConfig?.design || {}}
                    structureIndex={structure.index}
                    compact
                  />
                  <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-wide">Layout {structure.index + 1}</span>
                  <span className="line-clamp-2 block text-[10px] leading-tight opacity-80">{structure.shortLabel.replace(/^Structure [IV]+ • /, '')}</span>
                </button>
              );
            })}
          </div>
          {layoutError && <p role="alert" className="text-xs text-rose-200">{layoutError}</p>}
          {uploadError && <p role="alert" className="text-xs text-rose-200">{uploadError}</p>}
        </section>
      )}

      <TemplateStructurePageRenderer
        key={`${chapter.id}:${pageIndex}:${selectedPageStructure}:${isFlipped ? 'flipped' : 'standard'}`}
        project={project}
        chapter={pageForEditor}
        chapterIndex={chapterIndex}
        totalChapters={totalChapters}
        pageIndex={pageIndex}
        totalPages={totalPages}
        chapterSummaries={chapterSummaries}
        categoryId={categoryId}
        visualTemplate={visualTemplate}
        structureIndex={selectedPageStructure}
        isFlipped={isFlipped}
        editable={editable}
        aiConfigured={aiConfigured}
        onOpenAiSettings={onOpenAiSettings}
        onSaveChapter={onSaveChapter}
        onRegisterSave={registerPageDraftSave}
        onRegisterPreview={registerPageDraftPreview}
        onBackToIndex={onBackToIndex}
        getCuratedPhotoSlots={getCuratedPhotoSlots}
        renderPhotoSlot={renderPhotoSlot}
        fontFamily={fontFamily}
      />
      <StockImageSearchModal
        open={stockSearchOpen}
        projectId={project.id}
        initialQuery={stockSearchInitialQuery}
        slotRule={stockSlotRule}
        onClose={() => setStockSearchOpen(false)}
        onImageSelected={(asset) => {
          const imageUrl = asset?.dataUrl || asset?.fileUrl;
          if (!imageUrl) return;
          const target = activePhotoTargetRef.current;
          setCropSession({
            kind: 'stock',
            src: imageUrl,
            originalUrl: imageUrl,
            displayName: asset?.title || asset?.originalName || 'stock-photo.jpg',
            rule: stockSlotRule || target?.slotRule || getImageSlotRule({}),
            target
          });
        }}
        onAssetsChanged={onAssetsChanged}
        onOpenProviderSettings={onOpenAiSettings}
      />
      {cropSession && (
        <ImageCropEditor
          open
          src={cropSession.src}
          rule={cropSession.rule}
          title={cropSession.kind === 'existing' ? 'Crop & centre this photo' : 'Fit this photo to its frame'}
          applying={uploadingPhoto}
          onCancel={closeCropSession}
          onUseOriginal={finishCropWithOriginal}
          onApply={finishCropWithUpload}
        />
      )}
    </div>
  );
}
