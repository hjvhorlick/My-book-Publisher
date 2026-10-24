import React, { useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, Palette, RotateCcw, Sparkles } from 'lucide-react';
import {
  PAGE_BORDER_STYLES,
  BLOCK_BORDER_STYLES,
  HEADING_STYLES,
  ORNAMENTS,
  DESIGN_PRESETS,
  PAGE_NUMBER_FORMATS,
  BLOCK_FILLS,
  BLOCK_DEPTHS,
  PAGE_TEXTURES,
  BLOCK_PLACEMENTS,
  borderColorChoices,
  resolveTemplateDesign
} from '../data/designSystem';
import { BorderSwatch, BlockSwatch } from './DesignFrame';

const LABEL_INK = '#F5C451';
const HELPER_INK = '#F3D78B';
const CARD_STYLE = {
  borderRadius: 14,
  border: '1px solid rgba(229, 184, 75, 0.35)',
  background: 'rgba(6, 17, 40, 0.55)'
};

/**
 * Creative design controls for the printed page.
 *
 * This is where the author chooses the page border, the border colour, the
 * text-block border, the heading treatment, the ornament and the page
 * furniture (drop cap, kicker, page numbers). Every choice renders live in
 * the swatches and saves to `project.coverConfig.design`, which the page
 * renderer, the Introduction page, the preview and the export reader all read
 * through `resolveTemplateDesign`.
 */
export default function PageDesignControls({
  project,
  visualTemplate,
  fontFamily = '',
  onUpdateProject,
  onBeforeChange,
  notify = () => {}
}) {
  const saved = project?.coverConfig?.design || {};
  const [overrides, setOverrides] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOverrides(project?.coverConfig?.design || {});
  }, [project?.id, project?.coverConfig?.design]);

  const design = useMemo(
    () => resolveTemplateDesign(visualTemplate, overrides, {
      fontFamily: fontFamily || project?.coverConfig?.fontFamily || visualTemplate?.fontFamily
    }),
    [visualTemplate, overrides, fontFamily, project?.coverConfig?.fontFamily]
  );

  const swatches = useMemo(() => borderColorChoices(visualTemplate), [visualTemplate]);

  const persist = async (next) => {
    if (!onUpdateProject) return;
    setSaving(true);
    setError('');
    try {
      await onBeforeChange?.();
      await onUpdateProject({
        coverConfig: {
          ...(project?.coverConfig || {}),
          design: next
        }
      });
      notify?.('Saved your page design.');
    } catch (saveError) {
      setError(saveError?.message || 'Could not save this design choice. Please try again.');
      notify?.(saveError?.message || 'Could not save this design choice. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const apply = (patch) => {
    const next = { ...overrides, ...patch };
    setOverrides(next);
    void persist(next);
  };

  const applyPreset = (preset) => {
    const next = {
      ...preset.design,
      // Keep any colours the author already chose — a preset changes the
      // decoration, not the palette.
      ...(overrides.borderColor ? { borderColor: overrides.borderColor } : {}),
      ...(overrides.blockColor ? { blockColor: overrides.blockColor } : {}),
      presetId: preset.id
    };
    setOverrides(next);
    void persist(next);
  };

  const reset = () => {
    setOverrides({});
    void persist({});
  };

  const preview = (patch) => resolveTemplateDesign(visualTemplate, { ...overrides, ...patch }, {
    fontFamily: fontFamily || project?.coverConfig?.fontFamily || visualTemplate?.fontFamily
  });

  const optionButton = ({ selected, onClick, label, children, height = 'auto' }) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      disabled={saving}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className="min-w-0 rounded-xl p-1 text-left transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE08D]"
      style={{
        background: selected ? 'rgba(253, 224, 141, 0.16)' : 'rgba(6, 17, 40, 0.7)',
        border: selected ? '2px solid #FDE08D' : '1px solid rgba(229, 184, 75, 0.35)',
        minHeight: height
      }}
    >
      {children}
    </button>
  );

  const sectionTitle = (text, hint) => (
    <div className="mb-2">
      <h4 className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: LABEL_INK }}>{text}</h4>
      {hint ? <p className="mt-0.5 text-[11px]" style={{ color: HELPER_INK }}>{hint}</p> : null}
    </div>
  );

  return (
    <div className="space-y-5" aria-label="Page design controls">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: '#FDE08D' }}>
          <Palette className="h-4 w-4" aria-hidden="true" />
          Page design · borders, blocks &amp; ornaments
        </div>
        <div className="flex items-center gap-2">
          {saving ? (
            <span role="status" className="inline-flex items-center gap-1 text-[11px]" style={{ color: HELPER_INK }}>
              <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: HELPER_INK }}>
              <Check className="h-3 w-3" aria-hidden="true" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={reset}
            disabled={saving || !Object.keys(overrides).length}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[11px] font-bold disabled:opacity-40"
            style={{ background: 'rgba(6, 17, 40, 0.85)', color: HELPER_INK, border: '1px solid rgba(229, 184, 75, 0.5)' }}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Use template design
          </button>
        </div>
      </div>

      {/* One-tap creative directions */}
      <section style={{ ...CARD_STYLE, padding: 14 }}>
        {sectionTitle('Creative directions', 'A whole page design in one tap — then fine-tune it below.')}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DESIGN_PRESETS.map((preset) => {
            const presetDesign = preview(preset.design);
            const selected = overrides.presetId === preset.id;
            return optionButton({
              selected,
              onClick: () => applyPreset(preset),
              label: `Apply the ${preset.name} page design`,
              children: (
                <span className="block">
                  <BorderSwatch design={presetDesign} selected={selected} height={44} />
                  <span className="mt-1 block text-[11px] font-bold leading-tight" style={{ color: '#FDE08D' }}>
                    <Sparkles className="mr-1 inline h-3 w-3 text-[#F5C451]" aria-hidden="true" />
                    {preset.name}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] leading-tight" style={{ color: HELPER_INK }}>
                    {preset.blurb}
                  </span>
                </span>
              )
            });
          })}
        </div>
      </section>

      {/* Page border style */}
      <section style={{ ...CARD_STYLE, padding: 14 }}>
        {sectionTitle('Page border', 'The decorative frame around every page.')}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {PAGE_BORDER_STYLES.map((style) => {
            const selected = design.pageBorderId === style.id;
            return optionButton({
              selected,
              onClick: () => apply({ pageBorderId: style.id }),
              label: `Page border: ${style.name}`,
              children: (
                <span className="block">
                  <BorderSwatch design={preview({ pageBorderId: style.id })} selected={selected} height={40} />
                  <span className="mt-1 block truncate text-[10px] font-bold" style={{ color: '#FDE08D' }}>{style.name}</span>
                </span>
              )
            });
          })}
        </div>
      </section>

      {/* Colours */}
      <section style={{ ...CARD_STYLE, padding: 14 }}>
        {sectionTitle('Border colour', 'Pick a colour that suits your book, or match the template.')}
        <div role="radiogroup" aria-label="Page border colour" className="flex flex-wrap gap-2">
          {swatches.map((swatch) => {
            const selected = String(design.borderColor).toUpperCase() === String(swatch.value).toUpperCase();
            return (
              <button
                key={`${swatch.label}-${swatch.value}`}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Page border colour: ${swatch.label}`}
                title={`${swatch.label} (${swatch.value})`}
                disabled={saving}
                onClick={() => apply({ borderColor: swatch.value })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                style={{
                  background: 'rgba(6, 17, 40, 0.8)',
                  color: '#FDE08D',
                  border: selected ? '2px solid #FDE08D' : '1px solid rgba(229, 184, 75, 0.4)'
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: swatch.value,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)'
                  }}
                />
                {swatch.label}
              </button>
            );
          })}
          <label
            className="inline-flex min-h-9 items-center gap-2 rounded-full px-2 py-1 text-[10px] font-bold"
            style={{ background: 'rgba(6, 17, 40, 0.8)', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.4)' }}
          >
            Custom
            <input
              type="color"
              aria-label="Custom page border colour"
              value={design.borderColor}
              onChange={(event) => apply({ borderColor: event.target.value })}
              className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
        </div>

        <div className="mt-4">
          {sectionTitle('Text-block colour', 'The border around the boxes that hold your words.')}
          <div role="radiogroup" aria-label="Text-block border colour" className="flex flex-wrap gap-2">
            {swatches.map((swatch) => {
              const selected = String(design.blockColor).toUpperCase() === String(swatch.value).toUpperCase();
              return (
                <button
                  key={`block-${swatch.label}-${swatch.value}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Text-block colour: ${swatch.label}`}
                  disabled={saving}
                  onClick={() => apply({ blockColor: swatch.value })}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                  style={{
                    background: 'rgba(6, 17, 40, 0.8)',
                    color: '#FDE08D',
                    border: selected ? '2px solid #FDE08D' : '1px solid rgba(229, 184, 75, 0.4)'
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      background: swatch.value,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)'
                    }}
                  />
                  {swatch.label}
                </button>
              );
            })}
            <label
              className="inline-flex min-h-9 items-center gap-2 rounded-full px-2 py-1 text-[10px] font-bold"
              style={{ background: 'rgba(6, 17, 40, 0.8)', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.4)' }}
            >
              Custom
              <input
                type="color"
                aria-label="Custom text-block border colour"
                value={design.blockColor}
                onChange={(event) => apply({ blockColor: event.target.value })}
                className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Text block border style */}
      <section style={{ ...CARD_STYLE, padding: 14 }}>
        {sectionTitle('Text blocks', 'How the bordered boxes around your words are drawn.')}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {BLOCK_BORDER_STYLES.map((style) => {
            const selected = design.blockBorderId === style.id;
            return optionButton({
              selected,
              onClick: () => apply({ blockBorderId: style.id }),
              label: `Text-block border: ${style.name}`,
              children: (
                <span className="block">
                  <BlockSwatch design={preview({ blockBorderId: style.id })} selected={selected} height={34} />
                  <span className="mt-1 block truncate text-[10px] font-bold" style={{ color: '#FDE08D' }}>{style.name}</span>
                </span>
              )
            });
          })}
        </div>
      </section>

      {/* Block colour, depth and placement */}
      <section style={{ ...CARD_STYLE, padding: 14 }}>
        {sectionTitle('Text-block colour & depth', 'Fill the boxes behind your words and lift them off the page.')}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: HELPER_INK }}>Block colour</span>
            <select
              aria-label="Text-block fill"
              value={design.blockFillId}
              disabled={saving}
              onChange={(event) => apply({ blockFillId: event.target.value })}
              className="min-h-10 w-full rounded-xl px-3 text-sm font-semibold"
              style={{ background: '#FFFDF7', color: '#0F172A', border: '1.5px solid rgba(229, 184, 75, 0.7)' }}
            >
              {BLOCK_FILLS.map((fill) => (
                <option key={fill.id} value={fill.id}>{fill.name}</option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] leading-snug" style={{ color: HELPER_INK }}>
              {BLOCK_FILLS.find((fill) => fill.id === design.blockFillId)?.blurb}
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: HELPER_INK }}>Block depth</span>
            <select
              aria-label="Text-block depth"
              value={design.blockDepthId}
              disabled={saving}
              onChange={(event) => apply({ blockDepthId: event.target.value })}
              className="min-h-10 w-full rounded-xl px-3 text-sm font-semibold"
              style={{ background: '#FFFDF7', color: '#0F172A', border: '1.5px solid rgba(229, 184, 75, 0.7)' }}
            >
              {BLOCK_DEPTHS.map((depth) => (
                <option key={depth.id} value={depth.id}>{depth.name}</option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] leading-snug" style={{ color: HELPER_INK }}>
              {BLOCK_DEPTHS.find((depth) => depth.id === design.blockDepthId)?.blurb}
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: HELPER_INK }}>Block placement</span>
            <select
              aria-label="Text-block placement"
              value={design.blockOverlap}
              disabled={saving}
              onChange={(event) => apply({ blockOverlap: event.target.value })}
              className="min-h-10 w-full rounded-xl px-3 text-sm font-semibold"
              style={{ background: '#FFFDF7', color: '#0F172A', border: '1.5px solid rgba(229, 184, 75, 0.7)' }}
            >
              {BLOCK_PLACEMENTS.map((placement) => (
                <option key={placement.id} value={placement.id}>{placement.name}</option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] leading-snug" style={{ color: HELPER_INK }}>
              {BLOCK_PLACEMENTS.find((placement) => placement.id === design.blockOverlap)?.blurb}
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: HELPER_INK }}>Paper</span>
            <select
              aria-label="Page paper texture"
              value={design.pageTextureId}
              disabled={saving}
              onChange={(event) => apply({ pageTextureId: event.target.value })}
              className="min-h-10 w-full rounded-xl px-3 text-sm font-semibold"
              style={{ background: '#FFFDF7', color: '#0F172A', border: '1.5px solid rgba(229, 184, 75, 0.7)' }}
            >
              {PAGE_TEXTURES.map((texture) => (
                <option key={texture.id} value={texture.id}>{texture.name}</option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] leading-snug" style={{ color: HELPER_INK }}>
              {PAGE_TEXTURES.find((texture) => texture.id === design.pageTextureId)?.blurb}
            </span>
          </label>
        </div>
      </section>

      {/* Heading + ornament */}
      <section style={{ ...CARD_STYLE, padding: 14 }}>
        {sectionTitle('Heading & ornament', 'The page title treatment and the marks between sections.')}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: HELPER_INK }}>Heading style</span>
            <select
              aria-label="Page heading style"
              value={design.headingStyleId}
              disabled={saving}
              onChange={(event) => apply({ headingStyleId: event.target.value })}
              className="min-h-10 w-full rounded-xl px-3 text-sm font-semibold"
              style={{ background: '#FFFDF7', color: '#0F172A', border: '1.5px solid rgba(229, 184, 75, 0.7)' }}
            >
              {HEADING_STYLES.map((style) => (
                <option key={style.id} value={style.id}>{style.name} — {style.blurb}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: HELPER_INK }}>Ornament</span>
            <select
              aria-label="Page ornament"
              value={design.ornamentId}
              disabled={saving}
              onChange={(event) => apply({ ornamentId: event.target.value })}
              className="min-h-10 w-full rounded-xl px-3 text-sm font-semibold"
              style={{ background: '#FFFDF7', color: '#0F172A', border: '1.5px solid rgba(229, 184, 75, 0.7)' }}
            >
              {ORNAMENTS.map((ornament) => (
                <option key={ornament.id} value={ornament.id}>{ornament.glyph ? `${ornament.glyph}  ` : ''}{ornament.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold" style={{ background: 'rgba(6, 17, 40, 0.8)', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.4)' }}>
              <input
                type="checkbox"
                checked={Boolean(design.dropCap)}
                onChange={(event) => apply({ dropCap: event.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Drop cap
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold" style={{ background: 'rgba(6, 17, 40, 0.8)', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.4)' }}>
              <input
                type="checkbox"
                aria-label="Illuminated drop cap"
                checked={design.dropCapStyle === 'boxed'}
                disabled={!design.dropCap || saving}
                onChange={(event) => apply({ dropCapStyle: event.target.checked ? 'boxed' : 'plain' })}
                className="h-4 w-4 accent-amber-500"
              />
              Illuminated initial
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold" style={{ background: 'rgba(6, 17, 40, 0.8)', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.4)' }}>
              <input
                type="checkbox"
                checked={Boolean(design.kicker)}
                onChange={(event) => apply({ kicker: event.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Kicker line
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: HELPER_INK }}>Page numbers</span>
            <select
              aria-label="Page number style"
              value={design.pageNumbers}
              disabled={saving}
              onChange={(event) => apply({ pageNumbers: event.target.value })}
              className="min-h-9 rounded-xl px-3 text-xs font-semibold"
              style={{ background: '#FFFDF7', color: '#0F172A', border: '1.5px solid rgba(229, 184, 75, 0.7)' }}
            >
              {PAGE_NUMBER_FORMATS.map((format) => (
                <option key={format.id} value={format.id}>{format.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: HELPER_INK }}>Number wording</span>
            <select
              aria-label="Page number wording"
              value={design.pageNumberWord || ''}
              disabled={saving}
              onChange={(event) => apply({ pageNumberWord: event.target.value })}
              className="min-h-9 rounded-xl px-3 text-xs font-semibold"
              style={{ background: '#FFFDF7', color: '#0F172A', border: '1.5px solid rgba(229, 184, 75, 0.7)' }}
            >
              <option value="">Number only (— 1 —)</option>
              <option value="Page">Page (— Page 1 —)</option>
              <option value="p.">Short (— p. 1 —)</option>
            </select>
          </label>
        </div>
      </section>

      {error ? <p role="alert" className="text-xs text-rose-200">{error}</p> : null}
      <p className="text-[11px]" style={{ color: HELPER_INK }}>
        Your choice applies to every chapter page and to the Introduction page. Text colours are always checked for
        readability, so a border colour can never make your words faint.
      </p>
    </div>
  );
}
