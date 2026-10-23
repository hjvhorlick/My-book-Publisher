import React from 'react';

const CLASSICAL_SERIF =
  '"Playfair Display", "Cinzel", "Cormorant Garamond", "Newsreader", "Lora", Georgia, "Times New Roman", serif';

/**
 * Displays the real-looking studio tablet image for each template style
 * along with a classical dark-blue & gold-yellow style badge.
 */
export default function TemplateVisualPreview({
  template,
  fontFamily,
  height = 'h-52',
  showPlaque = true
}) {
  const fontCss = fontFamily || template?.fontFamily || 'Plus Jakarta Sans';
  const accentColor = template?.accentColor || '#D4AF37';
  const previewSrc = template?.previewImage;

  return (
    <div
      className={`w-full ${height} rounded-2xl overflow-hidden relative bg-[#050D21] group select-none`}
      style={{
        boxShadow: '0 14px 32px rgba(0, 0, 0, 0.78)'
      }}
    >
      {previewSrc ? (
        <img
          src={previewSrc}
          alt={template?.name || 'Template Tablet Preview'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold text-sm"
          style={{
            backgroundColor: accentColor,
            color: '#FDE08D',
            fontFamily: CLASSICAL_SERIF
          }}
        >
          {template?.name || 'Tablet Style Preview'}
        </div>
      )}

      {showPlaque && (
        <div
          className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center justify-between text-[11px] font-bold"
          style={{
            backgroundColor: 'rgba(6, 17, 40, 0.88)',
            color: '#FDE08D',
            border: '1px solid rgba(229, 184, 75, 0.55)',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.7)',
            fontFamily: CLASSICAL_SERIF
          }}
        >
          <span className="truncate">{template?.name || 'Tablet Layout'}</span>
          <span className="shrink-0 ml-2 italic" style={{ color: '#E5B84B' }}>
            Font: {fontCss}
          </span>
        </div>
      )}
    </div>
  );
}
