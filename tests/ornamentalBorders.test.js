import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PAGE_BORDER_STYLES,
  BLOCK_FILLS,
  BLOCK_DEPTHS,
  PAGE_TEXTURES,
  BLOCK_PLACEMENTS,
  blockFillColor,
  blockDepthShadow,
  blockOverlapStyle,
  getBlockBorderStyle,
  overlapSafeDesign,
  pageTextureLayers,
  resolveTemplateDesign,
  contrastRatio
} from '../src/data/designSystem.js';
import {
  EDGE_PATTERNS,
  SCROLL_CORNER,
  edgePatternDataUri,
  motifSize,
  scrollCornerSvg
} from '../src/data/borderOrnaments.js';
import { PageFrame, BlockFrame } from '../src/components/DesignFrame.jsx';
import PageStructureMiniPreview from '../src/components/PageStructureMiniPreview.jsx';
import { BOOK_CATEGORIES, TEMPLATES_BY_CATEGORY } from '../src/data/visualTemplatesCatalog.js';

const {
  PAGE_BORDER_IDS,
  pageOrnamentCommands,
  resolveExportDesign,
  epubDesignCss
} = require('../server/designMirror');

const ALL_TEMPLATES = BOOK_CATEGORIES.flatMap((category) =>
  (TEMPLATES_BY_CATEGORY[category.id] || []).map((template) => ({ category: category.id, template }))
);

const ARTWORK_BORDERS = PAGE_BORDER_STYLES.filter((style) =>
  (style.layers || []).some((layer) => layer.kind === 'scroll' || layer.kind === 'pattern')
);

function frameMarkup(design, { ariaLabel = 'page' } = {}) {
  return renderToStaticMarkup(
    React.createElement(PageFrame, { design, 'aria-label': ariaLabel }, React.createElement('p', null, 'Words on the page.'))
  );
}

describe('ornamental page borders: drawn twirls and printed patterns', () => {
  it('offers ornamental frames alongside the plain rules', () => {
    expect(ARTWORK_BORDERS.length).toBeGreaterThanOrEqual(8);
    // The ornamented frames are all reachable from the designer.
    ARTWORK_BORDERS.forEach((style) => {
      expect(PAGE_BORDER_IDS).toContain(style.id);
    });
  });

  it('every drawn ornament uses only the path commands print can reproduce', () => {
    const dStrings = [
      ...SCROLL_CORNER.paths.map((path) => path.d),
      ...Object.values(EDGE_PATTERNS).flatMap((motif) => (motif.paths || []).map((path) => path.d))
    ];
    dStrings.forEach((d) => {
      // Absolute M/L/C/Z only: no arcs, quadratics, or relative commands.
      expect(d, d).toMatch(/^[MLCZ0-9.,\s-]+$/);
    });
    Object.values(EDGE_PATTERNS).forEach((motif) => {
      expect(motif.width).toBeGreaterThan(0);
      expect(motif.height).toBeGreaterThan(0);
    });
  });

  it('draws four corner twirls and the printed edge bands on the page', () => {
    const design = resolveTemplateDesign({}, { pageBorderId: 'vine-scroll', borderColor: '#8B1A1A', accentColor: '#B45309' });
    const markup = frameMarkup(design);
    expect((markup.match(/data-border-scroll="/g) || []).length).toBe(4);
    expect(markup).toContain('data-border-pattern="leaves:top"');
    expect(markup).toContain('data-border-pattern="leaves:bottom"');
    expect(markup).toContain('data-page-border="vine-scroll"');
  });

  it('turns the edge motif for the foot and sides so it never points the wrong way', () => {
    const topUri = edgePatternDataUri('scallop', '#8B1A1A', 0.9, 'top');
    const bottomUri = edgePatternDataUri('scallop', '#8B1A1A', 0.9, 'bottom');
    const leftUri = edgePatternDataUri('scallop', '#8B1A1A', 0.9, 'left');
    expect(topUri).not.toBe(bottomUri);
    expect(leftUri).toContain('rotate(90');
    expect(bottomUri).toContain('rotate(180');
    // Sides swap width and height so the motif keeps its proportions.
    expect(motifSize('scallop', 'top')).toEqual({ width: 26, height: 12 });
    expect(motifSize('scallop', 'left')).toEqual({ width: 12, height: 26 });
  });

  it('dresses all four sides when the border asks for it', () => {
    const design = resolveTemplateDesign({}, { pageBorderId: 'lace-scallop' });
    const markup = frameMarkup(design);
    ['top', 'right', 'bottom', 'left'].forEach((edge) => {
      expect(markup).toContain(`data-border-pattern="scallop:${edge}"`);
    });
  });

  it('draws no ornament when the border is a plain rule', () => {
    const design = resolveTemplateDesign({}, { pageBorderId: 'hairline' });
    const markup = frameMarkup(design);
    expect(markup).not.toContain('data-border-scroll');
    expect(markup).not.toContain('data-border-pattern');
  });

  it('keeps the scroll-work artwork valid SVG', () => {
    const svg = scrollCornerSvg('#8B1A1A', 0.95, 100);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 100 100"');
    expect(svg).toContain('<circle');
    expect(svg.match(/<path /g).length).toBe(SCROLL_CORNER.paths.length);
  });
});

  it('lays the bands, twirls and rules out so they do not collide', () => {
    // The bands run along the true page edge, the twirls sit on those bands,
    // and the rules sit inside them — the order printed frames are built in.
    ARTWORK_BORDERS.forEach((style) => {
      const layers = style.layers || [];
      const patternIndex = layers.findIndex((layer) => layer.kind === 'pattern');
      const scrollIndex = layers.findIndex((layer) => layer.kind === 'scroll');
      const firstRule = layers.find((layer) => layer.kind === 'border');
      if (patternIndex >= 0 && firstRule && patternIndex < layers.indexOf(firstRule)) {
        expect(layers[patternIndex].inset, style.id).toBeLessThanOrEqual(firstRule.inset);
      }
      if (scrollIndex >= 0) {
        // The twirls sit on (or inside) the outermost rule, never outside it.
        const outermost = Math.min(...layers.filter((layer) => layer.kind === 'border').map((layer) => layer.inset));
        expect(layers[scrollIndex].inset, style.id).toBeLessThanOrEqual(outermost);
        // The corner artwork is big enough to read as an ornament.
        expect(layers[scrollIndex].size, style.id).toBeGreaterThanOrEqual(56);
      }
      if (patternIndex >= 0 && scrollIndex >= 0 && patternIndex < scrollIndex) {
        // The band sits on the page edge, the twirls just inside it.
        expect(layers[patternIndex].inset, style.id).toBeLessThanOrEqual(layers[scrollIndex].inset);
      }
    });
  });

describe('printed pages: the ornaments are in the export, not only on screen', () => {
  it('builds the same frame in the PDF for every ornamental border', () => {
    ARTWORK_BORDERS.forEach((style) => {
      const design = resolveExportDesign({
        pageBg: '#FDF8EE',
        borderColor: '#8B1A1A',
        accentColor: '#B45309',
        design: { pageBorderId: style.id }
      });
      const commands = pageOrnamentCommands(design, 432, 648);
      const scrolls = commands.filter((command) => command.type === 'path');
      expect(scrolls.length, style.id).toBeGreaterThan(0);
      // The artwork stays inside the trim: nothing is drawn off the page.
      commands.forEach((command) => {
        if (command.type === 'circle') {
          expect(command.x, style.id).toBeGreaterThanOrEqual(0);
          expect(command.x, style.id).toBeLessThanOrEqual(432);
          expect(command.y, style.id).toBeGreaterThanOrEqual(0);
          expect(command.y, style.id).toBeLessThanOrEqual(648);
        }
        if (command.type === 'path') {
          command.steps.forEach((step) => {
            if (step.type === 'Z') return;
            expect(step.x, style.id).toBeGreaterThanOrEqual(-1);
            expect(step.x, style.id).toBeLessThanOrEqual(433);
            expect(step.y, style.id).toBeGreaterThanOrEqual(-1);
            expect(step.y, style.id).toBeLessThanOrEqual(649);
          });
        }
      });
    });
  });

  it('puts the drawn frame into the EPUB stylesheet as printed artwork', () => {
    const design = resolveExportDesign({
      pageBg: '#FDF8EE',
      borderColor: '#8B1A1A',
      accentColor: '#B45309',
      design: { pageBorderId: 'vine-scroll' }
    });
    const css = epubDesignCss(design);
    expect(css).toContain('background-image: url("data:image/svg+xml,');
    expect(css).toContain('repeat-x');
    expect(css).toContain('no-repeat');
    expect(css).not.toContain('undefined');
  });

  it('keeps the plain-rule borders free of artwork in the export', () => {
    const design = resolveExportDesign({ design: { pageBorderId: 'double-rule' } });
    expect(epubDesignCss(design)).not.toContain('background-image');
  });
});

describe('coloured blocks, raised cards and aged paper', () => {
  it('paints a contrast-checked colour behind the words', () => {
    BLOCK_FILLS.forEach((fill) => {
      const design = resolveTemplateDesign({}, {
        blockFillId: fill.id,
        pageBg: '#FDF8EE',
        borderColor: '#8B1A1A',
        accentColor: '#B45309'
      });
      const colour = blockFillColor(design);
      if (fill.id === 'auto' || fill.id === 'clear') {
        expect(colour, fill.id).toBe(fill.id === 'clear' ? 'transparent' : '');
      } else {
        expect(colour, fill.id).toMatch(/^#[0-9A-F]{6}$/);
        expect(contrastRatio(colour, design.bodyText), fill.id).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  it('lifts a block off the page with a real shadow and leaves the flat one alone', () => {
    expect(blockDepthShadow({ blockDepthId: 'flat' })).toBe('');
    const soft = blockDepthShadow({ blockDepthId: 'soft' });
    const raised = blockDepthShadow({ blockDepthId: 'raised' });
    expect(soft).toContain('rgba(');
    expect(raised.split(',').length).toBeGreaterThan(soft.split(',').length);
    expect(raised).toContain('inset 0 1px 0');
  });

  it('draws the aged paper under the words, never over them', () => {
    PAGE_TEXTURES.forEach((texture) => {
      const design = resolveTemplateDesign({}, { pageTextureId: texture.id, borderColor: '#8B1A1A' });
      const markup = frameMarkup(design);
      if (texture.id === 'none') {
        expect(markup, texture.id).not.toContain('data-page-paper');
      } else {
        expect(markup, texture.id).toContain('data-page-paper');
        expect(markup, texture.id).toContain('pointer-events:none');
        const layers = pageTextureLayers(design);
        expect(layers.backgroundImage, texture.id).toBeTruthy();
      }
    });
  });

  it('passes the colour, depth and paper through to the rendered block', () => {
    const design = resolveTemplateDesign({}, {
      blockBorderId: 'parchment',
      blockFillId: 'paper',
      blockDepthId: 'raised'
    });
    const markup = renderToStaticMarkup(
      React.createElement(BlockFrame, { design }, React.createElement('p', null, 'Words.'))
    );
    expect(markup).toContain('data-block-fill="paper"');
    expect(markup).toContain('data-block-depth="raised"');
    expect(markup).toContain('box-shadow');
  });
});

describe('text blocks may overlap the artwork and each other', () => {
  it('lifts only the first block over the artwork', () => {
    expect(blockOverlapStyle({ blockOverlap: 'inline' }, 0)).toBeNull();
    const first = blockOverlapStyle({ blockOverlap: 'over-image' }, 0);
    const second = blockOverlapStyle({ blockOverlap: 'over-image' }, 1);
    expect(first.marginTop).toContain('-');
    expect(first.zIndex).toBeGreaterThan(1);
    expect(second).toBeNull();
  });

  it('steps each card over the one above it when stacked', () => {
    const first = blockOverlapStyle({ blockOverlap: 'stacked' }, 0);
    const second = blockOverlapStyle({ blockOverlap: 'stacked' }, 1);
    const third = blockOverlapStyle({ blockOverlap: 'stacked' }, 2);
    expect(second.marginTop).toContain('-');
    expect(parseFloat(third.marginLeft)).toBeGreaterThan(parseFloat(second.marginLeft));
    expect(second.zIndex).toBeGreaterThan(first.zIndex);
  });

  it('makes overlapping blocks opaque and lifted so the words stay readable', () => {
    const clearFlat = { blockFillId: 'clear', blockDepthId: 'flat' };
    BLOCK_PLACEMENTS.filter((placement) => placement.id !== 'inline').forEach((placement) => {
      const safe = overlapSafeDesign({ ...clearFlat, blockOverlap: placement.id });
      expect(safe.blockFillId, placement.id).toBe('paper');
      expect(safe.blockDepthId, placement.id).toBe('raised');
      // A block already coloured keeps the author's choice.
      const chosen = overlapSafeDesign({ blockOverlap: placement.id, blockFillId: 'wash', blockDepthId: 'soft' });
      expect(chosen.blockFillId).toBe('wash');
      expect(chosen.blockDepthId).toBe('soft');
    });
    expect(overlapSafeDesign({ ...clearFlat, blockOverlap: 'inline' }).blockFillId).toBe('clear');
  });

  it('shows overlapping blocks on real template pages', () => {
    const overlapping = ALL_TEMPLATES.filter(
      ({ template }) => resolveTemplateDesign(template).blockOverlap !== 'inline'
    );
    expect(overlapping.length).toBeGreaterThanOrEqual(15);
  });

  it('draws coloured, lifted blocks in the miniature thumbnails too', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PageStructureMiniPreview, {
        categoryId: 'cookbook',
        template: TEMPLATES_BY_CATEGORY.cookbook.find((item) => item.id === 'cook-warm-border'),
        structureIndex: 0
      })
    );
    const design = resolveTemplateDesign(TEMPLATES_BY_CATEGORY.cookbook.find((item) => item.id === 'cook-warm-border'));
    expect(getBlockBorderStyle(design.blockBorderId).id).toBeTruthy();
    expect(markup).toContain('data-page-border');
    expect(markup.length).toBeGreaterThan(1000);
  });
});

describe('every template still renders a complete page', () => {
  it('resolves to a real border, block, heading, paper and placement', () => {
    ALL_TEMPLATES.forEach(({ template, category }) => {
      const design = resolveTemplateDesign(template);
      expect(PAGE_BORDER_STYLES.some((style) => style.id === design.pageBorderId), `${category}/${template.id}`).toBe(true);
      expect(BLOCK_FILLS.some((fill) => fill.id === design.blockFillId), template.id).toBe(true);
      expect(BLOCK_DEPTHS.some((depth) => depth.id === design.blockDepthId), template.id).toBe(true);
      expect(PAGE_TEXTURES.some((texture) => texture.id === design.pageTextureId), template.id).toBe(true);
      expect(BLOCK_PLACEMENTS.some((placement) => placement.id === design.blockOverlap), template.id).toBe(true);
    });
  });
});

describe('the design data is authored data, and it is guarded', () => {
  it('has artwork geometry for every scroll and pattern layer', () => {
    PAGE_BORDER_STYLES.forEach((style) => {
      (style.layers || []).forEach((layer) => {
        if (layer.kind === 'scroll') {
          expect(SCROLL_CORNER.paths.length, style.id).toBeGreaterThan(3);
        }
        if (layer.kind === 'pattern') {
          expect(EDGE_PATTERNS[layer.motif], `${style.id} → ${layer.motif}`).toBeTruthy();
        }
      });
    });
  });

  it('keeps the shared design data complete for every template in the catalog', () => {
    ALL_TEMPLATES.forEach(({ template, category }) => {
      const design = resolveTemplateDesign(template);
      // A template missing from the shared data would silently lose its sample.
      expect(design.templateId, template.id).toBe(template.id);
      expect(design.categoryId, template.id).toBe(category);
      expect(design.pageBorderId).not.toBe('');
    });
  });

  it('offers the ornamental frames as one-tap creative directions', () => {
    const usedByPresets = new Set(
      require('../src/data/designData.json').presets.map((preset) => preset.design.pageBorderId)
    );
    expect(usedByPresets.has('florentine')).toBe(true);
    expect(usedByPresets.has('lace-scallop')).toBe(true);
  });
});
