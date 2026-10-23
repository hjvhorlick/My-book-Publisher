import React from 'react';

export default function BookCoverPreview({ project = {}, coverConfig = {}, size = 'sm', className = '' }) {
  const bg = coverConfig?.bgColor || '#1E293B';
  const accent = coverConfig?.accentColor || '#D4AF37';
  const text = coverConfig?.textColor || '#FBF8F3';
  const badge = coverConfig?.badgeText || project?.publicationTypeName || project?.bookType || 'EDITION';

  const dimensions = size === 'lg' ? 'w-36 h-52 p-4' : 'w-20 h-28 p-2';

  return (
    <div
      style={{ backgroundColor: bg, color: text }}
      className={`${dimensions} rounded-lg shadow-md border border-black/15 flex flex-col justify-between text-center relative overflow-hidden select-none ${className}`}
    >
      <div
        style={{ borderColor: accent }}
        className="inset-1.5 absolute border opacity-50 pointer-events-none rounded-xs"
      />
      <div
        style={{ color: accent }}
        className="text-[6px] font-bold uppercase tracking-widest truncate relative z-10"
      >
        {badge}
      </div>
      <div className="my-auto px-0.5 relative z-10">
        <div className="font-serif font-bold text-[10px] leading-tight line-clamp-3">
          {project?.title || 'Untitled'}
        </div>
      </div>
      <div className="text-[6.5px] uppercase tracking-wider opacity-80 truncate relative z-10">
        {project?.authorName || 'Studio'}
      </div>
    </div>
  );
}
