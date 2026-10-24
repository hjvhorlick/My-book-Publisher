import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Image as ImageIcon, Palette, Type } from 'lucide-react';
import {
  TEMPLATES_BY_CATEGORY,
  VISUAL_FONT_STYLES
} from '../data/visualTemplatesCatalog';
import TemplateVisualPreview from './TemplateVisualPreview';
import PageDesignControls from './PageDesignControls';

const BLOCK_STYLE = {
  background: 'rgba(6, 17, 40, 0.78)',
  border: '1.5px solid rgba(229, 184, 75, 0.5)',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.55)'
};

const NAVY_BUTTON_STYLE = {
  backgroundColor: 'rgba(6, 17, 40, 0.9)',
  color: '#FDE08D',
  border: '1.5px solid rgba(229, 184, 75, 0.48)'
};

/**
 * Compact Step 4 controls for the book-wide template look and font.
 * Page photos stay in context: users click a photo frame on the active page to replace it.
 */
export default function BookAppearanceControls({
  project,
  categoryId,
  onUpdateProject,
  onBeforeChange,
  notify = () => {}
}) {
  const templates = TEMPLATES_BY_CATEGORY[categoryId] || TEMPLATES_BY_CATEGORY.photobook;
  const cover = project?.coverConfig || {};
  const initialTemplate =
    templates.find((template) => template.id === cover.visualTemplateId) || templates[0];
  const initialFont =
    cover.fontFamily || project?.fontFamily || initialTemplate?.fontFamily || 'Plus Jakarta Sans';

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    initialTemplate?.id || ''
  );
  const [selectedFont, setSelectedFont] = useState(initialFont);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedTemplate =
      templates.find((template) => template.id === project?.coverConfig?.visualTemplateId) ||
      templates[0];
    setSelectedTemplateId(savedTemplate?.id || '');
    setSelectedFont(
      project?.coverConfig?.fontFamily ||
        project?.fontFamily ||
        savedTemplate?.fontFamily ||
        'Plus Jakarta Sans'
    );
  }, [
    categoryId,
    project?.id,
    project?.fontFamily,
    project?.coverConfig?.fontFamily,
    project?.coverConfig?.visualTemplateId
  ]);

  const saveAppearance = async (templateId, fontFamily) => {
    const template = templates.find((item) => item.id === templateId) || templates[0];
    if (!template) return;

    setSelectedTemplateId(template.id);
    setSelectedFont(fontFamily);
    if (!onUpdateProject) return;

    setSaving(true);
    try {
      await onBeforeChange?.();
      // Keep the author's structural design choices (border ornament, block
      // treatment, heading, furniture) when switching template, but drop the
      // colour overrides so the new template's own palette applies cleanly.
      const nextDesign = { ...(cover.design || {}) };
      delete nextDesign.borderColor;
      delete nextDesign.blockColor;
      await onUpdateProject({
        fontFamily,
        coverConfig: {
          ...cover,
          bgColor: template.pageBg === '#FFFFFF' ? '#1E293B' : template.pageBg,
          accentColor: template.accentColor,
          textColor: '#F8FAFC',
          fontFamily,
          visualTemplateId: template.id,
          borderStyle: template.borderStyle,
          headingStyle: template.headingStyle,
          pageBg: template.pageBg,
          pageText: template.pageText,
          borderColor: template.borderColor,
          design: nextDesign
        }
      });
      notify('Saved your book style.');
    } catch (error) {
      setSelectedTemplateId(initialTemplate?.id || '');
      setSelectedFont(initialFont);
      notify(error.message || 'Could not save your book style. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeTemplate =
    templates.find((template) => template.id === selectedTemplateId) || templates[0];

  return (
    <details className="rounded-2xl overflow-hidden" style={BLOCK_STYLE}>
      <summary
        className="cursor-pointer list-none px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FDE08D]"
        style={{ color: '#FDE08D' }}
      >
        <span className="flex items-center gap-2.5 font-bold text-sm">
          <Palette className="w-4 h-4 text-[#F5C451]" />
          Photos, page design, template &amp; font
        </span>
        <span className="flex items-center gap-2 text-xs" style={{ color: '#F3D78B' }}>
          Photos are edited directly on each page
          <ChevronDown aria-hidden="true" className="w-4 h-4 text-[#F5C451]" />
        </span>
      </summary>

      <div className="px-4 pb-5 space-y-5" style={{ borderTop: '1px solid rgba(229, 184, 75, 0.3)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] gap-5 pt-5">
          <div className="space-y-3">
            <label
              htmlFor="step-four-book-font"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              style={{ color: '#F5C451' }}
            >
              <Type className="w-4 h-4" />
              Book font
            </label>
            <select
              id="step-four-book-font"
              aria-label="Book font"
              value={selectedFont}
              disabled={saving}
              onChange={(event) => saveAppearance(selectedTemplateId, event.target.value)}
              className="w-full min-h-11 px-3 py-2 rounded-xl font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FDE08D]"
              style={NAVY_BUTTON_STYLE}
            >
              {VISUAL_FONT_STYLES.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.name} — {font.id}
                </option>
              ))}
            </select>
            <p className="text-xs leading-relaxed" style={{ color: '#F3D78B' }}>
              Your selected font is applied across the book and can be changed here at any time.
            </p>
            <div className="p-3 rounded-xl flex items-start gap-2.5" style={NAVY_BUTTON_STYLE}>
              <ImageIcon className="w-4 h-4 mt-0.5 shrink-0 text-[#F5C451]" />
              <p className="text-xs leading-relaxed">
                To add or replace a page photo, tap a photo frame in the page preview. Each page keeps its own photos.
              </p>
            </div>
            {saving && (
              <p role="status" aria-live="polite" className="text-xs font-bold" style={{ color: '#FDE08D' }}>
                Saving book style…
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F5C451' }}>
                Template look
              </div>
              <p className="text-xs mt-1" style={{ color: '#F3D78B' }}>
                Change the book-wide visual template without losing page text or photos.
              </p>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {templates.map((template) => {
                const isSelected = template.id === activeTemplate?.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    aria-label={`Use ${template.name} template`}
                    aria-pressed={isSelected}
                    disabled={saving}
                    onClick={() => saveAppearance(template.id, selectedFont)}
                    className="min-w-0 rounded-xl p-1.5 text-left transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FDE08D]"
                    style={{
                      backgroundColor: '#061128',
                      border: isSelected
                        ? '2px solid #FDE08D'
                        : '1px solid rgba(229, 184, 75, 0.4)'
                    }}
                  >
                    <TemplateVisualPreview
                      template={template}
                      fontFamily={selectedFont}
                      height="h-24 sm:h-28"
                      showPlaque={false}
                    />
                    <span className="mt-2 min-h-8 flex items-center justify-between gap-1 px-1 text-[11px] font-bold leading-tight" style={{ color: '#FDE08D' }}>
                      <span className="line-clamp-2">{template.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#F5C451]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: '1px solid rgba(229, 184, 75, 0.3)' }}>
          <PageDesignControls
            project={project}
            visualTemplate={activeTemplate}
            fontFamily={selectedFont}
            onUpdateProject={onUpdateProject}
            onBeforeChange={onBeforeChange}
            notify={notify}
          />
        </div>
      </div>
    </details>
  );
}
