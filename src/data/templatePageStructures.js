// 5 Detailed Page Design Structures per Template + 5/10/20/30 Chapter Planning Helpers

export const PAGE_COUNT_OPTIONS = [5, 10, 20, 30];
export const TEMPLATE_PAGE_STRUCTURE_COUNT = 5;

const CATEGORY_STRUCTURE_BLUEPRINTS = {
  photobook: [
    {
      index: 0,
      code: 'Structure I',
      shortLabel: 'Structure I • Gallery Split',
      name: 'Signature Framed Gallery Split',
      layoutSummary: 'Hero feature photo paired with companion framed plates & caption plaque.',
      borderName: 'Double-Ruled Corner Flourish Border',
      frameName: 'Museum Matted Double-Bezel Frames',
      cardName: 'Classical Crest Caption Plaque',
      photoSlots: 3
    },
    {
      index: 1,
      code: 'Structure II',
      shortLabel: 'Structure II • Panorama & 3 Cameos',
      name: 'Panoramic Horizon & Three Cameo Frames',
      layoutSummary: 'Wide top panoramic photograph above three sculpted cameo frames & story card.',
      borderName: 'Stepped Architectural Inner-Rule Frame',
      frameName: 'Sculpted Arch & Cameo Gallery Frames',
      cardName: 'Ribbon-Crowned Curatorial Pedestal Card',
      photoSlots: 4
    },
    {
      index: 2,
      code: 'Structure III',
      shortLabel: 'Structure III • Grand 5-Photo Mosaic',
      name: 'Grand Exhibition 5-Photo Mosaic & Seal',
      layoutSummary: 'Five interlocking exhibition photo frames with a centerpiece medallion note card.',
      borderName: 'Imperial Medallion & Pillar Border',
      frameName: 'Corner-Pinned Exhibition Plaque Frames',
      cardName: 'Medallion Scroll Story Card',
      photoSlots: 5
    },
    {
      index: 3,
      code: 'Structure IV',
      shortLabel: 'Structure IV • Immersive Panorama & Caption Bar',
      name: 'Immersive Panorama & Triptych Caption Bar',
      layoutSummary: 'A full-width hero photograph above three compact gallery plates and a wide memory card.',
      borderName: 'Panoramic Double-Rule Gallery Frame',
      frameName: 'Wide Horizon & Three Portrait Frames',
      cardName: 'Long-Form Memory Caption Bar',
      photoSlots: 4
    },
    {
      index: 4,
      code: 'Structure V',
      shortLabel: 'Structure V • Six-Frame Memory Mosaic',
      name: 'Six-Frame Memory Mosaic & Collector’s Note',
      layoutSummary: 'Six balanced photo frames arranged as a compact gallery beside a distinctive collector’s note.',
      borderName: 'Gallery Grid Pinstripe Border',
      frameName: 'Six-Mat Collector’s Gallery Frames',
      cardName: 'Collector’s Note Plaque',
      photoSlots: 6
    }
  ],
  cookbook: [
    {
      index: 0,
      code: 'Structure I',
      shortLabel: 'Structure I • Classic Recipe Split',
      name: 'Classic Chef’s Table Split Layout',
      layoutSummary: 'Framed hero dish portrait alongside a bordered ingredients card & numbered steps.',
      borderName: 'Culinary Double-Gold Corner Flourish Border',
      frameName: 'Matted Dish Portrait Bezel Frame',
      cardName: 'Framed Parchment Ingredients Card',
      photoSlots: 1
    },
    {
      index: 1,
      code: 'Structure II',
      shortLabel: 'Structure II • Culinary Banner & Twin Cards',
      name: 'Panoramic Kitchen Banner & Twin Arched Cards',
      layoutSummary: 'Wide overhead dish banner above side-by-side arched Ingredient & Method cards.',
      borderName: 'Scalloped Bistro Inner-Rule Border',
      frameName: 'Panoramic Ribbon-Crowned Dish Frame',
      cardName: 'Twin Arched Bistro Pedestal Cards',
      photoSlots: 2
    },
    {
      index: 2,
      code: 'Structure III',
      shortLabel: 'Structure III • Trio Tasting Mosaic',
      name: '3-Photo Tasting Mosaic & Chef’s Medallion Scroll',
      layoutSummary: 'Three step-by-step culinary photos with a medallion spice card & preparation scroll.',
      borderName: 'Imperial Apothecary Pillar & Frieze Border',
      frameName: 'Pinned Tasting-Plate Trio Frames',
      cardName: 'Wax-Seal Chef’s Secret & Ingredients Scroll',
      photoSlots: 3
    },
    {
      index: 3,
      code: 'Structure IV',
      shortLabel: 'Structure IV • Chef’s Focus & Timeline',
      name: 'Chef’s Focus Dish & Preparation Timeline',
      layoutSummary: 'A generous dish portrait paired with a clear ingredients card and a compact preparation timeline.',
      borderName: 'Bistro Double-Rule Recipe Frame',
      frameName: 'Chef’s Table Portrait & Detail Frame',
      cardName: 'Numbered Preparation Timeline Card',
      photoSlots: 2
    },
    {
      index: 4,
      code: 'Structure V',
      shortLabel: 'Structure V • Kitchen Notebook Mosaic',
      name: 'Kitchen Notebook Mosaic & Recipe Scroll',
      layoutSummary: 'Three step-by-step food photographs above a generous ingredients and method scroll.',
      borderName: 'Handwritten Kitchen Folio Border',
      frameName: 'Three-Taste Test Photo Frames',
      cardName: 'Kitchen Notebook Recipe Scroll',
      photoSlots: 3
    }
  ],
  magazine: [
    {
      index: 0,
      code: 'Structure I',
      shortLabel: 'Structure I • Editorial Feature Split',
      name: 'Editorial Feature Column & Spotlight Frame',
      layoutSummary: 'Masthead banner with two-column editorial story, framed portrait & highlight quote.',
      borderName: 'Double-Ruled Editorial Folio Border',
      frameName: 'Museum Press Portrait & Vignette Frames',
      cardName: 'Framed Pull-Quote & Key Dates Card',
      photoSlots: 2
    },
    {
      index: 1,
      code: 'Structure II',
      shortLabel: 'Structure II • Panorama Cover Spread',
      name: 'Panoramic Feature Banner & 3-Card Digest',
      layoutSummary: 'Wide top feature photograph above an article column, ribbon quote pedestal & sidebar card.',
      borderName: 'Architectural Stepped Press Border',
      frameName: 'Wide Press Banner & Cameo Inset Frame',
      cardName: 'Ribbon-Crowned Editorial Digest Cards',
      photoSlots: 2
    },
    {
      index: 2,
      code: 'Structure III',
      shortLabel: 'Structure III • Dual Gallery & Medallion',
      name: 'Dual Photo Essay & Centerpiece Medallion Quote',
      layoutSummary: 'Twin side-by-side press photographs with a medallion pull-quote & feature dispatch.',
      borderName: 'Imperial Pillar & Masthead Rule Border',
      frameName: 'Corner-Pinned Press Gallery Frames',
      cardName: 'Medallion Dispatch & Spotlight Scroll Card',
      photoSlots: 2
    },
    {
      index: 3,
      code: 'Structure IV',
      shortLabel: 'Structure IV • Editorial Hero & Sidebar',
      name: 'Editorial Hero Spread & Insight Sidebar',
      layoutSummary: 'A wide lead photograph, feature story, pull quote, and concise sidebar digest.',
      borderName: 'Contemporary Press Banner Border',
      frameName: 'Panoramic Editorial Lead Frame',
      cardName: 'Insight Sidebar & Pull-Quote Card',
      photoSlots: 3
    },
    {
      index: 4,
      code: 'Structure V',
      shortLabel: 'Structure V • Press Gallery & Quote Feature',
      name: 'Press Gallery Grid & Quote Feature',
      layoutSummary: 'Four editorial photographs in a balanced grid surrounding a prominent feature quote and story.',
      borderName: 'Newspaper Folio Grid Border',
      frameName: 'Four-Plate Press Gallery Frames',
      cardName: 'Large Editorial Pull-Quote Panel',
      photoSlots: 4
    }
  ],
  storybook: [
    {
      index: 0,
      code: 'Structure I',
      shortLabel: 'Structure I • Enchanted Arch Split',
      name: 'Illuminated Archway Picture & Story Scroll',
      layoutSummary: 'Large arched storybook illustration on one side and framed story words on the other.',
      borderName: 'Starlight Double-Gold Flourish Border',
      frameName: 'Grand Storybook Archway Frame',
      cardName: 'Royal Parchment Story Scroll Card',
      photoSlots: 1
    },
    {
      index: 1,
      code: 'Structure II',
      shortLabel: 'Structure II • Wide Panorama & Story Card',
      name: 'Panoramic Scene & Ribbon Story Pedestal',
      layoutSummary: 'Wide illustrated scene across the top with a ribbon-crowned story card & character cameo below.',
      borderName: 'Scalloped Fairy-Tale Inner Frame',
      frameName: 'Panoramic Enchanted Window + Cameo Frame',
      cardName: 'Ribbon-Crowned Storyteller Pedestal Card',
      photoSlots: 2
    },
    {
      index: 2,
      code: 'Structure III',
      shortLabel: 'Structure III • Twin Vignettes & Medallion',
      name: 'Twin Adventure Vignettes & Medallion Tale',
      layoutSummary: 'Two framed story scenes paired with an illuminated medallion title & narrative scroll.',
      borderName: 'Imperial Royal Crest & Pillar Border',
      frameName: 'Twin Pinned Tapestry Picture Frames',
      cardName: 'Medallion Moral & Story Plaque Card',
      photoSlots: 2
    },
    {
      index: 3,
      code: 'Structure IV',
      shortLabel: 'Structure IV • Full Scene Story Arc',
      name: 'Full-Scene Story Arc & Reading Scroll',
      layoutSummary: 'One wide story illustration leads into a large, easy-to-read narrative scroll.',
      borderName: 'Enchanted Window Double Frame',
      frameName: 'Full-Bleed Story Scene Window',
      cardName: 'Moonlit Reading Scroll',
      photoSlots: 1
    },
    {
      index: 4,
      code: 'Structure V',
      shortLabel: 'Structure V • Adventure Vignettes',
      name: 'Adventure Vignettes & Moral Medallion',
      layoutSummary: 'Three illustrated story moments set around a short narrative and a closing moral medallion.',
      borderName: 'Royal Storybook Panel Border',
      frameName: 'Three Adventure Vignette Frames',
      cardName: 'Moral Medallion & Story Panel',
      photoSlots: 3
    }
  ],
  informational: [
    {
      index: 0,
      code: 'Structure I',
      shortLabel: 'Structure I • Handbook Split & Chart',
      name: 'Structured Guide Split & Reference Table',
      layoutSummary: 'Key takeaways card & framed visual on one side with a structured reference chart on the other.',
      borderName: 'Double-Ruled Handbook Frame Border',
      frameName: 'Bezel-Framed Diagram & Photo Slot',
      cardName: 'Crest Takeaway & Reference Table Cards',
      photoSlots: 1
    },
    {
      index: 1,
      code: 'Structure II',
      shortLabel: 'Structure II • Action Banner & 3 Step Cards',
      name: 'Top Workshop Banner & 3 Pillar Step Cards',
      layoutSummary: 'Wide visual header banner above numbered step cards and a ribbon pro-tip pedestal.',
      borderName: 'Architectural Stepped Guide Border',
      frameName: 'Wide Workshop Banner Frame',
      cardName: 'Ribbon-Crowned Step & Pro-Tip Pedestal Cards',
      photoSlots: 1
    },
    {
      index: 2,
      code: 'Structure III',
      shortLabel: 'Structure III • Dual Visual Comparison',
      name: 'Dual Visual Comparison & Master Checklist',
      layoutSummary: 'Two side-by-side comparison photo frames with a medallion tip seal & comparison matrix.',
      borderName: 'Imperial Pillar & Header-Rule Border',
      frameName: 'Twin Pinned Comparison Plaque Frames',
      cardName: 'Medallion Checklist & Matrix Scroll Card',
      photoSlots: 2
    },
    {
      index: 3,
      code: 'Structure IV',
      shortLabel: 'Structure IV • Workshop Roadmap',
      name: 'Workshop Roadmap & Callout Cards',
      layoutSummary: 'A visual header and a clear three-stage roadmap with concise action and reminder cards.',
      borderName: 'Technical Blueprint Rule Border',
      frameName: 'Workshop Roadmap Banner Frame',
      cardName: 'Three-Stage Action Cards',
      photoSlots: 2
    },
    {
      index: 4,
      code: 'Structure V',
      shortLabel: 'Structure V • Field Guide Comparison',
      name: 'Field Guide Comparison & Checklist',
      layoutSummary: 'A pair of comparison visuals, a structured matrix, and a practical completion checklist.',
      borderName: 'Reference Manual Grid Border',
      frameName: 'Side-by-Side Comparison Frames',
      cardName: 'Field Checklist & Comparison Matrix',
      photoSlots: 2
    }
  ],
  book: [
    {
      index: 0,
      code: 'Structure I',
      shortLabel: 'Structure I • Classic Vignette & Drop-Cap',
      name: 'Framed Chapter Vignette & Illuminated Drop-Cap',
      layoutSummary: 'Double-framed chapter illustration alongside an illuminated drop-cap & literary narrative.',
      borderName: 'Classical Double-Gold Corner Flourish Border',
      frameName: 'Heirloom Matted Vignette Portrait Frame',
      cardName: 'Illuminated Drop-Cap & Manuscript Card',
      photoSlots: 1
    },
    {
      index: 1,
      code: 'Structure II',
      shortLabel: 'Structure II • Top Crest Banner & Columns',
      name: 'Panoramic Chapter Crest & Epigraph Scroll',
      layoutSummary: 'Wide top chapter artwork banner above a ribbon epigraph card & full manuscript body.',
      borderName: 'Stepped Library Folio Inner Frame',
      frameName: 'Sculpted Archway Chapter Header Frame',
      cardName: 'Ribbon-Crowned Epigraph & Literary Scroll',
      photoSlots: 1
    },
    {
      index: 2,
      code: 'Structure III',
      shortLabel: 'Structure III • Medallion Portrait & Quote',
      name: 'Cameo Medallion Portrait, Pull-Quote & Prose',
      layoutSummary: 'Ornate cameo illustration and framed quote plaque paired with the chapter narrative.',
      borderName: 'Imperial Literary Pillar & Frieze Border',
      frameName: 'Pinned Cameo Medallion Artwork Frame',
      cardName: 'Wax-Seal Quote Pedestal & Prose Card',
      photoSlots: 2
    },
    {
      index: 3,
      code: 'Structure IV',
      shortLabel: 'Structure IV • Chapter Banner & Manuscript',
      name: 'Chapter Banner & Manuscript Reading Spread',
      layoutSummary: 'A panoramic chapter illustration introduces a spacious, uninterrupted manuscript page.',
      borderName: 'Library Folio Banner Border',
      frameName: 'Wide Chapter Crest Frame',
      cardName: 'Manuscript Reading Column',
      photoSlots: 1
    },
    {
      index: 4,
      code: 'Structure V',
      shortLabel: 'Structure V • Literary Gallery & Epigraph',
      name: 'Literary Gallery & Epigraph Spread',
      layoutSummary: 'Three literary vignettes frame an epigraph and a broad prose column.',
      borderName: 'Heirloom Literary Gallery Border',
      frameName: 'Three Cameo Illustration Frames',
      cardName: 'Epigraph & Prose Folio',
      photoSlots: 3
    }
  ]
};

/**
 * Returns five detailed page design structures customized for a specific template.
 * Each structure shares the template's exact style/palette while offering a distinct layout,
 * border treatment, image frame style, and card design.
 */
export function getTemplatePageStructures(categoryId = 'photobook', template = {}) {
  const baseList =
    CATEGORY_STRUCTURE_BLUEPRINTS[categoryId] ||
    CATEGORY_STRUCTURE_BLUEPRINTS.photobook;

  const tplName = template?.name || 'Template';
  const pageBg = template?.pageBg || '#FCF8F1';
  const pageText = template?.pageText || '#1E293B';
  const borderColor = template?.borderColor || '#D97706';
  const accentColor = template?.accentColor || borderColor;
  const fontFamily = template?.fontFamily || 'Lora';

  return baseList.map((item) => ({
    ...item,
    templateId: template?.id,
    templateName: tplName,
    pageBg,
    pageText,
    borderColor,
    accentColor,
    fontFamily
  }));
}

/**
 * Generates the Index's chapter-title list (5, 10, 20, or 30 chapters).
 * Chapter titles are entered on the first page of each chapter in Step 4.
 */
export function buildPlannedPagesList({ count = 5, existingPages = [] }) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 5));
  return Array.from({ length: safeCount }, (_, index) => {
    const existing = existingPages[index] || {};
    return {
      title: existing.title || `Chapter ${index + 1}`,
      subtitle: existing.subtitle || '',
      pageStructure:
        typeof existing.pageStructure === 'number'
          ? existing.pageStructure % TEMPLATE_PAGE_STRUCTURE_COUNT
          : 0
    };
  });
}
