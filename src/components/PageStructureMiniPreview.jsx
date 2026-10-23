import React from 'react';
import { getTemplatePageStructures } from '../data/templatePageStructures';

const SAMPLE_ART_BY_CATEGORY = {
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
  compact = false
}) {
  const safeIndex = ((Number(structureIndex) || 0) % 5 + 5) % 5;
  const structure = getTemplatePageStructures(categoryId, template)[safeIndex];
  const pageBg = template?.pageBg || '#FCF8F1';
  const pageText = template?.pageText || '#1E293B';
  const borderColor = template?.borderColor || '#D97706';
  const accentColor = template?.accentColor || borderColor;
  const artList = SAMPLE_ART_BY_CATEGORY[categoryId] || SAMPLE_ART_BY_CATEGORY.photobook;
  const count = Math.max(1, structure?.photoSlots || 1);

  const borderStyle =
    safeIndex === 0
      ? {
          border: `3px double ${borderColor}`,
          boxShadow: `inset 0 0 0 2px ${pageBg}, inset 0 0 0 3px ${borderColor}55`
        }
      : safeIndex === 1
      ? {
          border: `3px solid ${accentColor}`,
          boxShadow: `inset 0 0 0 4px ${borderColor}33`
        }
      : safeIndex === 2
      ? {
          borderTop: `4px double ${borderColor}`,
          borderBottom: `4px double ${borderColor}`,
          borderLeft: `3px solid ${accentColor}`,
          borderRight: `3px solid ${accentColor}`,
          boxShadow: `inset 0 0 0 2px ${borderColor}33`
        }
      : safeIndex === 3
      ? {
          borderTop: `5px solid ${accentColor}`,
          borderBottom: `2px solid ${borderColor}`,
          borderLeft: `2px solid ${borderColor}`,
          borderRight: `2px solid ${borderColor}`,
          boxShadow: `inset 0 0 0 2px ${accentColor}22`
        }
      : {
          border: `2px dotted ${borderColor}`,
          boxShadow: `inset 0 0 0 3px ${accentColor}18`
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
      <img
        src={artList[index % artList.length]}
        alt=""
        className="w-full h-full object-cover"
      />
    </div>
  );

  const storyCard = (className = '') => (
    <div
      className={`min-w-0 p-1.5 rounded ${className}`}
      style={{
        backgroundColor: `${accentColor}18`,
        border:
          safeIndex === 2
            ? `2px double ${borderColor}`
            : `1px solid ${borderColor}`,
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
          {safeIndex === 0 && (
            <>
              <span className="absolute top-1 left-1 text-[8px] font-black" style={{ color: borderColor }}>❧</span>
              <span className="absolute top-1 right-1 text-[8px] font-black" style={{ color: borderColor }}>❧</span>
            </>
          )}
          {safeIndex === 1 && (
            <div className="absolute top-0 inset-x-0 h-1.5" style={{ backgroundColor: accentColor }} />
          )}
          {safeIndex === 2 && (
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 px-1 rounded-full text-[6px] font-bold text-white" style={{ backgroundColor: accentColor }}>✦</span>
          )}
          {safeIndex === 3 && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b-full" style={{ backgroundColor: accentColor }} />
          )}
          {safeIndex === 4 && (
            <span className="absolute top-1 right-1 text-[7px] font-black" style={{ color: accentColor }}>✧</span>
          )}

          <div
            className={`relative z-10 text-center ${compact ? 'text-[5px] pb-0.5 mb-0.5' : 'text-[7px] pb-1 mb-1'} font-extrabold uppercase tracking-widest truncate`}
            style={{
              color: safeIndex === 1 ? '#fff' : accentColor,
              borderBottom: `1px solid ${borderColor}88`
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
