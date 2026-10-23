// Creative Publishing Studio — Multi-Format Publication Types, Page Layout Library & Living Templates

const PUBLICATION_TYPES = [
  {
    id: 'magazine',
    name: 'Magazine & Editorial Issue',
    shortLabel: 'Magazine',
    tagline: 'Feature spreads, multi-column articles, pull-quotes, interviews, and visual journalism.',
    defaultTrimSize: '8.5x11',
    defaultOrientation: 'portrait',
    supportsSpreads: true,
    primaryEditor: 'magazine',
    accentColor: '#991B1B'
  },
  {
    id: 'cookbook',
    name: 'Cookbook & Culinary Collection',
    shortLabel: 'Cookbook',
    tagline: 'Structured recipes with prep/cook times, ingredient groups, numbered steps, chef notes, and food photography.',
    defaultTrimSize: '7.5x9.5',
    defaultOrientation: 'portrait',
    supportsSpreads: true,
    primaryEditor: 'cookbook',
    accentColor: '#B45309'
  },
  {
    id: 'storybook',
    name: 'Illustrated Storybook',
    shortLabel: 'Storybook',
    tagline: 'Facing-page illustrated spreads pairing visual artwork canvases with read-aloud storytelling.',
    defaultTrimSize: '8.5x8.5',
    defaultOrientation: 'square',
    supportsSpreads: true,
    primaryEditor: 'storybook',
    accentColor: '#D97706'
  },
  {
    id: 'informational',
    name: 'Informational & Reference Book',
    shortLabel: 'Informational',
    tagline: 'Clear explanations, labeled diagrams, structured data tables, callout boxes, and cited references.',
    defaultTrimSize: '7x10',
    defaultOrientation: 'portrait',
    supportsSpreads: false,
    primaryEditor: 'informational',
    accentColor: '#1E3A8A'
  },
  {
    id: 'photobook',
    name: 'Photo Book & Visual Lookbook',
    shortLabel: 'Photo Book',
    tagline: 'Image-led layouts prioritizing photography, gallery grids, curatorial essays, and fine-art plates.',
    defaultTrimSize: '11x8.5',
    defaultOrientation: 'landscape',
    supportsSpreads: true,
    primaryEditor: 'photobook',
    accentColor: '#1F2937'
  },
  {
    id: 'workbook',
    name: 'Workbook & Guided Manual',
    shortLabel: 'Workbook',
    tagline: 'Interactive exercises, rating tables, checklists, reflection prompts, and structured response spaces.',
    defaultTrimSize: '7x10',
    defaultOrientation: 'portrait',
    supportsSpreads: false,
    primaryEditor: 'workbook',
    accentColor: '#0F766E'
  },
  {
    id: 'book',
    name: 'Long-Form Book, Memoir & Fiction',
    shortLabel: 'Trade Book',
    tagline: 'Spacious chapter-based studio for nonfiction, memoirs, novels, devotionals, poetry, and scholarship.',
    defaultTrimSize: '5.5x8.5',
    defaultOrientation: 'portrait',
    supportsSpreads: false,
    primaryEditor: 'longform',
    accentColor: '#7C2D12'
  },
  {
    id: 'blank',
    name: 'Blank Custom Publication',
    shortLabel: 'Blank Project',
    tagline: 'Start with an open canvas and freely combine magazine spreads, recipes, photo grids, tables, and chapters.',
    defaultTrimSize: '6x9',
    defaultOrientation: 'portrait',
    supportsSpreads: true,
    primaryEditor: 'hybrid',
    accentColor: '#4A5568'
  }
];

const PAGE_LAYOUT_LIBRARY = [
  {
    id: 'magazine-cover-feature',
    name: 'Editorial Feature Opener',
    category: 'magazine',
    description: 'Large masthead/kicker, hero visual banner, display headline, standfirst deck, and two-column lead.',
    columns: 2,
    hasHeroImage: true,
    hasPullQuote: true
  },
  {
    id: 'magazine-two-column',
    name: 'Two-Column Magazine Article',
    category: 'magazine',
    description: 'Balanced two-column editorial typography with a centered pull-quote and sidebar callout.',
    columns: 2,
    hasHeroImage: false,
    hasPullQuote: true
  },
  {
    id: 'magazine-spread-essay',
    name: 'Facing-Page Editorial Spread',
    category: 'magazine',
    description: 'Designed across left and right facing pages with asymmetric imagery and feature commentary.',
    columns: 2,
    hasHeroImage: true,
    hasPullQuote: true
  },
  {
    id: 'recipe-classic-card',
    name: 'Classic Culinary Recipe Page',
    category: 'cookbook',
    description: 'Prep/cook/servings bar, 1/3 left column for structured ingredients, 2/3 right column for numbered method & chef tip.',
    columns: 2,
    hasHeroImage: true,
    hasPullQuote: false
  },
  {
    id: 'recipe-modern-split',
    name: 'Modern Split-Spread Recipe',
    category: 'cookbook',
    description: 'Full-bleed dish photograph alongside clean minimalist ingredient groups and step-by-step instructions.',
    columns: 2,
    hasHeroImage: true,
    hasPullQuote: false
  },
  {
    id: 'storybook-facing-spread',
    name: 'Illustrated Storybook Spread',
    category: 'storybook',
    description: 'Full illustration canvas on the left page paired with large, readable storybook typography on the right page.',
    columns: 1,
    hasHeroImage: true,
    hasPullQuote: false
  },
  {
    id: 'storybook-full-bleed',
    name: 'Picture Book Panorama Overlay',
    category: 'storybook',
    description: 'Wide visual scene with a framed parchment story card positioned for read-aloud pacing.',
    columns: 1,
    hasHeroImage: true,
    hasPullQuote: false
  },
  {
    id: 'photobook-hero-plate',
    name: 'Fine-Art Photographic Plate',
    category: 'photobook',
    description: 'Generous museum-style framing for a single hero photograph with curatorial caption and camera metadata.',
    columns: 1,
    hasHeroImage: true,
    hasPullQuote: false
  },
  {
    id: 'photobook-gallery-grid',
    name: 'Visual Contact Grid (Multi-Photo)',
    category: 'photobook',
    description: 'Curated multi-image grid pairing visual sequences with thematic commentary and captions.',
    columns: 2,
    hasHeroImage: true,
    hasPullQuote: false
  },
  {
    id: 'informational-structured',
    name: 'Informational Reference & Diagram Layout',
    category: 'informational',
    description: 'Structured explanation with Key Concept callout, labeled diagram figure, comparison data table, and references.',
    columns: 1,
    hasHeroImage: true,
    hasPullQuote: false
  },
  {
    id: 'workbook-interactive',
    name: 'Interactive Worksheet & Assessment',
    category: 'workbook',
    description: 'Concise teaching brief, self-assessment rating matrix, action checklist, and lined reflection space.',
    columns: 1,
    hasHeroImage: false,
    hasPullQuote: false
  },
  {
    id: 'longform-chapter',
    name: 'Classic Typeset Book Chapter',
    category: 'book',
    description: 'Traditional literary chapter layout with optional drop caps, indented paragraphs, and running headers.',
    columns: 1,
    hasHeroImage: false,
    hasPullQuote: false
  }
];

const STARTER_TEMPLATES = [
  {
    id: 'culinary-cookbook',
    name: 'Artisan Cookbook & Kitchen Table',
    category: 'Cookbooks & Culinary',
    bookType: 'cookbook',
    tagline: 'Structured recipes, seasonal menus, pantry guides, and culinary storytelling.',
    description: 'Purpose-built for chefs, food writers, and family recipe curators. Represents recipes as structured culinary data (prep/cook time, yield, dietary tags, ingredient groups, numbered steps, and chef notes) alongside evocative kitchen essays.',
    intendedAudience: 'Chefs, cookbook authors, food bloggers, nutritionists, and family recipe collectors.',
    useCases: ['Seasonal farm-to-table cookbook', 'Artisan baking & sourdough manual', 'Family heritage recipe collection'],
    keywords: ['cookbook', 'recipes', 'food', 'cooking', 'baking', 'culinary', 'kitchen', 'menu'],
    accentColor: '#B45309',
    recommendedTrimSize: '7.5x9.5',
    recommendedFont: 'Newsreader',
    enabledTools: ['concepts', 'outlines', 'research', 'quotes'],
    defaultFrontMatter: ['title_page', 'copyright', 'toc', 'introduction'],
    stages: [
      {
        stageKey: 'cook-intro',
        title: 'The Philosophy of the Kitchen & Essential Pantry',
        sectionType: 'informational_unit',
        layoutId: 'informational-structured',
        isOptional: false,
        targetWords: 1200,
        purpose: 'Welcome the home cook, share your culinary philosophy, and outline essential tools and pantry staples.',
        accomplish: 'Set the sensory tone of your cookbook and equip readers with foundational ingredients.',
        questions: [
          'What makes your approach to cooking distinct and approachable?',
          'Which 5–8 pantry staples or tools appear most frequently across your recipes?'
        ],
        approaches: [
          'Group pantry essentials into aromatics, oils/acids, and dry goods in a clean reference table.',
          'Share the story of the table or region that inspired these dishes.'
        ],
        subtopics: ['Welcome to the table', 'Core pantry staples table', 'Equipment notes', 'How to read these recipes'],
        example: 'A well-stocked larder turns weeknight cooking from a chore into an improvisation: flaky sea salt, cold-pressed olive oil, preserved lemons, and toasted fennel seed.',
        commonOmissions: ['Forgetting to specify whether oven temperatures are Fahrenheit or Celsius and whether weights are metric or imperial.'],
        completionCriteria: ['Culinary philosophy drafted', 'Pantry reference table completed'],
        structuredData: {
          calloutTitle: 'Kitchen Standard Note',
          calloutBody: 'All herbs are fresh unless noted dried. Oven temperatures are given in both °F and °C.',
          tableHeaders: ['Pantry Staple', 'Culinary Role', 'Suggested Substitute'],
          tableRows: [
            ['Flaky Sea Salt', 'Finishing texture & brightness', 'Kosher salt (use half volume)'],
            ['Cold-Pressed Olive Oil', 'Roasting & dressings', 'Avocado oil for high heat'],
            ['Preserved Lemon', 'Savory citrus depth', 'Lemon zest + pinch of sea salt']
          ]
        }
      },
      {
        stageKey: 'cook-recipe-1',
        title: 'Charred Heirloom Carrots with Whipped Ricotta & Herb Oil',
        sectionType: 'recipe',
        layoutId: 'recipe-classic-card',
        isOptional: false,
        targetWords: 600,
        purpose: 'Present a signature starter recipe with clear ingredient measurements, timings, and foolproof steps.',
        accomplish: 'Give the reader an immediately achievable, visually striking dish that showcases your flavor profile.',
        questions: [
          'What sensory cue (color, aroma, sizzle) tells the cook each step is done?',
          'What make-ahead or substitution tip helps a busy home cook succeed?'
        ],
        approaches: [
          'List ingredients in the exact order they are used in the method.',
          'Give both visual cues ("blistered and tender when pierced") and approximate minutes.'
        ],
        subtopics: ['Headnote story', 'Timings & yield', 'Structured ingredients', 'Step-by-step method', 'Chef’s pairing note'],
        example: 'Roast at 425°F (220°C) until the edges caramelize into deep mahogany, about 25 minutes.',
        commonOmissions: ['Listing an ingredient in the steps that was omitted from the ingredient list.'],
        completionCriteria: ['Ingredients verified with units', 'Steps numbered with sensory cues', 'Prep & cook times set'],
        structuredData: {
          course: 'Small Plates & Starters',
          prepTime: '15 mins',
          cookTime: '25 mins',
          servings: '4 servings',
          difficulty: 'Easy',
          dietaryTags: ['Vegetarian', 'Gluten-Free', 'Seasonal'],
          headnote: 'Roasting young carrots at high heat concentrates their natural sugars while toasted coriander and cold ricotta provide a cool, creamy counterpoint.',
          ingredients: [
            { quantity: '1.5', unit: 'lbs', item: 'heirloom carrots, scrubbed and halved lengthwise', group: 'Main Dish' },
            { quantity: '2', unit: 'tbsp', item: 'extra-virgin olive oil', group: 'Main Dish' },
            { quantity: '1', unit: 'tsp', item: 'coriander seeds, lightly crushed', group: 'Main Dish' },
            { quantity: '1', unit: 'cup', item: 'whole-milk ricotta', group: 'Whipped Base' },
            { quantity: '1', unit: 'tbsp', item: 'wildflower honey', group: 'Finishing' },
            { quantity: '1/4', unit: 'cup', item: 'fresh mint & dill fronds, torn', group: 'Finishing' }
          ],
          steps: [
            'Preheat the oven to 425°F (220°C) and line a heavy rimmed baking sheet with parchment.',
            'Toss the halved carrots with olive oil, crushed coriander seeds, and flaky sea salt. Roast for 22–25 minutes until deeply caramelized and tender.',
            'Meanwhile, whip the ricotta with a pinch of salt and lemon zest in a food processor for 60 seconds until cloud-like and glossy.',
            'Swoosh the whipped ricotta across a warm platter, arrange the hot charred carrots on top, and drizzle with honey and fresh herbs.'
          ],
          chefNotes: 'Make Ahead: The herb oil and whipped ricotta can be refrigerated in airtight jars up to 2 days in advance.'
        }
      },
      {
        stageKey: 'cook-recipe-2',
        title: 'Saffron & Fennel Braised White Beans with Crispy Sage',
        sectionType: 'recipe',
        layoutId: 'recipe-modern-split',
        isOptional: false,
        targetWords: 650,
        purpose: 'Anchor the main-course section with a comforting centerpiece recipe.',
        accomplish: 'Demonstrate layering of aromatics and slow simmering technique.',
        questions: ['What texture contrast elevates this main dish?'],
        approaches: ['Pair slow-braised elements with a crisp, bright garnish right before serving.'],
        subtopics: ['Headnote', 'Ingredients', 'Method', 'Serving suggestion'],
        example: 'Bloom the saffron threads in two tablespoons of warm stock for ten minutes before adding to the pot.',
        commonOmissions: ['Forgetting to mention seasoning adjustments at the end of braising.'],
        completionCriteria: ['Main recipe structured', 'Chef notes added'],
        structuredData: {
          course: 'Hearth Mains',
          prepTime: '15 mins',
          cookTime: '35 mins',
          servings: '4–6 servings',
          difficulty: 'Easy',
          dietaryTags: ['Vegetarian', 'One-Pot'],
          headnote: 'A golden, aromatic braise that comes together in one heavy Dutch oven—ideal alongside grilled sourdough.',
          ingredients: [
            { quantity: '1', unit: 'bulb', item: 'fresh fennel, thinly sliced', group: 'Base' },
            { quantity: '1', unit: 'pinch', item: 'Spanish saffron threads, steeped in warm broth', group: 'Base' },
            { quantity: '2', unit: 'cans (15 oz)', item: 'cannellini or butter beans, rinsed', group: 'Base' },
            { quantity: '12', unit: 'leaves', item: 'fresh sage, fried crisp in olive oil', group: 'Garnish' }
          ],
          steps: [
            'Sweat the sliced fennel in olive oil over medium-low heat for 12 minutes until translucent and sweet.',
            'Stir in the butter beans and saffron-infused broth; simmer gently for 20 minutes until the broth turns velvety.',
            'Spoon into warm bowls and crown with crispy fried sage leaves and cracked black pepper.'
          ],
          chefNotes: 'Pairing: Serve with charred country bread and a crisp Mediterranean white wine.'
        }
      }
    ]
  },
  {
    id: 'editorial-magazine',
    name: 'Modern Editorial Magazine & Periodical',
    category: 'Magazines & Editorial Issues',
    bookType: 'magazine',
    tagline: 'Cover features, multi-column layouts, pull-quotes, Q&A profiles, and visual spreads.',
    description: 'Designed for independent magazines, cultural journals, museum catalogues, and corporate periodicals. Supports multi-column article typography, bold pull-quotes, sidebars, and facing-page spread design.',
    intendedAudience: 'Magazine editors, creative directors, journalists, and cultural organizations.',
    useCases: ['Quarterly architecture & design magazine', 'Arts & culture review', 'Brand editorial lookbook'],
    keywords: ['magazine', 'editorial', 'periodical', 'journal', 'articles', 'spread', 'design', 'issue'],
    accentColor: '#991B1B',
    recommendedTrimSize: '8.5x11',
    recommendedFont: 'Inter',
    enabledTools: ['concepts', 'outlines', 'research', 'quotes'],
    defaultFrontMatter: ['title_page', 'toc'],
    stages: [
      {
        stageKey: 'mag-editor-letter',
        title: 'Editor’s Note: The Tactile Renaissance',
        sectionType: 'magazine_article',
        layoutId: 'magazine-two-column',
        isOptional: false,
        targetWords: 800,
        purpose: 'Frame the theme of the issue and welcome readers with a distinctive editorial voice.',
        accomplish: 'Connect the individual features of the issue into a cohesive cultural moment.',
        questions: [
          'Why does this issue’s theme matter right now?',
          'Which contributor stories inside this issue surprised you most?'
        ],
        approaches: ['Keep the editor’s letter brisk, visual, and personal—around 600–800 words across two columns.'],
        subtopics: ['Issue theme', 'Highlights from the pages ahead', 'Editor sign-off'],
        example: 'In an era of weightless digital feeds, we found ourselves drawn back to workshops that smell of cedar shavings, linseed oil, and wet clay.',
        commonOmissions: ['Summarizing every article mechanically instead of weaving a unifying perspective.'],
        completionCriteria: ['Kicker & headline set', 'Pull-quote highlighted'],
        structuredData: {
          kicker: 'ISSUE 04 • EDITOR’S LETTER',
          headline: 'The Return of the Tactile Workshop',
          deck: 'Across four continents, a new generation of architects, ceramicists, and bookbinders is trading speed for permanence.',
          byline: 'By Clara Vance, Editor-in-Chief',
          pullQuote: '“We do not miss the inefficiency of analog craft—we miss the weight of things made to outlast us.”',
          columns: 2,
          sidebarTitle: 'In This Issue',
          sidebarContent: 'p. 04 — Daylight in Kyoto Courtyards\np. 12 — The Oakhaven Foundry\np. 20 — Material Archive: Raw Linen & Brass'
        }
      },
      {
        stageKey: 'mag-cover-story',
        title: 'Cover Story: Building with Quiet Light',
        sectionType: 'magazine_article',
        layoutId: 'magazine-cover-feature',
        isOptional: false,
        targetWords: 2200,
        purpose: 'Deliver the flagship visual and journalistic feature of the magazine issue.',
        accomplish: 'Pair striking visual blocks with in-depth reporting, interviews, and pull-quotes.',
        questions: [
          'What central visual image anchors the opening spread of this feature?',
          'Which quote from your interview deserves to be set as a large display pull-quote?'
        ],
        approaches: ['Alternate narrative scene-setting with direct quotes and architectural/visual observations.'],
        subtopics: ['Opening visual scene', 'Profile of the creators', 'Technical & aesthetic breakdown', 'Closing resonance'],
        example: 'At noon, a single ribbon of winter sunlight crosses the charred-cedar beam and illuminates the worktable.',
        commonOmissions: ['Forgetting image captions and photo credits on feature spreads.'],
        completionCriteria: ['Feature article drafted', 'Hero visual & pull-quote configured'],
        structuredData: {
          kicker: 'COVER FEATURE • ARCHITECTURE',
          headline: 'Building with Quiet Light',
          deck: 'How coastal studios are reviving timber joinery and passive daylighting for the next century.',
          byline: 'Words by Julian Mercer • Photography by Studio Nord',
          pullQuote: '“A room should tell you the hour of the day and the season of the year without a clock on the wall.”',
          columns: 2,
          sidebarTitle: 'Project Dossier',
          sidebarContent: 'Location: North Atlantic Archipelago\nMaterials: Reclaimed Douglas Fir, Lime Plaster, Brushed Brass\nCompletion: Autumn 2026'
        }
      }
    ]
  },
  {
    id: 'illustrated-storybook',
    name: 'Illustrated Storybook & Picture Book',
    category: 'Illustrated Storybooks',
    bookType: 'storybook',
    tagline: 'Page-turn visual spreads pairing illustration canvases with enchanting read-aloud text.',
    description: 'Created for picture book authors, illustrators, and educators. Organizes the book into visual spreads where artwork placement, composition notes, and rhythmic read-aloud text work in harmony.',
    intendedAudience: 'Children’s book creators, author-illustrators, parents, and storytelling educators.',
    useCases: ['32-page illustrated children’s picture book', 'Visual fable or folktale', 'Illustrated gift book'],
    keywords: ['storybook', 'illustrated', 'children', 'picture book', 'spreads', 'art', 'fable'],
    accentColor: '#D97706',
    recommendedTrimSize: '8.5x8.5',
    recommendedFont: 'Lora',
    enabledTools: ['concepts', 'outlines', 'characters', 'worldbuilding'],
    defaultFrontMatter: ['title_page', 'copyright', 'dedication'],
    stages: [
      {
        stageKey: 'sb-spread-1',
        title: 'Spread 1: The Lantern Maker’s Attic',
        sectionType: 'storybook_spread',
        layoutId: 'storybook-facing-spread',
        isOptional: false,
        targetWords: 120,
        purpose: 'Introduce the protagonist and visual world in an inviting opening spread.',
        accomplish: 'Let the illustration carry the setting details while the text establishes voice and wonder.',
        questions: [
          'What visual detail in the illustration will a reader notice that isn’t explicitly stated in the text?',
          'Where is the natural suspenseful pause right before the page turn?'
        ],
        approaches: ['Keep spread text concise (40–90 words per spread) so the artwork has room to breathe.'],
        subtopics: ['Left page illustration composition', 'Right page read-aloud text', 'Page-turn hook'],
        example: 'Barnaby kept three hundred paper lanterns in the rafters of the clocktower—one for every clear night of the year, and one painted gold for emergencies.',
        commonOmissions: ['Writing long paragraphs that crowd the illustration canvas.'],
        completionCriteria: ['Spread text rhythmic when read aloud', 'Illustration art direction defined'],
        structuredData: {
          spreadNumber: 1,
          artDirection: 'Warm amber watercolor & ink: A cozy attic filled with glowing paper lanterns shaped like owls, ships, and stars. A small badger in a brass-buttoned waistcoat stands on a wooden ladder.',
          colorPalette: ['#1E293B', '#F59E0B', '#FEF3C7'],
          textPlacement: 'right_page_centered',
          readAloudNote: 'Read with a hushed, wondering tone; pause before the final sentence.'
        }
      },
      {
        stageKey: 'sb-spread-2',
        title: 'Spread 2: The Night the Harbor Went Dark',
        sectionType: 'storybook_spread',
        layoutId: 'storybook-full-bleed',
        isOptional: false,
        targetWords: 120,
        purpose: 'Present the inciting visual problem across a dramatic full-bleed panorama.',
        accomplish: 'Create visual contrast with Spread 1 and propel the hero into action.',
        questions: ['How does the color palette shift on this spread to reflect the new mood?'],
        approaches: ['Use a wide panoramic layout with text nestled in the upper sky or lower harbor corner.'],
        subtopics: ['Panoramic visual', 'Dramatic action beat', 'Hero’s decision'],
        example: 'Then came the Tuesday when the sea fog rolled in so thick it swallowed the lighthouse beam whole.',
        commonOmissions: ['Solving the problem too quickly without letting the visual tension build.'],
        completionCriteria: ['Spread 2 drafted', 'Visual contrast established'],
        structuredData: {
          spreadNumber: 2,
          artDirection: 'Deep indigo and silver mist sweeping across the harbor rooftops; only Barnaby’s tiny attic window glows in the upper left corner.',
          colorPalette: ['#0F172A', '#38BDF8', '#FDE68A'],
          textPlacement: 'overlay_bottom_card',
          readAloudNote: 'Slow down on "swallowed the lighthouse beam whole."'
        }
      }
    ]
  },
  {
    id: 'informational-reference',
    name: 'Informational, Technical & Visual Reference Book',
    category: 'Informational & Educational Books',
    bookType: 'informational',
    tagline: 'Structured explanations, labeled diagrams, comparison tables, callout boxes, and cited sources.',
    description: 'Built for educators, science writers, historians, and technical authors creating richly structured informational books with diagrams, data tables, key-concept callouts, and clear visual hierarchy.',
    intendedAudience: 'Educators, researchers, technical writers, museum curators, and subject-matter experts.',
    useCases: ['Illustrated natural history & field guide', 'Architecture or engineering reference handbook', 'Educational textbook or study guide'],
    keywords: ['informational', 'educational', 'reference', 'science', 'diagrams', 'tables', 'technical', 'handbook'],
    accentColor: '#1E3A8A',
    recommendedTrimSize: '7x10',
    recommendedFont: 'Inter',
    enabledTools: ['concepts', 'outlines', 'research', 'quotes', 'questions'],
    defaultFrontMatter: ['title_page', 'copyright', 'toc', 'preface'],
    stages: [
      {
        stageKey: 'info-unit-1',
        title: 'Unit 1: Principles of Tidal & Coastal Ecosystems',
        sectionType: 'informational_unit',
        layoutId: 'informational-structured',
        isOptional: false,
        targetWords: 2000,
        purpose: 'Explain core concepts clearly using a combination of prose, structured data tables, labeled diagrams, and summary callouts.',
        accomplish: 'Allow readers to both scan key facts quickly and dive deep into the underlying mechanisms.',
        questions: [
          'Which quantitative comparison or classification belongs in a structured table rather than a dense paragraph?',
          'What diagram or schematic best clarifies the process being explained?'
        ],
        approaches: [
          'Open with a Key Concept Callout Box summarizing the core principle in 2–3 sentences.',
          'Pair each major explanation with a comparative data table and a labeled figure.'
        ],
        subtopics: ['Key concept definition', 'Core mechanism explanation', 'Comparative data table', 'Diagram & figure analysis', 'Source references'],
        example: 'Intertidal zones are governed by semi-diurnal lunar cycles, creating four distinct ecological micro-habitats within a vertical span of three meters.',
        commonOmissions: ['Burying important numbers in prose when a comparison table would make them immediately clear.'],
        completionCriteria: ['Key concept callout written', 'Data table populated', 'References cited'],
        structuredData: {
          calloutTitle: 'Key Concept: Vertical Zonation',
          calloutBody: 'Marine organisms in tidal habitats sort into distinct horizontal bands according to their tolerance for desiccation, wave action, and temperature extremes.',
          tableHeaders: ['Tidal Zone', 'Submersion Frequency', 'Indicator Species', 'Primary Adaptation'],
          tableRows: [
            ['Splash Zone', 'Spray only during high spring tides', 'Periwinkle snails, Lichens', ' impermeable shell seal'],
            ['High Intertidal', 'Covered only at high tide peaks', 'Acorn barnacles, Rockweed', 'Calcareous plates retain moisture'],
            ['Low Intertidal', 'Submerged 80–90% of cycle', 'Kelp forests, Sea stars, Anemones', 'Flexible holdfasts resist surge']
          ],
          diagramCaption: 'Figure 1.1: Cross-section of a basalt rocky shore showing vertical tidal zonation from splash zone to subtidal kelp bed.',
          references: '1. Ricketts, E. F. & Calvin, J. Between Pacific Tides. Stanford University Press.\n2. Marine Ecological Survey Dataset (2025).'
        }
      }
    ]
  },
  {
    id: 'fine-art-photobook',
    name: 'Photo Book, Lookbook & Curatorial Folio',
    category: 'Photo Books & Visual Folios',
    bookType: 'photobook',
    tagline: 'Gallery plates, multi-image contact grids, curatorial essays, and photographic metadata.',
    description: 'Designed for photographers, visual artists, travel chroniclers, and studios assembling image-first publications where visual pacing, white space, and plate captions take center stage.',
    intendedAudience: 'Photographers, visual artists, architects, designers, and exhibition curators.',
    useCases: ['Fine-art photography monograph', 'Travel & landscape photo book', 'Design studio portfolio & lookbook'],
    keywords: ['photo book', 'photography', 'lookbook', 'portfolio', 'visual', 'monograph', 'gallery', 'art'],
    accentColor: '#1F2937',
    recommendedTrimSize: '11x8.5',
    recommendedFont: 'Inter',
    enabledTools: ['concepts', 'outlines', 'quotes'],
    defaultFrontMatter: ['title_page', 'copyright', 'dedication'],
    stages: [
      {
        stageKey: 'photo-plate-1',
        title: 'Plate I: Northern Latitudes — Dawn Study',
        sectionType: 'photo_spread',
        layoutId: 'photobook-hero-plate',
        isOptional: false,
        targetWords: 250,
        purpose: 'Present a signature photographic plate with generous framing, curatorial context, and technical metadata.',
        accomplish: 'Establish the visual mood and sequencing rhythm of the photo book.',
        questions: [
          'Does this photograph benefit most from a full-bleed edge or wide museum-board margins?',
          'What brief caption or location note deepens the viewer’s contemplation?'
        ],
        approaches: ['Pair high-contrast wide shots with intimate close-up textures on adjacent spreads.'],
        subtopics: ['Hero plate image', 'Curatorial caption', 'Location & date', 'Technical metadata'],
        example: 'Plate 01 — Basalt Sea Stack, Lofoten Archipelago. 58mm, f/8, 4-second exposure before sunrise.',
        commonOmissions: ['Crowding a strong photograph with overly decorative borders or long blocks of text.'],
        completionCriteria: ['Plate visual arranged', 'Caption & metadata verified'],
        structuredData: {
          plateNumber: 'PLATE 01',
          location: 'Lofoten Archipelago, 68° N',
          dateTaken: 'October 2026',
          cameraSpecs: 'Medium Format • 55mm • f/8 • 1/15s • ISO 100',
          curatorialNote: 'First light across the granite fjord after three days of Atlantic gale.',
          gridStyle: 'single_hero_museum'
        }
      },
      {
        stageKey: 'photo-grid-2',
        title: 'Sequence II: Studies in Stone, Timber & Salt',
        sectionType: 'photo_spread',
        layoutId: 'photobook-gallery-grid',
        isOptional: false,
        targetWords: 300,
        purpose: 'Juxtapose a sequence of 2–4 related photographs in a balanced visual grid.',
        accomplish: 'Create visual dialogue between textures, architectural details, and landscapes.',
        questions: ['How do the lines and tones of the left image lead the eye into the right image?'],
        approaches: ['Use consistent gutter spacing (12–16pt) between grid images for a clean gallery aesthetic.'],
        subtopics: ['Visual sequence', 'Comparative captions'],
        example: 'Left: Weathered boathouse joinery (1912). Right: Granite breakwater under low tide.',
        commonOmissions: ['Mixing inconsistent aspect ratios without aligning their top or baseline edges.'],
        completionCriteria: ['Multi-photo grid configured'],
        structuredData: {
          plateNumber: 'PLATES 02–04',
          location: 'Oakhaven & Surrounds',
          dateTaken: 'Autumn 2026',
          cameraSpecs: '35mm & 85mm Prime Series',
          curatorialNote: 'A triptych examining how coastal timber and quarry stone weather the salt wind over a century.',
          gridStyle: 'triptych_gallery'
        }
      }
    ]
  },
  {
    id: 'interactive-workbook',
    name: 'Practical Workbook & Guided Action Manual',
    category: 'Workbooks and practical guides',
    bookType: 'workbook',
    tagline: 'Action-oriented modules with exercises, self-assessments, reflection prompts, and response spaces.',
    description: 'Built specifically for interactive learning and transformation. Combines concise teaching briefs with structured worksheets, self-assessment tables, checklists, reflection questions, and space for reader responses.',
    intendedAudience: 'Educators, coaches, workshop facilitators, therapists, and curriculum designers.',
    useCases: ['Forgiveness & reconciliation workbook', 'Career transition blueprint', 'Creative entrepreneurship workbook'],
    keywords: ['workbook', 'practical', 'exercises', 'guide', 'activities', 'coaching', 'forgiveness', 'workshop', 'planner', 'course'],
    accentColor: '#0F766E',
    recommendedTrimSize: '7x10',
    recommendedFont: 'Inter',
    enabledTools: ['concepts', 'outlines', 'research', 'questions'],
    defaultFrontMatter: ['title_page', 'copyright', 'toc', 'how_to_use'],
    stages: [
      {
        stageKey: 'wb-mod1',
        title: 'Module 1: Baseline Assessment & Clarity Audit',
        sectionType: 'workbook_exercise',
        layoutId: 'workbook-interactive',
        isOptional: false,
        targetWords: 1500,
        purpose: 'Help the user take an honest inventory of where they are right now and define what success looks like.',
        accomplish: 'Provide a concise teaching overview followed by a structured self-assessment table, checklist, and reflection prompts.',
        questions: [
          'What 4–5 statements can the reader rate from 1 to 5 to measure their starting point?',
          'What open-ended questions will help them articulate their primary goal for this workbook?'
        ],
        approaches: [
          'Keep the concept explanation under 400 words so the reader quickly moves into active participation.',
          'Use structured assessment rows, checkboxes, and lined response spaces.'
        ],
        subtopics: ['Core concept brief', 'Self-assessment rating table', 'Guided reflection prompts', 'Reader response space', 'Micro-commitment'],
        example: 'Exercise 1.1: The Energy & Priorities Audit. Rate each dimension from 1 (Depleted) to 5 (Thriving).',
        commonOmissions: [
          'Writing long textbook chapters with no interactive exercises.',
          'Asking vague questions instead of specific, actionable prompts.'
        ],
        completionCriteria: ['Teaching brief concise', 'Interactive exercise included', 'Reflection prompts clear'],
        structuredData: {
          exerciseCode: 'WORKSHEET 1.1',
          estimatedTime: '20 Minutes',
          assessmentStatements: [
            'I have a clear, written picture of my primary goal for the next 90 days.',
            'My daily schedule reflects my most important creative and personal priorities.',
            'I know which recurring habits or obligations are currently draining my focus.'
          ],
          reflectionPrompts: [
            '1. What is the single most important outcome you want to achieve by completing this workbook?',
            '2. Which current obligation or habit are you ready to simplify or release this week?'
          ],
          checklistItems: [
            'Completed the 1–5 Baseline Self-Assessment above',
            'Written my 90-day focus statement in the response box',
            'Scheduled a 15-minute weekly check-in on my calendar'
          ],
          responseLinesCount: 6
        }
      }
    ]
  },
  {
    id: 'self-help-transformation',
    name: 'Personal Transformation & Self-Help Guide',
    category: 'Self-help and personal development',
    bookType: 'book',
    tagline: 'Empathetic, structured guidance that walks readers from pain point to lasting personal change.',
    description: 'Combines compassionate storytelling, psychological insight, reflective exercises, and practical habits. Perfect for books on forgiveness, resilience, mindfulness, relationships, or personal growth.',
    intendedAudience: 'Coaches, counselors, personal growth writers, and authors sharing transformative life practices.',
    useCases: ['A practical guide to forgiveness and healing', 'Building resilient habits', 'Overcoming burnout and reclaiming joy'],
    keywords: ['self-help', 'personal development', 'forgiveness', 'healing', 'mindfulness', 'habits', 'resilience', 'growth', 'psychology', 'relationships'],
    accentColor: '#065F46',
    recommendedTrimSize: '5.5x8.5',
    recommendedFont: 'Lora',
    enabledTools: ['concepts', 'outlines', 'research', 'quotes', 'questions'],
    defaultFrontMatter: ['title_page', 'copyright', 'dedication', 'toc'],
    stages: [
      {
        stageKey: 'sh-empathy',
        title: 'Chapter 1: Meeting the Reader Where They Are',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 2500,
        purpose: 'Validate the reader’s struggle with warmth and honesty while dismantling shame.',
        accomplish: 'Build deep trust by showing the reader they are understood and that change is genuinely possible.',
        questions: [
          'What silent frustration does your reader feel at 2 a.m.?',
          'What false myths about this struggle make people feel worse?'
        ],
        approaches: [
          'Share a vulnerable personal moment where old coping strategies stopped working.',
          'Name the hidden emotional weight the reader has been carrying.'
        ],
        subtopics: ['Naming the struggle', 'Why willpower alone hasn’t worked', 'A compassionate reframe', 'Gentle reflection prompt'],
        example: '"Forgiveness is often sold as a sudden erasure of pain. No wonder so many of us feel we have failed at it before we even begin..."',
        commonOmissions: ['Sounding preachy or judgmental instead of walking alongside the reader.'],
        completionCriteria: ['Empathetic opening written', 'Core myth debunked']
      },
      {
        stageKey: 'sh-shift',
        title: 'Chapter 2: The Inner Shift — Seeing Differently',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 3000,
        purpose: 'Guide the reader through the foundational perspective shift required before external habits can stick.',
        accomplish: 'Help the reader replace a limiting narrative with a grounded, empowering truth.',
        questions: ['What belief keeps the reader stuck in their current cycle?'],
        approaches: ['Contrast the "Old Script" with the "New Practice" using side-by-side scenarios.'],
        subtopics: ['Recognizing the old script', 'The psychology of the shift', 'Story of transformation', 'Try This Today practice'],
        example: 'Shifting from "Why did this happen to me?" to "What do I need to heal from this right now?"',
        commonOmissions: ['Skipping straight to to-do lists without addressing underlying resistance.'],
        completionCriteria: ['Mindset shift articulated', 'Actionable reflection included']
      }
    ]
  },
  {
    id: 'nonfiction-authority',
    name: 'Signature Nonfiction & Thought Leadership',
    category: 'Nonfiction and educational books',
    bookType: 'book',
    tagline: 'Transform complex expertise or big ideas into a persuasive, reader-friendly book.',
    description: 'Built for educators, domain experts, journalists, and thinkers. Combines a compelling hook, clear thesis, evidence-backed frameworks, real-world case studies, and actionable takeaways.',
    intendedAudience: 'Subject-matter experts, educators, business thinkers, historians, and science communicators.',
    useCases: ['Big-idea cultural analysis', 'Professional guide or leadership book', 'Educational deep dive'],
    keywords: ['nonfiction', 'education', 'business', 'leadership', 'science', 'history', 'guide', 'framework', 'ideas'],
    accentColor: '#1E3A8A',
    recommendedTrimSize: '6x9',
    recommendedFont: 'Newsreader',
    enabledTools: ['concepts', 'outlines', 'research', 'quotes', 'questions'],
    defaultFrontMatter: ['title_page', 'copyright', 'toc', 'introduction'],
    stages: [
      {
        stageKey: 'nf-intro',
        title: 'Introduction: Why This Matters Now',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 2500,
        purpose: 'Hook the reader, diagnose the problem or mystery, introduce your central thesis, and map out the journey ahead.',
        accomplish: 'Convince the reader that this subject matters urgently to their life or work.',
        questions: ['What common assumption about your subject is incomplete or wrong?'],
        approaches: ['Open with a vivid story or counter-intuitive case study that illustrates the core problem.'],
        subtopics: ['The hook & inciting question', 'The reader’s problem', 'The central thesis', 'What the reader can expect'],
        example: '"For decades, organizations have treated creative burnout as an individual stamina problem. In reality, it is an architectural problem..."',
        commonOmissions: ['Failing to state the central thesis clearly before the end of the introduction.'],
        completionCriteria: ['Reader problem identified', 'Central thesis stated', 'Book roadmap outlined']
      },
      {
        stageKey: 'nf-ch1',
        title: 'Chapter 1: The Core Framework & Evidence',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 3500,
        purpose: 'Present your signature model, method, or guiding principles clearly and memorably.',
        accomplish: 'Give the reader a mental model they can remember and apply independently.',
        questions: ['What are the 3 to 5 pillars of your method or thesis?'],
        approaches: ['Break your big idea into named principles that build sequentially.'],
        subtopics: ['Overview of the framework', 'Principle 1 in depth', 'Case study evidence', 'Chapter synthesis'],
        example: 'The Three Horizons of Deep Craft: Protecting Attention, Structuring Inquiry, and Synthesizing Insight.',
        commonOmissions: ['Introducing jargon without defining it in plain language.'],
        completionCriteria: ['Core model defined', 'Concrete examples provided']
      }
    ]
  },
  {
    id: 'memoir-life-story',
    name: 'Memoir & Personal Narrative',
    category: 'Memoirs and autobiographies',
    bookType: 'book',
    tagline: 'Weave personal memories into a resonant story shaped around a universal theme.',
    description: 'Helps memoirists select transformative scenes, balance past action with present reflection, and honor emotional truth.',
    intendedAudience: 'Memoirists, family storytellers, and authors turning lived experience into art.',
    useCases: ['Memoir of forgiveness and family reconciliation', 'Coming-of-age across cultures', 'Heritage & family history'],
    keywords: ['memoir', 'autobiography', 'life story', 'family', 'forgiveness', 'memory'],
    accentColor: '#9A3412',
    recommendedTrimSize: '5.5x8.5',
    recommendedFont: 'Newsreader',
    enabledTools: ['concepts', 'outlines', 'characters', 'quotes', 'questions'],
    defaultFrontMatter: ['title_page', 'copyright', 'dedication'],
    stages: [
      {
        stageKey: 'mem-threshold',
        title: 'Chapter 1: The Defining Memory & Theme',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 2800,
        purpose: 'Anchor the reader in a vivid lived scene that encapsulates the central theme of your memoir.',
        accomplish: 'Establish both the "then" voice and the "now" reflective wisdom.',
        questions: ['Which single memory feels like the doorway into the larger story you are telling?'],
        approaches: ['Start inside a specific room or landscape on a pivotal day.'],
        subtopics: ['Sensory scene construction', 'The younger self’s perspective', 'The reflective narrator’s insight'],
        example: '"My father kept three watches in the cedar drawer, none of them set to the same hour..."',
        commonOmissions: ['Starting with genealogy instead of an emotionally charged scene.'],
        completionCriteria: ['Vivid opening scene written', 'Past experience and present reflection balanced']
      }
    ]
  },
  {
    id: 'literary-novel',
    name: 'Three-Act Novel & Fiction Architecture',
    category: 'Fiction and novels',
    bookType: 'book',
    tagline: 'A character-driven story architecture guiding you from inciting incident to resolution.',
    description: 'Designed for novelists who want classic narrative propulsion without losing literary depth.',
    intendedAudience: 'Novelists across literary fiction, mystery, historical fiction, and speculative fiction.',
    useCases: ['Literary novel', 'Historical mystery', 'Character-driven speculative fiction'],
    keywords: ['novel', 'fiction', 'story', 'character', 'plot', 'mystery', 'fantasy'],
    accentColor: '#7C2D12',
    recommendedTrimSize: '5.5x8.5',
    recommendedFont: 'Newsreader',
    enabledTools: ['concepts', 'outlines', 'characters', 'worldbuilding', 'quotes'],
    defaultFrontMatter: ['title_page', 'copyright', 'dedication', 'epigraph'],
    stages: [
      {
        stageKey: 'act1-world',
        title: 'Chapter 1: The Ordinary World & Flaw',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 3000,
        purpose: 'Introduce your protagonist in their everyday environment while revealing what is missing in their life.',
        accomplish: 'Make the reader care about the protagonist and understand their desire vs. need.',
        questions: ['What does your protagonist want more than anything at the start of the story?'],
        approaches: ['Show the protagonist navigating a routine conflict that highlights their defining flaw.'],
        subtopics: ['Opening image & atmosphere', 'Protagonist in action', 'Internal tension'],
        example: 'Show Clara keeping her suitcase packed in the closet six months after moving into the harbor apartment.',
        commonOmissions: ['Dumping backstory before the reader cares about the present scene.'],
        completionCriteria: ['Protagonist introduced in active scene', 'Setting grounded']
      },
      {
        stageKey: 'act1-inciting',
        title: 'Chapter 2: The Inciting Disruption',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 3200,
        purpose: 'Disrupt the protagonist’s equilibrium with an event or discovery that cannot be ignored.',
        accomplish: 'Present the central dramatic question and force the protagonist toward a choice.',
        questions: ['Why can’t the protagonist simply walk away from this disruption?'],
        approaches: ['An unexpected arrival, discovery, or loss that strips away safety.'],
        subtopics: ['The catalyst event', 'Initial resistance', 'Stakes made personal'],
        example: 'When the estranged brother returns asking for an alibi, the protagonist must choose.',
        commonOmissions: ['Failing to clarify what happens if the protagonist does nothing.'],
        completionCriteria: ['Catalyst scene written', 'Stakes established']
      },
      {
        stageKey: 'act2-threshold',
        title: 'Chapter 3: Crossing into Uncharted Territory',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 3500,
        purpose: 'Move the protagonist out of their comfort zone into the main arena of conflict.',
        accomplish: 'Test the protagonist with new rules, relationships, and obstacles.',
        questions: ['Who is the ally or foil who challenges the protagonist’s worldview?'],
        approaches: ['Introduce a secondary character whose strengths complement the protagonist’s blind spots.'],
        subtopics: ['Entering the new arena', 'Meeting allies and rivals', 'First test under pressure'],
        example: 'Arriving in the mountain parish, Julian realizes the townspeople speak of the disappearance as a debt paid.',
        commonOmissions: ['Losing sight of the protagonist’s emotional arc amidst plot mechanics.'],
        completionCriteria: ['New situation established']
      },
      {
        stageKey: 'act2-midpoint',
        title: 'Chapter 4: The Midpoint Shift & Revelation',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 3500,
        purpose: 'Shift the protagonist from reactive to proactive through a major revelation.',
        accomplish: 'Raise the stakes permanently and strip away false assumptions.',
        questions: ['What truth comes to light here that changes how the protagonist understands the conflict?'],
        approaches: ['A revelation that recontextualizes everything in Act I.'],
        subtopics: ['The turning point revelation', 'Commitment to a bolder course of action'],
        example: 'Discovering that the forged letters were written in her own mother’s hand.',
        commonOmissions: ['Letting the middle of the book sag with repetitive obstacles.'],
        completionCriteria: ['Midpoint shift drafted']
      },
      {
        stageKey: 'act3-climax',
        title: 'Chapter 5: The Crucible & Climax',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 4000,
        purpose: 'Bring external conflict and internal transformation to a single decisive confrontation.',
        accomplish: 'Force the protagonist to make a costly choice that proves how they have changed.',
        questions: ['What must the protagonist sacrifice to resolve the central conflict?'],
        approaches: ['Strip away external help so the final decision rests solely on the protagonist.'],
        subtopics: ['All-is-lost moment', 'The final confrontation', 'The decisive sacrifice'],
        example: 'Standing before the tribunal, Marcus chooses truth over safety.',
        commonOmissions: ['Resolving the climax through outside rescue rather than the protagonist’s choice.'],
        completionCriteria: ['Climactic confrontation completed']
      },
      {
        stageKey: 'act3-resolution',
        title: 'Chapter 6: Aftermath & Resonant Closing',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: true,
        targetWords: 2000,
        purpose: 'Show the new equilibrium and leave the reader with a lingering emotional resonance.',
        accomplish: 'Echo the opening image to highlight transformation.',
        questions: ['What final image mirrors or inverts the opening of Chapter 1?'],
        approaches: ['Return to a familiar setting now seen through transformed eyes.'],
        subtopics: ['Settling of consequences', 'Closing image'],
        example: 'Clara unpacks the suitcase at last, placing her grandmother’s compass on the sunlit windowsill.',
        commonOmissions: ['Over-explaining the moral of the story.'],
        completionCriteria: ['Resolution drafted']
      }
    ]
  },
  {
    id: 'devotional-journey',
    name: 'Devotional & Inspirational Companion',
    category: 'Devotional and inspirational books',
    bookType: 'book',
    tagline: 'Structured contemplative entries pairing wisdom readings with reflection, story, and prayer.',
    description: 'Each entry guides the reader through a focal passage, a grounded story, spiritual reflection, and a closing meditation.',
    intendedAudience: 'Spiritual writers, retreat leaders, chaplains, and inspirational authors.',
    useCases: ['30-day devotional on grace', 'Daily meditations', 'Spiritual reflections'],
    keywords: ['devotional', 'inspirational', 'faith', 'spiritual', 'prayer', 'meditation'],
    accentColor: '#5B21B6',
    recommendedTrimSize: '5x8',
    recommendedFont: 'Lora',
    enabledTools: ['concepts', 'outlines', 'quotes', 'questions'],
    defaultFrontMatter: ['title_page', 'copyright', 'dedication', 'toc'],
    stages: [
      {
        stageKey: 'dev-day1',
        title: 'Reflection 1: Laying Down the Heavy Stone',
        sectionType: 'reflection',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 1000,
        purpose: 'Guide the reader through a complete meditative entry: Focal Text, Narrative Reflection, Question, and Closing Intention.',
        accomplish: 'Connect an enduring truth to an ordinary moment of daily life.',
        questions: ['What brief quote or wisdom text anchors today’s meditation?'],
        approaches: ['Keep the focus on one clear insight per entry.'],
        subtopics: ['Focal passage', 'Grounded story & reflection', 'Pause to consider', 'Closing blessing'],
        example: 'Focal Theme: Unclenching the Fist.',
        commonOmissions: ['Forgetting the closing contemplative prompt.'],
        completionCriteria: ['Focal quote included', 'Reflection written']
      }
    ]
  },
  {
    id: 'blank-manuscript',
    name: 'Blank Custom Publication',
    category: 'Blank & Multi-Format Hybrid',
    bookType: 'blank',
    tagline: 'Start with a clean slate and freely mix articles, recipes, photo spreads, tables, and chapters.',
    description: 'Ideal for creators who want complete structural freedom from page one, combining any page layout from the studio library.',
    intendedAudience: 'All creators, designers, educators, and authors.',
    useCases: ['Hybrid zine or almanac', 'Custom visual book', 'Freeform publication'],
    keywords: ['blank', 'freeform', 'custom', 'open', 'general', 'hybrid'],
    accentColor: '#4A5568',
    recommendedTrimSize: '6x9',
    recommendedFont: 'Newsreader',
    enabledTools: ['concepts', 'outlines', 'research', 'characters', 'quotes', 'questions', 'discarded'],
    defaultFrontMatter: ['title_page', 'copyright', 'toc'],
    stages: [
      {
        stageKey: 'ch-1',
        title: 'Page 1: Opening Section',
        sectionType: 'chapter',
        layoutId: 'longform-chapter',
        isOptional: false,
        targetWords: 1500,
        purpose: 'Establish the opening layout, voice, or visual composition of your publication.',
        accomplish: 'Introduce your publication’s theme using prose, structured blocks, or visual layouts.',
        questions: ['What page layout best serves this opening section—prose, magazine feature, recipe, or visual spread?'],
        approaches: ['Switch page layout at any time using the Page Layout & Spread Composer.'],
        subtopics: ['Opening hook or visual', 'Core content', 'Forward transition'],
        example: 'Switch this page to any layout in the studio without losing your work.',
        commonOmissions: [],
        completionCriteria: ['Opening drafted']
      }
    ]
  }
];

function suggestAnglesForTopic(topicText = '') {
  const clean = (topicText || '').trim();
  const topicLabel = clean || 'your subject';
  const titleCap = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Craft & Living';

  return [
    {
      templateId: 'editorial-magazine',
      publicationType: 'magazine',
      genreLabel: 'Magazine & Editorial Issue',
      titleIdea: `${titleCap} Quarterly: Issue 01`,
      angle: `Design a visually rich magazine issue exploring ${topicLabel} through two-column feature articles, pull-quotes, interviews, and photo spreads.`,
      audience: 'Visual readers, enthusiasts, and subscribers.'
    },
    {
      templateId: 'culinary-cookbook',
      publicationType: 'cookbook',
      genreLabel: 'Cookbook & Culinary Guide',
      titleIdea: `The ${titleCap} Table: Seasonal Recipes & Rituals`,
      angle: `Gather structured recipes (with prep/cook times, ingredient groups, numbered steps, and chef notes) alongside stories of the table.`,
      audience: 'Home cooks, hosts, and food lovers.'
    },
    {
      templateId: 'informational-reference',
      publicationType: 'informational',
      genreLabel: 'Informational & Visual Reference Book',
      titleIdea: `The Field Guide to ${titleCap}: Principles, Diagrams & Data`,
      angle: `Explain ${topicLabel} clearly with structured headings, key-concept callout boxes, comparative data tables, labeled diagrams, and references.`,
      audience: 'Students, educators, practitioners, and curious minds.'
    },
    {
      templateId: 'fine-art-photobook',
      publicationType: 'photobook',
      genreLabel: 'Photo Book & Visual Lookbook',
      titleIdea: `${titleCap}: A Photographic Monograph`,
      angle: `Let photography lead the publication with full-bleed plates, multi-image gallery grids, curatorial captions, and camera metadata.`,
      audience: 'Art collectors, photography admirers, and design studios.'
    },
    {
      templateId: 'illustrated-storybook',
      publicationType: 'storybook',
      genreLabel: 'Illustrated Storybook',
      titleIdea: `The Little Lantern of ${titleCap}`,
      angle: `Pair facing-page illustration canvases with rhythmic read-aloud storytelling designed across visual page turns.`,
      audience: 'Young readers, families, and educators.'
    },
    {
      templateId: 'interactive-workbook',
      publicationType: 'workbook',
      genreLabel: 'Interactive Workbook & Manual',
      titleIdea: `The ${titleCap} Workbook: Assessments, Exercises & Action Plans`,
      angle: `Turn ${topicLabel} into hands-on self-assessment matrices, checklists, and guided reflection worksheets.`,
      audience: 'Workshop participants, coaching clients, and self-directed learners.'
    }
  ];
}

module.exports = {
  PUBLICATION_TYPES,
  PAGE_LAYOUT_LIBRARY,
  STARTER_TEMPLATES,
  suggestAnglesForTopic
};
