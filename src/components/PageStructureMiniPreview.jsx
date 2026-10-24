import React from 'react';
import BookImage from './BookImage';
import { getTemplatePageStructures } from '../data/templatePageStructures';
import {
  resolveTemplateDesign,
  getPageBorderStyle,
  blockStyleFor,
  headingTreatment,
  withAlpha
} from '../data/designSystem';

export const SAMPLE_ART_BY_CATEGORY = {
  photobook: [
    '/sample-artwork/wedding-walk.jpg',
    '/sample-artwork/nature-waterfall.jpg',
    '/sample-artwork/wedding-dance.jpg',
    '/sample-artwork/nature-ferns.jpg',
    '/sample-artwork/wedding-confetti.jpg'
  ],
  cookbook: [
    '/sample-artwork/dish-bistro.jpg',
    '/sample-artwork/nature-ferns.jpg',
    '/sample-artwork/wedding-dance.jpg'
  ],
  magazine: [
    '/sample-artwork/mag-couture.jpg',
    '/sample-artwork/mag-runner.jpg',
    '/sample-artwork/mag-sculpture.jpg'
  ],
  storybook: [
    '/sample-artwork/story-lantern.jpg',
    '/sample-artwork/story-squirrel.jpg'
  ],
  informational: [
    '/sample-artwork/info-studio.jpg',
    '/sample-artwork/info-joinery.jpg'
  ],
  book: [
    '/sample-artwork/book-homestead.jpg',
    '/sample-artwork/book-harbor.jpg'
  ]
};

/**
 * A tablet-size miniature for one of the five page structures. The image count,
 * palette, border, frame treatment, and card decorations follow the active template.
 */
export default function PageStructureMiniPreview({
  categoryId = 'photobook',
  template = {},
  structureIndex = 0,
  compact = false,
  designOverrides = {}
}) {
  const safeIndex = ((Number(structureIndex) || 0) % 5 + 5) % 5;
  const structure = getTemplatePageStructures(categoryId, template)[safeIndex];
  const design = resolveTemplateDesign(template, designOverrides, { fontFamily: template?.fontFamily });
  const pageBg = design.pageBg;
  const pageText = design.bodyText;
  const borderColor = design.borderInk;
  const accentColor = design.accentInk;
  const headingStyle = headingTreatment(design);
  const artList = SAMPLE_ART_BY_CATEGORY[categoryId] || SAMPLE_ART_BY_CATEGORY.photobook;
  const count = Math.max(1, structure?.photoSlots || 1);

  // The miniature draws the same page-border ornament the finished page uses,
  // scaled down so the five layout thumbnails stay a faithful preview.
  const borderLayers = getPageBorderStyle(design.pageBorderId).layers || [];
  const hasDoubleRule = borderLayers.some((layer) => layer.kind === 'border' && layer.style === 'double');
  const hasInnerRule = borderLayers.filter((layer) => layer.kind === 'border').length > 1;
  const hasBand = borderLayers.some((layer) => layer.kind === 'band' && layer.edge === 'top');
  const hasCorners = borderLayers.some((layer) => layer.kind === 'corners');
  const borderStyle = hasBand
    ? { borderTop: `3px solid ${accentColor}`, borderBottom: `1px solid ${borderColor}`, borderLeft: 'none', borderRight: 'none' }
    : !borderLayers.length
    ? { border: 'none' }
    : {
        border: hasDoubleRule ? `2px double ${borderColor}` : `1.5px solid ${withAlpha(borderColor, 0.85)}`,
        borderRadius: design.pageBorderId === 'soft-rounded' || design.pageBorderId === 'arch-window' ? 10 : 2,
        boxShadow: hasInnerRule ? `inset 0 0 0 3px ${withAlpha(pageBg, 0.95)}, inset 0 0 0 4px ${withAlpha(borderColor, 0.35)}` : undefined
      };

  const frameStyle = (index) => ({
    border:
      safeIndex === 0
        ? `2px double ${borderColor}`
        : safeIndex === 1
        ? `2px solid ${accentColor}`
        : `2px solid ${borderColor}`,
    borderRadius:
      safeIndex === 0
        ? '3px'
        : safeIndex === 1
        ? index % 2 === 0
          ? '13px 13px 3px 3px'
          : '30px 30px 4px 4px'
        : safeIndex === 2
        ? '2px'
        : safeIndex === 3
        ? '12px 12px 3px 3px'
        : index % 2 === 0
        ? '50%'
        : '2px',
    boxShadow: safeIndex === 2 || safeIndex === 4 ? `0 0 0 1px ${pageBg}, 0 0 0 2px ${borderColor}66` : undefined
  });

  const image = (index, className = 'h-full') => (
    <div
      key={`mini-photo-${index}`}
      className={`${className} min-w-0 overflow-hidden p-0.5`}
      style={{
        ...frameStyle(index),
        backgroundColor: pageBg
      }}
    >
      <BookImage src={artList[index % artList.length]} alt="" />
    </div>
  );

  const storyCard = (className = '') => (
    <div
      className={`min-w-0 p-1.5 ${className}`}
      style={{
        ...blockStyleFor(design, { radius: 4 }),
        borderTop: safeIndex === 1 ? `3px solid ${accentColor}` : undefined
      }}
    >
      <div
        className="text-[6px] font-black uppercase tracking-wider truncate"
        style={{ color: accentColor }}
      >
        {safeIndex === 0
          ? '❖ Classical Caption Plaque'
          : safeIndex === 1
          ? '★ Ribbon Pedestal Card'
          : safeIndex === 2
          ? '✦ Medallion Scroll Card'
          : safeIndex === 3
          ? '▰ Panorama Caption Bar'
          : '▧ Collector’s Note Plaque'}
      </div>
      <div
        className="text-[6px] leading-tight mt-0.5 line-clamp-2"
        style={{ color: pageText }}
      >
        {structure?.name || 'Matched to your selected template'}
      </div>
    </div>
  );

  return (
    <div
      className={`w-full ${compact ? 'h-24 sm:h-28 p-1' : 'h-48 p-2'} rounded-2xl relative overflow-hidden select-none`}
      style={{
        background: 'linear-gradient(145deg, #5C3D24 0%, #3A2412 100%)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)'
      }}
    >
      <div className={`w-full h-full rounded-xl bg-[#141619] ${compact ? 'p-1' : 'p-1.5'} shadow-inner flex flex-col`}>
        <div
          className={`w-full h-full rounded-lg ${compact ? 'p-1.5' : 'p-2.5'} relative overflow-hidden flex flex-col`}
          style={{
            ...borderStyle,
            backgroundColor: pageBg,
            color: pageText
          }}
        >
          {hasCorners && (
            <>
              <span className="absolute top-1 left-1 text-[8px] font-black" style={{ color: borderColor }}>❧</span>
              <span className="absolute top-1 right-1 text-[8px] font-black" style={{ color: borderColor }}>❧</span>
              <span className="absolute bottom-1 left-1 text-[8px] font-black" style={{ color: borderColor }}>❧</span>
              <span className="absolute bottom-1 right-1 text-[8px] font-black" style={{ color: borderColor }}>❧</span>
            </>
          )}

          <div
            className={`relative z-10 text-center ${compact ? 'text-[5px] pb-0.5 mb-0.5' : 'text-[7px] pb-1 mb-1'} font-extrabold uppercase tracking-widest truncate`}
            style={{
              color: headingStyle.titleStyle.color,
              borderBottom: `1px solid ${withAlpha(borderColor, 0.55)}`
            }}
          >
            {structure?.shortLabel || structure?.name || template?.name || 'Matched Page Design'}
          </div>

          {/* Structure I: Gallery split with companion frames and a caption plaque */}
          {safeIndex === 0 && (
            <div className="grid grid-cols-12 gap-1.5 flex-1 min-h-0">
              <div className="col-span-7 min-h-0">{image(0)}</div>
              <div className="col-span-5 flex flex-col gap-1.5 min-h-0">
                {Array.from({ length: Math.max(0, count - 1) }, (_, offset) => (
                  <div key={offset} className="flex-1 min-h-0">{image(offset + 1)}</div>
                ))}
                {storyCard('flex-1')}
              </div>
            </div>
          )}

          {/* Structure II: Panoramic top photograph with a row of cameo frames and a ribbon card */}
          {safeIndex === 1 && (
            <div className="flex-1 min-h-0 flex flex-col gap-1.5">
              <div className="h-14 shrink-0">{image(0)}</div>
              <div className="grid grid-cols-12 gap-1.5 flex-1 min-h-0">
                <div className="col-span-8 grid grid-cols-3 gap-1.5 min-h-0">
                  {Array.from({ length: Math.max(0, count - 1) }, (_, offset) => (
                    <div key={offset} className="min-h-0">{image(offset + 1)}</div>
                  ))}
                </div>
                <div className="col-span-4">{storyCard('h-full')}</div>
              </div>
            </div>
          )}

          {/* Structure III: Interlocking image mosaic with a centerpiece medallion scroll */}
          {safeIndex === 2 && (
            <div className="flex-1 min-h-0 flex flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
                {Array.from({ length: count }, (_, index) => (
                  <div key={index} className="min-h-0">{image(index)}</div>
                ))}
              </div>
              <div
                className="flex items-center gap-1.5 p-1 rounded-full shrink-0"
                style={{ border: `1px double ${borderColor}`, backgroundColor: `${accentColor}14` }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black text-white shrink-0" style={{ backgroundColor: accentColor }}>III</span>
                <span className="text-[6px] font-bold uppercase truncate" style={{ color: pageText }}>Medallion scroll · {structure?.name}</span>
              </div>
            </div>
          )}

          {/* Structure IV: immersive panoramic lead with a three-photo caption bar */}
          {safeIndex === 3 && (
            <div className="flex-1 min-h-0 flex flex-col gap-1.5">
              <div className="h-12 sm:h-14 shrink-0">{image(0)}</div>
              <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
                {Array.from({ length: Math.max(0, Math.min(3, count - 1)) }, (_, offset) => (
                  <div key={offset} className="min-h-0">{image(offset + 1)}</div>
                ))}
                {count < 2 && storyCard('col-span-2')}
              </div>
              <div className="h-7 shrink-0">{storyCard('h-full')}</div>
            </div>
          )}

          {/* Structure V: six-frame contact sheet with a separate collector’s note */}
          {safeIndex === 4 && (
            <div className="flex-1 min-h-0 flex flex-col gap-1.5">
              <div className="grid grid-cols-3 grid-rows-2 gap-1.5 flex-1 min-h-0">
                {Array.from({ length: Math.min(count, 6) }, (_, index) => (
                  <div key={index} className="min-h-0">{image(index)}</div>
                ))}
                {count === 1 && <div className="col-span-2 row-span-2 min-h-0">{storyCard('h-full')}</div>}
              </div>
              <div className="h-7 shrink-0">{storyCard('h-full')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
