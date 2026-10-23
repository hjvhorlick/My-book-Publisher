import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FlipHorizontal2, LoaderCircle, Maximize, RotateCw, RotateCcw, X, ZoomIn
} from 'lucide-react';
import {
  MAX_ZOOM, MIN_ZOOM, clampPan, coverScale, filterString, renderCroppedCanvas, rotatedSize
} from '../utils/imageCrop';

/**
 * The built-in photo editor for a single template image frame.
 *
 * The crop window is locked to the slot's recorded aspect ratio and the
 * export uses the slot's recommended print size, so a picture always lands
 * on the page at exactly the shape and quality the design expects. The
 * author can drag to re-centre the picture, zoom, straighten by 90°
 * steps, mirror it, and make gentle brightness/contrast/colour tweaks —
 * enough to fit any photo professionally without a complicated program.
 */
export default function ImageCropEditor({
  open = true,
  src,
  rule,
  title = 'Fit photo to its frame',
  allowUseOriginal = true,
  applying = false,
  onCancel,
  onUseOriginal,
  onApply
}) {
  const safeRule = rule || {
    aspectRatio: 1.5, aspectLabel: '3:2', orientation: 'landscape',
    sizeLabel: 'Photo', recommendedWidth: 1200, recommendedHeight: 800, minUsableWidth: 600
  };
  const [natural, setNatural] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ offsetX: 0, offsetY: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [containerWidth, setContainerWidth] = useState(640);
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const measure = () => {
      if (viewportRef.current) setContainerWidth(viewportRef.current.clientWidth || 640);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  const geometry = useMemo(() => {
    if (!natural) return null;
    const rotated = rotatedSize(natural.width, natural.height, rotation);
    const scale = coverScale(natural.width, natural.height, safeRule.aspectRatio, rotation) * zoom;
    const unitPx = containerWidth / safeRule.aspectRatio; // viewport is aspect × 1 units
    const quarterTurn = ((rotation % 180) + 180) % 180 === 90;
    // Element box before CSS rotation: swap axes on quarter turns.
    const elementWidthUnits = (quarterTurn ? rotated.height : rotated.width) * scale;
    const elementHeightUnits = (quarterTurn ? rotated.width : rotated.height) * scale;
    return {
      unitPx,
      widthPx: elementWidthUnits * unitPx,
      heightPx: elementHeightUnits * unitPx
    };
  }, [natural, rotation, zoom, safeRule.aspectRatio, containerWidth]);

  if (!open) return null;

  const clampWith = (nextPan, nextZoom = zoom, nextRotation = rotation) => {
    if (!natural) return nextPan;
    return clampPan({
      ...nextPan,
      imageWidth: natural.width,
      imageHeight: natural.height,
      aspectRatio: safeRule.aspectRatio,
      zoom: nextZoom,
      rotation: nextRotation
    });
  };

  const handleZoom = (nextZoom) => {
    setZoom(nextZoom);
    setPan((previous) => clampWith(previous, nextZoom));
  };

  const handleRotate = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    setPan((previous) => clampWith(previous, zoom, nextRotation));
  };

  const resetAll = () => {
    setZoom(1);
    setPan({ offsetX: 0, offsetY: 0 });
    setRotation(0);
    setFlipHorizontal(false);
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
    setError('');
  };

  const onPointerDown = (event) => {
    if (!natural) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!dragRef.current || !geometry) return;
    const dx = (event.clientX - dragRef.current.x) / geometry.unitPx;
    const dy = (event.clientY - dragRef.current.y) / geometry.unitPx;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setPan((previous) => clampWith({ offsetX: previous.offsetX + dx, offsetY: previous.offsetY + dy }));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const handleApply = () => {
    if (!imageRef.current || !natural) return;
    setBusy(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      const { size } = renderCroppedCanvas(imageRef.current, canvas, {
        rule: safeRule, zoom, offsetX: pan.offsetX, offsetY: pan.offsetY,
        rotation, flipHorizontal, adjustments
      });
      canvas.toBlob((blob) => {
        setBusy(false);
        if (!blob) {
          setError('This picture could not be cropped in the browser. You can still use the original.');
          return;
        }
        onApply?.(blob, size);
      }, 'image/jpeg', 0.92);
    } catch {
      setBusy(false);
      setError('This picture is protected from in-browser editing by its source. You can still use the original, or upload the file from your device and crop that copy.');
    }
  };

  const lowResolution = natural && natural.width < (safeRule.minUsableWidth || 600);
  const working = busy || applying;

  const dialog = (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !working) onCancel?.(); }}
    >
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-title"
        className="relative z-10 flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#171410] text-stone-100 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-stone-700/70 px-5 py-4">
          <div>
            <h2 id="image-crop-title" className="text-base font-extrabold sm:text-lg">{title}</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
              This space is a <strong className="text-stone-200">{safeRule.aspectLabel} {safeRule.orientation}</strong> frame
              ({safeRule.sizeLabel}). Best print size: {safeRule.recommendedWidth} × {safeRule.recommendedHeight} px.
              Drag the picture to centre it — the saved photo matches the frame exactly.
            </p>
          </div>
          <button type="button" onClick={onCancel} disabled={working} aria-label="Close image editor" className="shrink-0 rounded-xl p-2 text-stone-400 hover:bg-stone-800 disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div
            ref={viewportRef}
            className="relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl bg-[repeating-conic-gradient(#262019_0%_25%,#1D1811_0%_50%)] bg-[length:24px_24px] shadow-inner ring-1 ring-stone-600"
            style={{ aspectRatio: String(safeRule.aspectRatio), maxHeight: '52vh', cursor: natural ? 'grab' : 'wait' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={() => setPan({ offsetX: 0, offsetY: 0 })}
            role="application"
            aria-label={`Crop preview, ${safeRule.aspectLabel}. Drag to position the photo, double-click to centre it.`}
          >
            {src && (
              <img
                ref={imageRef}
                src={src}
                alt="Photo being fitted to its frame"
                draggable={false}
                onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                onError={() => setError('That picture could not be loaded for editing. You can still use the original.')}
                style={geometry ? {
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${geometry.widthPx}px`,
                  height: `${geometry.heightPx}px`,
                  maxWidth: 'none',
                  transform: `translate(calc(-50% + ${pan.offsetX * geometry.unitPx}px), calc(-50% + ${pan.offsetY * geometry.unitPx}px)) rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1})`,
                  filter: filterString(adjustments)
                } : { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', maxWidth: 'none', opacity: 0 }}
              />
            )}
            {/* rule-of-thirds guides */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
            </div>
            {!natural && !error && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-stone-300">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Loading picture…
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-400">
            <span>{natural ? `Original: ${natural.width} × ${natural.height} px` : ' '}</span>
            {lowResolution && (
              <span className="font-bold text-amber-300">This picture is small for a {safeRule.sizeLabel.toLowerCase()} — it may print softly. A larger photo will look sharper.</span>
            )}
          </div>

          {error && <p role="alert" className="rounded-xl border border-rose-800 bg-rose-950/40 px-3 py-2 text-[11px] font-semibold text-rose-200">{error}</p>}

          <div className="grid gap-3 rounded-2xl border border-stone-700/70 bg-stone-900/60 p-3 sm:grid-cols-2">
            <div className="space-y-2.5">
              <label className="flex items-center justify-between gap-3 text-[11px] font-bold text-stone-300">
                <span className="inline-flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5" /> Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </label>
              <input
                type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.01" value={zoom}
                aria-label="Zoom"
                onChange={(event) => handleZoom(Number(event.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPan({ offsetX: 0, offsetY: 0 })} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-stone-600 px-2.5 text-[11px] font-bold text-stone-200 hover:border-amber-500">
                  <Maximize className="h-3.5 w-3.5" /> Centre picture
                </button>
                <button type="button" onClick={handleRotate} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-stone-600 px-2.5 text-[11px] font-bold text-stone-200 hover:border-amber-500">
                  <RotateCw className="h-3.5 w-3.5" /> Turn 90°
                </button>
                <button type="button" aria-pressed={flipHorizontal} onClick={() => setFlipHorizontal((value) => !value)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-stone-600 px-2.5 text-[11px] font-bold text-stone-200 hover:border-amber-500">
                  <FlipHorizontal2 className="h-3.5 w-3.5" /> Mirror
                </button>
                <button type="button" onClick={resetAll} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-stone-600 px-2.5 text-[11px] font-bold text-stone-200 hover:border-amber-500">
                  <RotateCcw className="h-3.5 w-3.5" /> Start over
                </button>
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-[11px] font-bold text-stone-300">Gentle adjustments</legend>
              {[
                ['brightness', 'Brightness'],
                ['contrast', 'Contrast'],
                ['saturation', 'Colour strength']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 text-[11px] text-stone-300">
                  <span className="w-24 shrink-0">{label}</span>
                  <input
                    type="range" min="50" max="150" step="1" value={adjustments[key]}
                    aria-label={label}
                    onChange={(event) => setAdjustments((previous) => ({ ...previous, [key]: Number(event.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                  <span className="w-9 shrink-0 text-right">{adjustments[key]}%</span>
                </label>
              ))}
            </fieldset>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-700/70 px-5 py-3.5">
          <span className="text-[10px] text-stone-500">Drag to position · double-click to centre · Esc to cancel</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onCancel} disabled={working} className="min-h-10 rounded-xl px-4 text-xs font-bold text-stone-300 hover:bg-stone-800 disabled:opacity-40">
              Cancel
            </button>
            {allowUseOriginal && onUseOriginal && (
              <button type="button" onClick={onUseOriginal} disabled={working} className="min-h-10 rounded-xl border border-stone-600 px-4 text-xs font-bold text-stone-100 hover:border-amber-500 disabled:opacity-40">
                Use original as-is
              </button>
            )}
            <button
              type="button"
              onClick={handleApply}
              disabled={!natural || working}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-700 px-5 text-sm font-extrabold text-white shadow transition hover:bg-amber-600 disabled:opacity-40"
            >
              {working && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {working ? 'Saving…' : 'Use this framing'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
