import React from 'react';
import {
  blockStyleFor,
  getOrnament,
  getPageBorderStyle,
  headingTreatment,
  pageNumberLabel,
  pageTextureStyle,
  resolveEdgePattern,
  withAlpha,
  SCROLL_CORNER
} from '../data/designSystem';
import { SCROLL_CORNER_ROTATIONS } from '../data/borderOrnaments';

function layerColor(role, design) {
  switch (role) {
    case 'pageText':
      return design.pageText;
    case 'accent':
      return design.accentInk || design.accentColor;
    case 'matte':
      return design.matteColor;
    case 'border':
    default:
      return design.borderInk || design.borderColor;
  }
}

/**
 * Printed scroll-work in one corner of the page.
 *
 * Drawn as vector paths rather than a typed glyph, so the curls stay crisp at
 * every size — in the design swatch, on the studio page and in the PDF.
 */
function ScrollCorner({ color, size, opacity = 1, rotate = 0, style = {} }) {
  return (
    <svg
      viewBox={SCROLL_CORNER.viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      data-border-scroll={rotate}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        transform: `rotate(${rotate}deg)`,
        transformOrigin: 'center',
        color,
        ...style
      }}
    >
      {SCROLL_CORNER.paths.map((path, index) => (
        <path
          key={`scroll-path-${index}`}
          d={path.d}
          fill={path.fill ? color : 'none'}
          stroke={path.fill ? 'none' : color}
          strokeWidth={path.fill ? 0 : path.width}
          strokeLinecap="round"
          opacity={(path.opacity ?? 1) * opacity}
        />
      ))}
      {SCROLL_CORNER.circles.map((circle, index) => (
        <circle
          key={`scroll-circle-${index}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          fill={color}
          opacity={(circle.opacity ?? 1) * opacity}
        />
      ))}
    </svg>
  );
}

/** One edge dressed with a repeated printed motif (leaves, scallops, stars…). */
function EdgePattern({ layer, design, edge, artworkScale = 1 }) {
  const css = resolveEdgePattern(layer, design, edge, artworkScale);
  if (!css) return null;
  const inset = (layer.inset || 0) * artworkScale;
  const horizontal = edge === 'top' || edge === 'bottom';
  return (
    <span
      aria-hidden="true"
      data-border-pattern={`${layer.motif}:${edge}`}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        ...(horizontal
          ? { left: inset, right: inset, [edge]: inset, height: css.height }
          : { top: inset, bottom: inset, [edge]: inset, width: css.width }),
        backgroundImage: css.backgroundImage,
        backgroundRepeat: css.backgroundRepeat,
        backgroundSize: css.backgroundSize,
        backgroundPosition: css.backgroundPosition
      }}
    />
  );
}

/**
 * The page itself: template tint, typography and the chosen page border.
 *
 * Every decorative layer is absolutely positioned and pointer-events-none,
 * so it can never interfere with typing or with the exported page. Children
 * sit above the decoration on the template's own page tint.
 */
export function PageFrame({
  design,
  children,
  className = '',
  style = {},
  contentStyle = {},
  borderRadius,
  as: Tag = 'div',
  role,
  dataPageKind,
  artworkScale = 1,
  'aria-label': ariaLabel
}) {
  const safeDesign = design || {};
  const border = getPageBorderStyle(safeDesign.pageBorderId);
  const pageBg = safeDesign.pageBg || '#FFFFFF';
  const radius = borderRadius ?? (
    border.id === 'soft-rounded' || border.id === 'arch-window' ? 24 : 4
  );
  const layers = border.layers || [];
  const texture = pageTextureStyle(safeDesign);

  return (
    <Tag
      className={`relative overflow-hidden ${className}`}
      role={role}
      aria-label={ariaLabel}
      data-page-border={border.id}
      data-page-texture={safeDesign.pageTextureId || 'none'}
      data-page-kind={dataPageKind}
      style={{
        backgroundColor: pageBg,
        color: safeDesign.bodyText || safeDesign.pageText || '#1F2937',
        fontFamily: safeDesign.fontStack || undefined,
        borderRadius: radius,
        ...style
      }}
    >
      {/* Aged-paper decoration sits under the page border and the words. */}
      {texture ? <span aria-hidden="true" style={texture} data-page-paper="true" /> : null}
      {layers.map((layer, index) => {
        const key = `layer-${index}`;
        const color = layerColor(layer.color, safeDesign);
        if (layer.kind === 'border') {
          return (
            <span
              key={key}
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: layer.inset,
                border: `${layer.width}px ${layer.style} ${color}`,
                borderRadius: layer.radius,
                opacity: layer.opacity ?? 1,
                pointerEvents: 'none'
              }}
            />
          );
        }
        if (layer.kind === 'corners') {
          const corners = [
            { top: layer.inset, left: layer.inset },
            { top: layer.inset, right: layer.inset },
            { bottom: layer.inset, left: layer.inset },
            { bottom: layer.inset, right: layer.inset }
          ];
          return corners.map((position, cornerIndex) => (
            <span
              key={`${key}-${cornerIndex}`}
              aria-hidden="true"
              style={{
                position: 'absolute',
                ...position,
                color,
                fontSize: layer.size,
                lineHeight: 1,
                pointerEvents: 'none'
              }}
            >
              {layer.glyph}
            </span>
          ));
        }
        if (layer.kind === 'band') {
          const edgeStyle = layer.edge === 'top'
            ? { top: 0, height: layer.thickness }
            : { bottom: 0, height: layer.thickness };
          return (
            <span
              key={key}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                background: color,
                ...edgeStyle,
                pointerEvents: 'none'
              }}
            />
          );
        }
        if (layer.kind === 'scroll') {
          const size = (layer.size || 64) * artworkScale;
          const inset = layer.inset || 0;
          return SCROLL_CORNER_ROTATIONS.map((corner) => (
            <ScrollCorner
              key={`${key}-${corner.key}`}
              color={color}
              size={size}
              opacity={layer.opacity ?? 1}
              rotate={corner.rotate}
              style={{
                ...(corner.top !== undefined ? { top: inset } : { bottom: inset }),
                ...(corner.left !== undefined ? { left: inset } : { right: inset })
              }}
            />
          ));
        }
        if (layer.kind === 'pattern') {
          const edges = layer.edges || ['top', 'bottom'];
          return edges.map((edge) => (
            <EdgePattern
              key={`${key}-${edge}`}
              layer={layer}
              design={safeDesign}
              edge={edge}
              artworkScale={artworkScale}
            />
          ));
        }
        if (layer.kind === 'cartouche') {
          const edgeStyle = layer.edge === 'top'
            ? { top: layer.size ? 6 : 0 }
            : { bottom: 6 };
          return (
            <span
              key={key}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                background: pageBg,
                color,
                fontSize: layer.size,
                lineHeight: 1,
                padding: '0 5px',
                pointerEvents: 'none',
                ...edgeStyle
              }}
            >
              {layer.glyph}
            </span>
          );
        }
        return null;
      })}
      <div className="relative" style={contentStyle}>{children}</div>
    </Tag>
  );
}

/** A small rule with the template's ornament in the middle. */
export function OrnamentDivider({ design, color, width = 150, className = '', opacity = 0.75 }) {
  const ornament = getOrnament(design?.ornamentId);
  const ink = color || design?.borderInk || design?.borderColor || '#8F6534';
  if (!ornament.glyph) {
    return (
      <div className={className} aria-hidden="true">
        <span style={{ display: 'block', height: 1, width, margin: '0 auto', background: withAlpha(ink, opacity) }} />
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} aria-hidden="true">
      <span style={{ display: 'block', height: 1, width: width * 0.42, background: withAlpha(ink, opacity) }} />
      <span style={{ color: ink, fontSize: 13, lineHeight: 1, letterSpacing: '0.12em' }}>{ornament.glyph}</span>
      <span style={{ display: 'block', height: 1, width: width * 0.42, background: withAlpha(ink, opacity) }} />
    </div>
  );
}

/**
 * The page heading: kicker, title treatment and rule.
 *
 * `title` and `subtitle` are nodes so the writing studio can place its
 * editable blocks inside the exact same decoration as the published page.
 */
export function PageTitleFrame({
  design,
  kickerText,
  pageLabel,
  title,
  subtitle,
  headingStyleId,
  className = ''
}) {
  const treatment = headingTreatment(design, { headingStyleId });
  const ornament = getOrnament(design?.ornamentId);
  const borderInk = design?.borderInk || design?.borderColor || '#8F6534';

  const kicker = design?.kicker && kickerText ? (
    <div
      className="mb-1.5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]"
      style={{ color: treatment.kickerColor }}
      data-page-kicker="true"
    >
      <span aria-hidden="true" style={{ width: 18, height: 1, background: withAlpha(treatment.kickerColor, 0.6) }} />
      <span>{kickerText}</span>
      <span aria-hidden="true" style={{ width: 18, height: 1, background: withAlpha(treatment.kickerColor, 0.6) }} />
    </div>
  ) : null;

  const rule = treatment.styleId === 'centered-rule' || treatment.styleId === 'kicker-overline' ? (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: '36%',
        maxWidth: 210,
        height: 2,
        margin: '0.55rem auto 0',
        background: withAlpha(treatment.dividerColor, 0.85)
      }}
    />
  ) : null;

  const heading = (
    <div style={treatment.wrapperStyle} className={treatment.align === 'center' ? 'mx-auto text-center' : 'text-left'}>
      {kicker}
      <div
        style={{
          ...treatment.titleStyle,
          fontSize: treatment.titleSize,
          textTransform: treatment.titleTransform,
          lineHeight: 1.15
        }}
      >
        {title}
      </div>
      {rule}
      {treatment.styleId !== 'masthead' && treatment.styleId !== 'minimal-caps' && design?.kicker ? (
        <OrnamentDivider design={design} width={120} className="mt-2" />
      ) : null}
    </div>
  );

  return (
    <header
      className={`relative mb-4 ${className}`}
      data-heading-style={treatment.styleId}
      style={
        treatment.bandStyle
          ? { ...treatment.bandStyle, textAlign: treatment.align }
          : {
              textAlign: treatment.align,
              borderBottom: treatment.styleId === 'kicker-overline' || treatment.styleId === 'centered-rule'
                ? 'none'
                : undefined
            }
      }
    >
      {treatment.styleId === 'masthead' ? (
        <div
          className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-[10px] font-extrabold uppercase tracking-[0.3em]"
          style={{ color: borderInk }}
        >
          <span className="truncate">{pageLabel || design?.templateName || ''}</span>
          {ornament.glyph ? <span aria-hidden="true" style={{ color: design?.accentInk }}>{ornament.glyph}</span> : null}
        </div>
      ) : null}
      {heading}
      {subtitle}
    </header>
  );
}

/** A bordered text block using the chosen block treatment. */
export function BlockFrame({
  design,
  children,
  className = '',
  style = {},
  radius,
  as: Tag = 'section',
  ...rest
}) {
  const css = blockStyleFor(design, { radius });
  return (
    <Tag
      className={`overflow-hidden ${className}`}
      data-block-border={design?.blockBorderId || 'hairline'}
      data-block-fill={design?.blockFillId || 'auto'}
      data-block-depth={design?.blockDepthId || 'soft'}
      style={{ ...css, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Small caps label used above blocks and on the running head. */
export function Kicker({ design, children, color, className = '' }) {
  return (
    <div
      className={`text-[9px] font-extrabold uppercase tracking-[0.2em] ${className}`}
      style={{ color: color || design?.borderInk || design?.borderColor }}
    >
      {children}
    </div>
  );
}

/** The foot of the page: an ornamented page number ("— 1 —" / "— I —"). */
export function PageNumberLine({ design, pageIndex, label, className = '' }) {
  const text = label !== undefined ? label : pageNumberLabel(pageIndex, design);
  if (!text) return null;
  // Some templates number their pages like a printed book: "— Page I —".
  const word = typeof design?.pageNumberWord === 'string' ? design.pageNumberWord.trim() : '';
  const spoken = word ? `${word} ${text}` : text;
  const ornament = getOrnament(design?.ornamentId);
  return (
    <div
      className={`flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] sm:text-xs ${className}`}
      style={{ color: design?.borderInk || design?.borderColor || '#8F6534' }}
      data-page-number={spoken}
    >
      <span>{`— ${spoken} —`}</span>
      {ornament.glyph && ornament.id !== 'rule' && ornament.id !== 'dots' ? (
        <span aria-hidden="true" style={{ opacity: 0.8 }}>{ornament.glyph}</span>
      ) : null}
    </div>
  );
}

/** A miniature of a page border, used by the design chooser. */
export function BorderSwatch({ design, selected = false, height = 56, className = '' }) {
  const preview = {
    ...design,
    pageBorderId: design.pageBorderId
  };
  return (
    <span className={`block w-full ${className}`} style={{ height }} aria-hidden="true">
      <PageFrame
        design={preview}
        artworkScale={0.34}
        style={{ height: '100%', width: '100%', border: selected ? '2px solid #FDE08D' : '1px solid rgba(229,184,75,0.45)' }}
        contentStyle={{ height: '100%' }}
        borderRadius={4}
      />
    </span>
  );
}

/** A miniature of a text-block treatment, used by the design chooser. */
export function BlockSwatch({ design, selected = false, height = 44, radius = 6 }) {
  const css = blockStyleFor(design, { radius });
  return (
    <span
      aria-hidden="true"
      className="block w-full"
      style={{
        height,
        ...css,
        borderColor: selected ? '#FDE08D' : css.borderColor,
        boxShadow: selected ? '0 0 0 2px rgba(253,224,141,0.55)' : css.boxShadow,
        backgroundColor: css.backgroundColor || design?.pageBg
      }}
    />
  );
}
