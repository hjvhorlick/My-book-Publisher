export const BOOK_CATEGORIES = [
  {
    id: 'photobook',
    name: 'Photo Book & Album',
    shortName: 'Photo Book',
    sectionType: 'photo_spread',
    backendTemplateId: 'fine-art-photobook',
    trimSize: '10x8',
    tagline: 'Showcase your travel, family, wedding, or art photos with automatic mosaic frames and captions.',
    badge: '8 CURATED MOSAIC STYLES',
    accent: '#4F46E5',
    bgSoft: '#EEF2FF'
  },
  {
    id: 'cookbook',
    name: 'Cookbook & Recipe Book',
    shortName: 'Cookbook',
    sectionType: 'recipe',
    backendTemplateId: 'culinary-cookbook',
    trimSize: '7.5x9.5',
    tagline: 'Automatic recipe borders, shaded ingredient boxes, cooking times, and step-by-step instructions.',
    badge: '8 RECIPE CARD STYLES',
    accent: '#D97706',
    bgSoft: '#FEF3C7'
  },
  {
    id: 'magazine',
    name: 'Magazine & Newsletter',
    shortName: 'Magazine',
    sectionType: 'magazine_article',
    backendTemplateId: 'editorial-magazine',
    trimSize: '8.5x11',
    tagline: 'Automatic magazine top banners, two-column articles, highlight quotes, and feature photo frames.',
    badge: '8 EDITORIAL STYLES',
    accent: '#E11D48',
    bgSoft: '#FFE4E6'
  },
  {
    id: 'storybook',
    name: 'Children’s Picture Book',
    shortName: 'Picture Book',
    sectionType: 'storybook_spread',
    backendTemplateId: 'illustrated-storybook',
    trimSize: '8.5x8.5',
    tagline: 'Big decorative picture frames on one side and large, easy-to-read story words on the other.',
    badge: '8 STORYBOOK STYLES',
    accent: '#7C3AED',
    bgSoft: '#F3E8FF'
  },
  {
    id: 'informational',
    name: 'How-To & Guide Book',
    shortName: 'How-To Guide',
    sectionType: 'informational_unit',
    backendTemplateId: 'informational-reference',
    trimSize: '7x10',
    tagline: 'Automatic numbered step headers, lightbulb tip boxes, and clean comparison tables.',
    badge: '8 GUIDEBOOK STYLES',
    accent: '#0284C7',
    bgSoft: '#E0F2FE'
  },
  {
    id: 'book',
    name: 'Story, Memoir & Chapter Book',
    shortName: 'Chapter Book',
    sectionType: 'chapter',
    backendTemplateId: 'self-help-transformation',
    trimSize: '6x9',
    tagline: 'Automatic chapter title banners, ornate page borders, drop caps, and a clickable Index page.',
    badge: '8 CHAPTER BOOK STYLES',
    accent: '#334155',
    bgSoft: '#F1F5F9'
  }
];

export const TEMPLATES_BY_CATEGORY = {
  // ============================================================================
  // 1. PHOTO BOOK & ALBUM — 8 UNIQUE TEMPLATES
  // ============================================================================
  photobook: [
    {
      id: 'photo-warm-family',
      name: 'Warm Family Memory Album (4-Photo Mosaic)',
      desc: 'Warm amber border and cream page with 4 framed family photos in curated mosaic variations.',
      previewImage: '/template-previews/photo-warm-family.jpg',
      layoutId: 'photo-gallery-grid',
      borderStyle: 'rounded-frame',
      headingStyle: 'underline-bar',
      pageBg: '#FCF8F1',
      pageText: '#3E2723',
      borderColor: '#D97706',
      accentColor: '#B45309',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Family Memories', subtitle: 'Where the journey began' },
        { title: 'Around the Table', subtitle: 'Laughter, stories, and celebration' },
        { title: 'Outdoor Adventures', subtitle: 'Sunny days and favorite places' },
        { title: 'Moments to Keep', subtitle: 'Looking ahead together' }
      ]
    },
    {
      id: 'photo-modern-minimal',
      name: 'Crisp Modern Travel Grid (5-Photo Mosaic)',
      desc: 'Geometric indigo frame with a 5-photo Mediterranean travel mosaic and journal note card.',
      previewImage: '/template-previews/photo-modern-minimal.jpg',
      layoutId: 'photo-gallery-grid',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#FFFFFF',
      pageText: '#0F172A',
      borderColor: '#1E3A8A',
      accentColor: '#1E3A8A',
      fontFamily: 'Inter',
      defaultPages: [
        { title: 'Coastal Journeys | Mediterranean Explorations', subtitle: 'Day 1 highlights' },
        { title: 'Harbor Light & Cobblestone Lanes', subtitle: 'Day 2 highlights' },
        { title: 'Local Markets & Island Color', subtitle: 'Day 3 highlights' },
        { title: 'Journey Reflections', subtitle: 'Final travel plates' }
      ]
    },
    {
      id: 'photo-gallery-frame',
      name: 'Midnight Gallery Gold Frame',
      desc: 'Dark luxury tablet page with an automatic double-gold border and panoramic photo frames.',
      previewImage: '/template-previews/photo-gallery-frame.jpg',
      layoutId: 'photo-gallery-grid',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#071329',
      pageText: '#F8FAFC',
      borderColor: '#E5B84B',
      accentColor: '#E5B84B',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Journey to the Edge', subtitle: 'Alpen Glow & Ocean Skies' },
        { title: 'Morning Light & Horizons', subtitle: 'First series of framed photographs' },
        { title: 'Faces & Favorite Moments', subtitle: 'Candid portraits and memories' },
        { title: 'Golden Hour & Finale', subtitle: 'Closing photographs and notes' }
      ]
    },
    {
      id: 'photo-vintage-polaroid',
      name: 'Nostalgic Scrapbook Polaroid Mosaic',
      desc: 'Warm Kraft-paper album with 4 instant Polaroid-style photo frames and story captions.',
      previewImage: '/template-previews/photo-vintage-polaroid.jpg',
      layoutId: 'photo-gallery-grid',
      borderStyle: 'rounded-frame',
      headingStyle: 'centered-pill',
      pageBg: '#F5EBE0',
      pageText: '#292524',
      borderColor: '#A16207',
      accentColor: '#854D0E',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Summer Scrapbook Memories', subtitle: 'Snapshots from the road' },
        { title: 'Campfire & Starlight', subtitle: 'Favorite weekend moments' },
        { title: 'Beachside Postcards', subtitle: 'Sun, waves, and smiles' },
        { title: 'Best Days Together', subtitle: 'Scrapbook finale' }
      ]
    },
    {
      id: 'photo-botanical-sage',
      name: 'Botanical Sanctuary Sage Frame (3-Photo Mosaic)',
      desc: 'Soft sage-green botanical border with a wide top landscape photo and two framed nature close-ups.',
      previewImage: '/template-previews/photo-botanical-sage.jpg',
      layoutId: 'photo-gallery-grid',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#F7FAF7',
      pageText: '#14532D',
      borderColor: '#4D7C5D',
      accentColor: '#3F6B4E',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Botanical Sanctuary', subtitle: 'Forest trails & morning mist' },
        { title: 'Wildflowers in Bloom', subtitle: 'Colors of the meadow' },
        { title: 'Quiet Canopy Light', subtitle: 'Afternoon reflections' },
        { title: 'Seasons of Green', subtitle: 'Closing nature plates' }
      ]
    },
    {
      id: 'photo-wedding-ivory',
      name: 'Ivory & Rose-Gold Celebration Album',
      desc: 'Champagne-ivory silk page with double rose-gold filigree border and 4 celebration photo frames.',
      previewImage: '/template-previews/photo-wedding-ivory.jpg',
      layoutId: 'photo-gallery-grid',
      borderStyle: 'double-gold',
      headingStyle: 'underline-bar',
      pageBg: '#FFFDF9',
      pageText: '#4A2C2A',
      borderColor: '#C58B7A',
      accentColor: '#B07261',
      fontFamily: 'Newsreader',
      defaultPages: [
        { title: 'Forever Begins Today', subtitle: 'Opening celebration moments' },
        { title: 'Vows & Joyful Tears', subtitle: 'Ceremony highlights' },
        { title: 'Golden Hour Portraits', subtitle: 'Together in the garden' },
        { title: 'Dancing Under the Lights', subtitle: 'Evening celebration' }
      ]
    },
    {
      id: 'photo-monochrome-noir',
      name: 'Fine Art Monochrome Studio (3-Photo Mosaic)',
      desc: 'Matte charcoal-black gallery page with crisp silver-white frame and 3 dramatic fine-art photo slots.',
      previewImage: '/template-previews/photo-monochrome-noir.jpg',
      layoutId: 'photo-gallery-grid',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#111827',
      pageText: '#F9FAFB',
      borderColor: '#9CA3AF',
      accentColor: '#4B5563',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Urban Shadows & Light', subtitle: 'Monochrome study I' },
        { title: 'Lines of Concrete & Glass', subtitle: 'Monochrome study II' },
        { title: 'Quiet Street Portraits', subtitle: 'Monochrome study III' },
        { title: 'Nightfall Reflections', subtitle: 'Monochrome finale' }
      ]
    },
    {
      id: 'photo-sunset-terracotta',
      name: 'Golden Canyon Terracotta Mosaic (4-Photo)',
      desc: 'Warm terracotta-clay border with rounded desert-sand canvas and 4 adventure photo frames.',
      previewImage: '/template-previews/photo-sunset-terracotta.jpg',
      layoutId: 'photo-gallery-grid',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#FFF7ED',
      pageText: '#431407',
      borderColor: '#C2410C',
      accentColor: '#EA580C',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Golden Canyon Roadtrip', subtitle: 'Red rock horizons' },
        { title: 'Desert Trails at Dusk', subtitle: 'Canyon lookouts' },
        { title: 'Starlight Over the Mesa', subtitle: 'Campfire stories' },
        { title: 'The Open Highway Home', subtitle: 'Final miles' }
      ]
    }
  ],

  // ============================================================================
  // 2. COOKBOOK & RECIPE BOOK — 8 UNIQUE TEMPLATES
  // ============================================================================
  cookbook: [
    {
      id: 'cook-warm-border',
      name: 'Classic Framed Recipe Card',
      desc: 'Burnt-orange & cream double border with top dish photo, shaded Ingredients box, and Method steps.',
      previewImage: '/template-previews/cook-warm-border.jpg',
      layoutId: 'recipe-classic-card',
      borderStyle: 'double-gold',
      headingStyle: 'top-banner',
      pageBg: '#FCF8F0',
      pageText: '#1E293B',
      borderColor: '#C2591A',
      accentColor: '#C2591A',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Roasted Herb & Garlic Flatbread', subtitle: 'Ready in 25 minutes' },
        { title: 'Slow-Simmered Sunday Roast', subtitle: 'Family table centerpiece' },
        { title: 'Golden Skillet Cornbread', subtitle: 'Warm from the oven' },
        { title: 'Warm Honey & Berry Tart', subtitle: 'Sweet finish' }
      ]
    },
    {
      id: 'cook-modern-spread',
      name: 'Modern 2-Page Photo & Recipe',
      desc: 'Emerald green banner with flippable Dish Photo, mint-green Ingredients box, and Chef Tip card.',
      previewImage: '/template-previews/cook-modern-spread.jpg',
      layoutId: 'recipe-full-spread',
      borderStyle: 'clean-line',
      headingStyle: 'underline-bar',
      pageBg: '#FFFFFF',
      pageText: '#0F172A',
      borderColor: '#059669',
      accentColor: '#059669',
      fontFamily: 'Inter',
      defaultPages: [
        { title: 'Salmon & Greens Bowl', subtitle: 'Crisp herbs & lemon dressing' },
        { title: 'Pan-Seared Citrus Chicken', subtitle: 'Weeknight favorite' },
        { title: 'Roasted Root Vegetable Platter', subtitle: 'Colorful side dish' },
        { title: 'Dark Chocolate Olive Oil Cake', subtitle: 'Simple one-bowl dessert' }
      ]
    },
    {
      id: 'cook-cozy-bakehouse',
      name: 'Cozy Bakehouse & Cafe Style',
      desc: 'Soft blush-cream bakery frame with wide top photo, 3-column layout, and burgundy Baker’s Tip plaque.',
      previewImage: '/template-previews/cook-cozy-bakehouse.jpg',
      layoutId: 'recipe-classic-card',
      borderStyle: 'rounded-frame',
      headingStyle: 'centered-pill',
      pageBg: '#FDF6F6',
      pageText: '#1E293B',
      borderColor: '#882942',
      accentColor: '#882942',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Grandma’s Cinnamon Rolls', subtitle: 'Soft & golden' },
        { title: 'Vanilla Bean Shortbread', subtitle: 'Melt-in-your-mouth cookies' },
        { title: 'Lemon Curd Layer Cake', subtitle: 'Celebration bake' },
        { title: 'Homemade Berry Jam', subtitle: 'Small-batch recipe' }
      ]
    },
    {
      id: 'cook-mediterranean-sun',
      name: 'Mediterranean Sun & Cobalt Table',
      desc: 'Cobalt-blue & terracotta border with top dish photo, blue Ingredients card, and step-by-step Method.',
      previewImage: '/template-previews/cook-mediterranean-sun.jpg',
      layoutId: 'recipe-classic-card',
      borderStyle: 'double-gold',
      headingStyle: 'top-banner',
      pageBg: '#F8FAFC',
      pageText: '#0F172A',
      borderColor: '#1D4ED8',
      accentColor: '#1D4ED8',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Grilled Lemon & Oregano Sea Bass', subtitle: 'Coastal kitchen favorite' },
        { title: 'Warm Chickpea & Herb Salad', subtitle: 'Bright midday plate' },
        { title: 'Garlic & Rosemary Focaccia', subtitle: 'Crisp golden crust' },
        { title: 'Orange Blossom Honey Cake', subtitle: 'Sweet citrus finish' }
      ]
    },
    {
      id: 'cook-rustic-farmhouse',
      name: 'Rustic Farmhouse Cast-Iron Card',
      desc: 'Vintage cast-iron black double border on warm parchment with skillet photo and pantry ingredients box.',
      previewImage: '/template-previews/cook-rustic-farmhouse.jpg',
      layoutId: 'recipe-classic-card',
      borderStyle: 'double-gold',
      headingStyle: 'underline-bar',
      pageBg: '#F5EFE6',
      pageText: '#1C1917',
      borderColor: '#292524',
      accentColor: '#44403C',
      fontFamily: 'Newsreader',
      defaultPages: [
        { title: 'Cast-Iron Apple & Sage Pork Chops', subtitle: 'One-skillet farmhouse dinner' },
        { title: 'Buttermilk Herb Biscuits', subtitle: 'Flaky golden layers' },
        { title: 'Heirloom Tomato & Cheddar Galette', subtitle: 'Garden harvest bake' },
        { title: 'Spiced Peach Cobbler', subtitle: 'Warm cast-iron dessert' }
      ]
    },
    {
      id: 'cook-plant-botanical',
      name: 'Fresh Plant-Based & Botanical Kitchen',
      desc: 'Leaf-green rounded border with side-by-side dish photo, nutrition/prep pills, and green Ingredients card.',
      previewImage: '/template-previews/cook-plant-botanical.jpg',
      layoutId: 'recipe-full-spread',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#F7FEE7',
      pageText: '#1A2E05',
      borderColor: '#4D7C0F',
      accentColor: '#3F6212',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Green Harvest Buddha Bowl', subtitle: 'Avocado, quinoa & tahini drizzle' },
        { title: 'Crispy Sweet Potato & Black Bean Tacos', subtitle: 'Bright lime crema' },
        { title: 'Creamy Coconut Red Lentil Soup', subtitle: 'Warm ginger & turmeric' },
        { title: 'Raw Cacao & Almond Energy Bites', subtitle: 'No-bake treat' }
      ]
    },
    {
      id: 'cook-french-bistro',
      name: 'Parisian Bistro Navy & Gold Card',
      desc: 'Deep navy and gold double-ruled French bistro border with classic serif title and Chef Pairing box.',
      previewImage: '/template-previews/cook-french-bistro.jpg',
      layoutId: 'recipe-classic-card',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#FFFDF7',
      pageText: '#0F172A',
      borderColor: '#1E3A8A',
      accentColor: '#B45309',
      fontFamily: 'Newsreader',
      defaultPages: [
        { title: 'Classic Coq au Vin', subtitle: 'Braised with herbs & pearl onions' },
        { title: 'Caramelized Onion & Gruyère Tart', subtitle: 'Crisp puff pastry' },
        { title: 'Pan-Roasted Duck Breast with Cherries', subtitle: 'Bistro centerpiece' },
        { title: 'Vanilla Bean Crème Brûlée', subtitle: 'Crisp caramelized sugar top' }
      ]
    },
    {
      id: 'cook-fiesta-spice',
      name: 'Vibrant Street Food & Spice Kitchen',
      desc: 'Bold chili-red and saffron-gold banner with vivid food frame, shaded golden Ingredients box, and fast steps.',
      previewImage: '/template-previews/cook-fiesta-spice.jpg',
      layoutId: 'recipe-classic-card',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#FFFBEB',
      pageText: '#450A0A',
      borderColor: '#DC2626',
      accentColor: '#D97706',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Smoky Chipotle Street Tacos', subtitle: 'Charred corn & pickled onions' },
        { title: 'Crispy Garlic & Chili Night-Market Noodles', subtitle: '15-minute wok favorite' },
        { title: 'Grilled Mango & Lime Skewers', subtitle: 'Sweet & smoky glaze' },
        { title: 'Warm Cinnamon Churros with Chocolate', subtitle: 'Crisp fiesta dessert' }
      ]
    }
  ],

  // ============================================================================
  // 3. MAGAZINE & NEWSLETTER — 8 UNIQUE TEMPLATES
  // ============================================================================
  magazine: [
    {
      id: 'mag-bold-editorial',
      name: 'Bold Modern Feature Magazine',
      desc: 'Crimson masthead banner, two-column article flow, tall feature photo, and framed pull-quote box.',
      previewImage: '/template-previews/mag-bold-editorial.jpg',
      layoutId: 'magazine-two-column',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#FFFFFF',
      pageText: '#0F172A',
      borderColor: '#C8102E',
      accentColor: '#C8102E',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'The Modern Revival: Harmony in Design', subtitle: 'Inside this issue' },
        { title: 'Cover Story: Designing Bright Spaces', subtitle: 'How light transforms a room' },
        { title: 'Creator Spotlight & Q&A', subtitle: 'An inspiring conversation' },
        { title: 'Top 5 Recommendations', subtitle: 'What to try this month' }
      ]
    },
    {
      id: 'mag-lifestyle-minimal',
      name: 'Calm Lifestyle & Wellness Issue',
      desc: 'Sage-green banner, large indoor-sanctuary photo, airy headlines, and Quick Benefits side card.',
      previewImage: '/template-previews/mag-lifestyle-minimal.jpg',
      layoutId: 'magazine-visual-grid',
      borderStyle: 'rounded-frame',
      headingStyle: 'centered-pill',
      pageBg: '#F0FDF4',
      pageText: '#0F172A',
      borderColor: '#7C9075',
      accentColor: '#7C9075',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Nurturing Your Sanctuary', subtitle: 'Simple daily habits' },
        { title: 'Bringing Nature Indoors', subtitle: 'Easy plants for every room' },
        { title: 'Weekend Reset Guide', subtitle: 'Rest and recharge' }
      ]
    },
    {
      id: 'mag-indigo-digest',
      name: 'Club & Community Newsletter',
      desc: 'Double-indigo border with bold section banners, Community Spotlight photo, and Upcoming Events list.',
      previewImage: '/template-previews/mag-indigo-digest.jpg',
      layoutId: 'magazine-cover-feature',
      borderStyle: 'double-gold',
      headingStyle: 'underline-bar',
      pageBg: '#FAF7F0',
      pageText: '#0F172A',
      borderColor: '#1E3A5F',
      accentColor: '#1E3A5F',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Maplewood Community Digest', subtitle: 'What happened this month' },
        { title: 'Member Story of the Month', subtitle: 'Community spotlight' },
        { title: 'Upcoming Events & Dates', subtitle: 'Save the date' }
      ]
    },
    {
      id: 'mag-art-culture',
      name: 'Black & Gold Art & Culture Issue',
      desc: 'Luxury dark-and-gold editorial masthead, gallery feature photo, and gold-bordered quote callout.',
      previewImage: '/template-previews/mag-art-culture.jpg',
      layoutId: 'magazine-two-column',
      borderStyle: 'double-gold',
      headingStyle: 'top-banner',
      pageBg: '#FFFFFF',
      pageText: '#0F172A',
      borderColor: '#B45309',
      accentColor: '#0F172A',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Modern Canvas: Autumn Exhibition', subtitle: 'Gallery feature' },
        { title: 'Inside the Artist’s Studio', subtitle: 'Creative process' },
        { title: 'Curator’s Picks of the Season', subtitle: 'Highlights & notes' }
      ]
    },
    {
      id: 'mag-tech-future',
      name: 'Next Horizon Tech & Science Digest',
      desc: 'Deep cyber-navy and electric-cyan masthead, innovation feature photo, and cyan Key Specs callout box.',
      previewImage: '/template-previews/mag-tech-future.jpg',
      layoutId: 'magazine-two-column',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#F8FAFC',
      pageText: '#0F172A',
      borderColor: '#0284C7',
      accentColor: '#0F172A',
      fontFamily: 'Inter',
      defaultPages: [
        { title: 'Breakthroughs in Clean Energy', subtitle: 'Next Horizon Issue' },
        { title: 'Inside the Smart Robotics Lab', subtitle: 'Hardware spotlight' },
        { title: 'Top 5 Tools Changing How We Work', subtitle: 'Lab tested' }
      ]
    },
    {
      id: 'mag-travel-wanderlust',
      name: 'Wanderlust Adventure & Travel Journal',
      desc: 'Warm ochre-gold masthead ribbon, sweeping destination photo, and Traveler’s Essentials sidebar card.',
      previewImage: '/template-previews/mag-travel-wanderlust.jpg',
      layoutId: 'magazine-visual-grid',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#FFFBEB',
      pageText: '#1C1917',
      borderColor: '#D97706',
      accentColor: '#B45309',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Into the Northern Wilds', subtitle: 'Fjords, trails & mountain huts' },
        { title: 'Hidden Coastal Villages', subtitle: 'Off the beaten path' },
        { title: 'Packing Light for Any Season', subtitle: 'Field gear guide' }
      ]
    },
    {
      id: 'mag-fashion-vogue',
      name: 'Atelier Couture & Style Lookbook',
      desc: 'Blush-ivory editorial spread with rose-burgundy masthead, portrait lookbook frame, and style quote box.',
      previewImage: '/template-previews/mag-fashion-vogue.jpg',
      layoutId: 'magazine-two-column',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#FAF5F5',
      pageText: '#1E293B',
      borderColor: '#BE185D',
      accentColor: '#9D174D',
      fontFamily: 'Newsreader',
      defaultPages: [
        { title: 'The New Silhouette: Sculpted Grace', subtitle: 'Autumn Lookbook' },
        { title: 'Color Palette of the Season', subtitle: 'Fabric & texture notes' },
        { title: 'Backstage at the Atelier', subtitle: 'Designer interview' }
      ]
    },
    {
      id: 'mag-sports-action',
      name: 'Peak Performance Sports & Fitness Monthly',
      desc: 'High-energy orange-and-slate masthead, action photography frame, and training highlights box.',
      previewImage: '/template-previews/mag-sports-action.jpg',
      layoutId: 'magazine-two-column',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#FFFFFF',
      pageText: '#0F172A',
      borderColor: '#EA580C',
      accentColor: '#C2410C',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Champion Mindset: Built for the Finish Line', subtitle: 'Training special' },
        { title: '5-Day Strength & Mobility Plan', subtitle: 'Coach playbook' },
        { title: 'Recovery & Fueling Guide', subtitle: 'Peak nutrition' }
      ]
    }
  ],

  // ============================================================================
  // 4. CHILDREN’S PICTURE BOOK — 8 UNIQUE TEMPLATES
  // ============================================================================
  storybook: [
    {
      id: 'story-starlight-frame',
      name: 'Starlight Storybook Frame',
      desc: 'Ornate purple-and-gold border with an arched illustration frame on one side and parchment story words on the other.',
      previewImage: '/template-previews/story-starlight-frame.jpg',
      layoutId: 'storybook-illustrated-spread',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#FDF6E2',
      pageText: '#1E1B4B',
      borderColor: '#F59E0B',
      accentColor: '#4C1D95',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'The Lantern in the Whispering Wood', subtitle: 'Where the adventure starts' },
        { title: 'Across the Starlit Bridge', subtitle: 'A new friend appears' },
        { title: 'The Secret Garden Gate', subtitle: 'A magical discovery' },
        { title: 'Home Under the Stars', subtitle: 'A cozy bedtime ending' }
      ]
    },
    {
      id: 'story-sunny-adventure',
      name: 'Sunny Day Picture Book',
      desc: 'Cheerful golden-yellow border with playful colorful titles, big story sentences, and rounded picture frame.',
      previewImage: '/template-previews/story-sunny-adventure.jpg',
      layoutId: 'storybook-full-bleed',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#FFFFFF',
      pageText: '#1E293B',
      borderColor: '#F59E0B',
      accentColor: '#0284C7',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'The Adventure Begins!', subtitle: 'Up into the blue sky' },
        { title: 'Over the Green Hills', subtitle: 'Waving to the birds' },
        { title: 'A Soft Meadow Landing', subtitle: 'Back home for tea' }
      ]
    },
    {
      id: 'story-ocean-treasure',
      name: 'Coral Reef & Ocean Adventure Frame',
      desc: 'Sparkling aqua-blue wave border with sea-treasure illustration box and big bubbly story text.',
      previewImage: '/template-previews/story-ocean-treasure.jpg',
      layoutId: 'storybook-illustrated-spread',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#ECFEFF',
      pageText: '#0F172A',
      borderColor: '#0891B2',
      accentColor: '#0284C7',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Captain Finn’s Coral Reef', subtitle: 'Down beneath the waves' },
        { title: 'The Singing Seahorse Choir', subtitle: 'A pearl in the kelp forest' },
        { title: 'Home to the Sunny Lagoon', subtitle: 'Splashing with friends' }
      ]
    },
    {
      id: 'story-woodland-friends',
      name: 'Woodland Acorn & Forest Friends',
      desc: 'Forest-green and warm cream storybook frame for animal tales, treehouse adventures, and nature stories.',
      previewImage: '/template-previews/story-woodland-friends.jpg',
      layoutId: 'storybook-illustrated-spread',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#FEFCE8',
      pageText: '#1E293B',
      borderColor: '#15803D',
      accentColor: '#166534',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Oliver’s Acorn Treehouse', subtitle: 'Morning in the oak tree' },
        { title: 'The Blackberry Picnic', subtitle: 'Sharing with Hedgehog' },
        { title: 'Cozy Beneath the Leaves', subtitle: 'Autumn twilight' }
      ]
    },
    {
      id: 'story-cosmic-rocket',
      name: 'Cosmic Galaxy & Space Explorer',
      desc: 'Starry midnight-indigo space frame with glowing cyan rocket illustration box and bold adventure text.',
      previewImage: '/template-previews/story-cosmic-rocket.jpg',
      layoutId: 'storybook-illustrated-spread',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#0F172A',
      pageText: '#F8FAFC',
      borderColor: '#38BDF8',
      accentColor: '#6366F1',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Zoom to the Silver Moon!', subtitle: '3, 2, 1 — Blast off!' },
        { title: 'Dancing Around Saturn’s Rings', subtitle: 'Zero-gravity fun' },
        { title: 'Touchdown Back on Earth', subtitle: 'Mission complete' }
      ]
    },
    {
      id: 'story-fairy-castle',
      name: 'Royal Castle & Fairy Tale Scroll',
      desc: 'Enchanted rose-and-gold storybook border with royal scroll headings and fairy-tale picture frame.',
      previewImage: '/template-previews/story-fairy-castle.jpg',
      layoutId: 'storybook-illustrated-spread',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#FDF2F8',
      pageText: '#1E1B4B',
      borderColor: '#DB2777',
      accentColor: '#9D174D',
      fontFamily: 'Newsreader',
      defaultPages: [
        { title: 'The Crystal Castle Gate', subtitle: 'Once upon a kingdom' },
        { title: 'The Dragon Who Loved Pancakes', subtitle: 'A friendly surprise' },
        { title: 'The Royal Garden Ball', subtitle: 'Happily ever after' }
      ]
    },
    {
      id: 'story-dino-jungle',
      name: 'Prehistoric Dino Jungle Safari',
      desc: 'Vibrant lime-and-amber jungle frame with big dinosaur picture box and playful stomping story words.',
      previewImage: '/template-previews/story-dino-jungle.jpg',
      layoutId: 'storybook-full-bleed',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#F7FEE7',
      pageText: '#1E293B',
      borderColor: '#65A30D',
      accentColor: '#CA8A04',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Rex and the Giant Fern', subtitle: 'Stomp, stomp, stomp!' },
        { title: 'Across the Bubbling Geyser', subtitle: 'Triceratops says hello' },
        { title: 'Sunset in Dino Valley', subtitle: 'Big dino yawn' }
      ]
    },
    {
      id: 'story-pastel-lullaby',
      name: 'Sweet Dreams Cloud & Lullaby Book',
      desc: 'Soft lavender-and-periwinkle bedtime frame with dreamy cloud picture box and gentle rhymes.',
      previewImage: '/template-previews/story-pastel-lullaby.jpg',
      layoutId: 'storybook-illustrated-spread',
      borderStyle: 'rounded-frame',
      headingStyle: 'centered-pill',
      pageBg: '#F5F3FF',
      pageText: '#1E1B4B',
      borderColor: '#8B5CF6',
      accentColor: '#6D28D9',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Goodnight, Sleepy Clouds', subtitle: 'When the moon rises high' },
        { title: 'The Lullaby of the Stars', subtitle: 'Hush now, little bear' },
        { title: 'Sweet Dreams Till Morning', subtitle: 'Peaceful slumber' }
      ]
    }
  ],

  // ============================================================================
  // 5. HOW-TO & GUIDE BOOK — 8 UNIQUE TEMPLATES
  // ============================================================================
  informational: [
    {
      id: 'info-blue-guide',
      name: 'Clear Step-by-Step Guide',
      desc: 'Ocean-blue header banner, numbered step instructions, lightbulb Quick Tip box, and comparison table.',
      previewImage: '/template-previews/info-blue-guide.jpg',
      layoutId: 'info-reference-unit',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#FFFFFF',
      pageText: '#0F172A',
      borderColor: '#0284C7',
      accentColor: '#0284C7',
      fontFamily: 'Inter',
      defaultPages: [
        { title: 'How-To Guide: Getting Started', subtitle: 'Everything you need to know first' },
        { title: 'Step-by-Step Process', subtitle: 'Follow these 4 simple steps' },
        { title: 'Quick Comparison Table', subtitle: 'Compare your options' },
        { title: 'Common Questions & Tips', subtitle: 'Helpful answers' }
      ]
    },
    {
      id: 'info-emerald-handbook',
      name: 'Modern Field & Study Handbook',
      desc: 'Underlined bold topic header, shaded green Key Takeaways box, diagram slot, and Reference Chart table.',
      previewImage: '/template-previews/info-emerald-handbook.jpg',
      layoutId: 'info-comparison-spread',
      borderStyle: 'rounded-frame',
      headingStyle: 'underline-bar',
      pageBg: '#FFFFFF',
      pageText: '#0F172A',
      borderColor: '#059669',
      accentColor: '#059669',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Section 1.1: Core Assessment', subtitle: 'Key ideas explained simply' },
        { title: 'Section 1.2: Field Procedure', subtitle: 'How it works in practice' },
        { title: 'Section 1.3: Reference Chart', subtitle: 'Quick review' }
      ]
    },
    {
      id: 'info-amber-workshop',
      name: 'DIY Workshop & Craft Builder Guide',
      desc: 'Warm amber craft banner with tool/material checklist, step-by-step build cards, and Builder Tip box.',
      previewImage: '/template-previews/info-amber-workshop.jpg',
      layoutId: 'info-reference-unit',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#FFFBEB',
      pageText: '#1E293B',
      borderColor: '#D97706',
      accentColor: '#B45309',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Project 1: Tools & Materials List', subtitle: 'Prepare your workspace' },
        { title: 'Project 2: Measure, Cut & Assemble', subtitle: 'Step-by-step build' },
        { title: 'Project 3: Finishing & Care Tips', subtitle: 'Long-lasting results' }
      ]
    },
    {
      id: 'info-purple-masterclass',
      name: 'Creative Masterclass & Course Playbook',
      desc: 'Royal violet module banner with core lesson steps, Instructor Note callout, and action exercise table.',
      previewImage: '/template-previews/info-purple-masterclass.jpg',
      layoutId: 'info-reference-unit',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#FAF5FF',
      pageText: '#1E1B4B',
      borderColor: '#7C3AED',
      accentColor: '#6D28D9',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Module 1: Core Foundations', subtitle: 'Master the fundamentals' },
        { title: 'Module 2: Practical Framework', subtitle: 'Step-by-step execution' },
        { title: 'Module 3: Review & Action Plan', subtitle: 'Put it into practice' }
      ]
    },
    {
      id: 'info-teal-wellness',
      name: 'Health, Fitness & Habit Coaching Guide',
      desc: 'Fresh teal coaching header with daily routine steps, Coach Tip highlight box, and habit tracker table.',
      previewImage: '/template-previews/info-teal-wellness.jpg',
      layoutId: 'info-comparison-spread',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#F0FDFA',
      pageText: '#0F172A',
      borderColor: '#0D9488',
      accentColor: '#0F766E',
      fontFamily: 'Inter',
      defaultPages: [
        { title: 'Habit 1: Morning Energy Routine', subtitle: 'Start strong in 15 minutes' },
        { title: 'Habit 2: Balanced Movement & Fuel', subtitle: 'Simple daily guide' },
        { title: 'Habit 3: Evening Reset & Recovery', subtitle: 'Restful habits' }
      ]
    },
    {
      id: 'info-slate-business',
      name: 'Executive Strategy & Startup Blueprint',
      desc: 'Crisp slate-navy executive header, strategic roadmap steps, Key Metric callout, and benchmark table.',
      previewImage: '/template-previews/info-slate-business.jpg',
      layoutId: 'info-comparison-spread',
      borderStyle: 'clean-line',
      headingStyle: 'underline-bar',
      pageBg: '#F8FAFC',
      pageText: '#0F172A',
      borderColor: '#334155',
      accentColor: '#1E293B',
      fontFamily: 'Inter',
      defaultPages: [
        { title: 'Part 1: Executive Overview & Goals', subtitle: 'Strategic priorities' },
        { title: 'Part 2: 90-Day Execution Roadmap', subtitle: 'Milestones & owners' },
        { title: 'Part 3: Key Metrics & Benchmarks', subtitle: 'Measuring success' }
      ]
    },
    {
      id: 'info-coral-parenting',
      name: 'Home & Family Organization Manual',
      desc: 'Warm coral-rose header banner, room-by-room declutter steps, Home Tip callout, and schedule chart.',
      previewImage: '/template-previews/info-coral-parenting.jpg',
      layoutId: 'info-reference-unit',
      borderStyle: 'rounded-frame',
      headingStyle: 'top-banner',
      pageBg: '#FFF1F2',
      pageText: '#1E293B',
      borderColor: '#E11D48',
      accentColor: '#BE123C',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Zone 1: Kitchen & Pantry Flow', subtitle: 'Easy everyday organization' },
        { title: 'Zone 2: Family Command Center', subtitle: 'Schedules & checklists' },
        { title: 'Zone 3: 10-Minute Weekly Reset', subtitle: 'Keep it tidy effortlessly' }
      ]
    },
    {
      id: 'info-indigo-tech',
      name: 'Software & Digital Quick-Start Manual',
      desc: 'Modern indigo tech banner with numbered setup steps, Pro Tip callout box, and reference table.',
      previewImage: '/template-previews/info-indigo-tech.jpg',
      layoutId: 'info-reference-unit',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#EEF2FF',
      pageText: '#1E1B4B',
      borderColor: '#4F46E5',
      accentColor: '#4338CA',
      fontFamily: 'Inter',
      defaultPages: [
        { title: 'Step 1: Quick Setup & Installation', subtitle: 'Up and running in 5 minutes' },
        { title: 'Step 2: Core Features Tour', subtitle: 'Most useful tools explained' },
        { title: 'Step 3: Troubleshooting & Shortcuts', subtitle: 'Fast answers' }
      ]
    }
  ],

  // ============================================================================
  // 6. STORY, MEMOIR & CHAPTER BOOK — 8 UNIQUE TEMPLATES
  // ============================================================================
  book: [
    {
      id: 'book-modern-clean',
      name: 'Modern Framed Chapter Book',
      desc: 'Deep navy outer frame, cream inner page, centered CHAPTER pill badge, and clean initial drop-cap.',
      previewImage: '/template-previews/book-modern-clean.jpg',
      layoutId: 'longform-chapter',
      borderStyle: 'clean-line',
      headingStyle: 'centered-pill',
      pageBg: '#FAF9F5',
      pageText: '#0F172A',
      borderColor: '#1E1B4B',
      accentColor: '#1E1B4B',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'The Whispering Winds', subtitle: 'Where the story starts' },
        { title: 'The Turning Point', subtitle: 'Everything changes' },
        { title: 'The Journey Forward', subtitle: 'Overcoming challenges' },
        { title: 'What We Learned', subtitle: 'Closing chapter' }
      ]
    },
    {
      id: 'book-warm-classic',
      name: 'Warm Gold-Bordered Story Book',
      desc: 'Antique parchment paper with double-gold filigree border, underlined chapter numeral, and illuminated drop-cap.',
      previewImage: '/template-previews/book-warm-classic.jpg',
      layoutId: 'longform-chapter',
      borderStyle: 'double-gold',
      headingStyle: 'underline-bar',
      pageBg: '#F7F0DF',
      pageText: '#1E293B',
      borderColor: '#B45309',
      accentColor: '#B45309',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'The Whispering Glen', subtitle: 'How it all began' },
        { title: 'Memorable Moments', subtitle: 'Stories we still tell' },
        { title: 'Looking Back with Gratitude', subtitle: 'Final reflections' }
      ]
    },
    {
      id: 'book-vintage-memoir',
      name: 'Sepia Heritage & Life Story Memoir',
      desc: 'Warm sepia-linen page with double bronze heritage border, memoir chapter header, and bronze drop-cap.',
      previewImage: '/template-previews/book-vintage-memoir.jpg',
      layoutId: 'longform-chapter',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#F5EBE0',
      pageText: '#292524',
      borderColor: '#92400E',
      accentColor: '#78350F',
      fontFamily: 'Newsreader',
      defaultPages: [
        { title: 'The House on Sycamore Lane', subtitle: 'Childhood summers' },
        { title: 'Letters Across the Ocean', subtitle: 'Years of adventure' },
        { title: 'Lessons Passed Down', subtitle: 'Family legacy' }
      ]
    },
    {
      id: 'book-thriller-noir',
      name: 'Midnight Mystery & Suspense Novel',
      desc: 'Dark slate-noir page with crimson-red double border, bold mystery chapter badge, and crimson drop-cap.',
      previewImage: '/template-previews/book-thriller-noir.jpg',
      layoutId: 'longform-chapter',
      borderStyle: 'clean-line',
      headingStyle: 'centered-pill',
      pageBg: '#0F172A',
      pageText: '#F8FAFC',
      borderColor: '#DC2626',
      accentColor: '#EF4444',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'The Midnight Cipher', subtitle: '11:45 PM at the harbor' },
        { title: 'Footsteps in the Fog', subtitle: 'The second clue' },
        { title: 'The Final Verdict', subtitle: 'Truth revealed' }
      ]
    },
    {
      id: 'book-romance-blush',
      name: 'Botanical Rose & Romance Chapter',
      desc: 'Soft blush-rose page with delicate berry-gold border, floral ornament divider, and rose drop-cap.',
      previewImage: '/template-previews/book-romance-blush.jpg',
      layoutId: 'longform-chapter',
      borderStyle: 'rounded-frame',
      headingStyle: 'centered-pill',
      pageBg: '#FFF5F7',
      pageText: '#1E293B',
      borderColor: '#DB2777',
      accentColor: '#BE185D',
      fontFamily: 'Lora',
      defaultPages: [
        { title: 'Letters from Provence', subtitle: 'An unexpected summer' },
        { title: 'Under the Olive Trees', subtitle: 'Evening by the fountain' },
        { title: 'A Promise Kept', subtitle: 'Autumn return' }
      ]
    },
    {
      id: 'book-scifi-cosmos',
      name: 'Celestial Sci-Fi & Fantasy Chronicle',
      desc: 'Deep starlight-navy page with glowing cyan geometric border, chronicle header, and cyan drop-cap.',
      previewImage: '/template-previews/book-scifi-cosmos.jpg',
      layoutId: 'longform-chapter',
      borderStyle: 'double-gold',
      headingStyle: 'centered-pill',
      pageBg: '#0B132B',
      pageText: '#F8FAFC',
      borderColor: '#06B6D4',
      accentColor: '#0891B2',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Citadel of the Stars', subtitle: 'Beyond the third orbital gate' },
        { title: 'The Sapphire Nebula', subtitle: 'Signal from the deep' },
        { title: 'Dawn of a New World', subtitle: 'Final chronicle' }
      ]
    },
    {
      id: 'book-poetry-ivory',
      name: 'Minimalist Ivory Poetry & Verse Frame',
      desc: 'Fine warm-ivory paper with subtle stone-gray double frame and centered verse layout.',
      previewImage: '/template-previews/book-poetry-ivory.jpg',
      layoutId: 'longform-chapter',
      borderStyle: 'double-gold',
      headingStyle: 'underline-bar',
      pageBg: '#FFFFF8',
      pageText: '#1C1917',
      borderColor: '#78716C',
      accentColor: '#57534E',
      fontFamily: 'Newsreader',
      defaultPages: [
        { title: 'Songs of Still Water', subtitle: 'First collection of verses' },
        { title: 'Lanterns in the Rain', subtitle: 'Evening reflections' },
        { title: 'First Light of Spring', subtitle: 'Closing poems' }
      ]
    },
    {
      id: 'book-historical-crest',
      name: 'Royal Burgundy & Parchment Chronicle',
      desc: 'Regal parchment page with deep burgundy-and-gold double border and illuminated royal drop-cap.',
      previewImage: '/template-previews/book-historical-crest.jpg',
      layoutId: 'longform-chapter',
      borderStyle: 'double-gold',
      headingStyle: 'underline-bar',
      pageBg: '#FDF8EE',
      pageText: '#1C1917',
      borderColor: '#991B1B',
      accentColor: '#7F1D1D',
      fontFamily: 'Newsreader',
      defaultPages: [
        { title: 'The Crown of Valencia', subtitle: 'Book the First' },
        { title: 'The Winter Siege', subtitle: 'Book the Second' },
        { title: 'The Treaty of Oak', subtitle: 'Book the Third' }
      ]
    }
  ],

  workbook: [
    {
      id: 'work-teal-planner',
      name: 'Interactive Checklist & Lined Workbook',
      desc: 'Automatic teal header banner, tick-box checklists, and pre-drawn dashed writing lines.',
      previewImage: '/template-previews/work-teal-planner.jpg',
      layoutId: 'workbook-interactive-sheet',
      borderStyle: 'clean-line',
      headingStyle: 'top-banner',
      pageBg: '#FFFFFF',
      pageText: '#0F172A',
      borderColor: '#0D9488',
      accentColor: '#0F766E',
      fontFamily: 'Inter',
      defaultPages: [
        { title: 'Worksheet 1: My Main Goals', subtitle: 'Set your focus' },
        { title: 'Worksheet 2: Weekly Action Checklist', subtitle: 'Simple steps to check off' }
      ]
    },
    {
      id: 'work-indigo-journal',
      name: 'Guided Reflection Journal',
      desc: 'Soft framed journal pages with question prompts and roomy writing lines.',
      previewImage: '/template-previews/work-indigo-journal.jpg',
      layoutId: 'workbook-interactive-sheet',
      borderStyle: 'rounded-frame',
      headingStyle: 'centered-pill',
      pageBg: '#FAF8F2',
      pageText: '#1E1B4B',
      borderColor: '#6D5ACF',
      accentColor: '#4338CA',
      fontFamily: 'Plus Jakarta Sans',
      defaultPages: [
        { title: 'Gratitude Prompt', subtitle: 'Start the day clearly' },
        { title: 'Evening Reflection', subtitle: 'What went well today' }
      ]
    }
  ]
};

export const VISUAL_FONT_STYLES = [
  {
    id: 'Plus Jakarta Sans',
    name: 'Modern Studio Clean',
    sampleTitle: 'Bright & Easy to Read',
    sampleBody: 'Crisp, modern letters that look great on tablets for magazines, photo books, and guides.',
    cssFamily: '"Plus Jakarta Sans", "Inter", sans-serif'
  },
  {
    id: 'Inter',
    name: 'Crisp Magazine Sans',
    sampleTitle: 'Bold & Clear Headlines',
    sampleBody: 'Ultra-clean everyday font designed for effortless reading on tablets and e-readers.',
    cssFamily: '"Inter", system-ui, sans-serif'
  },
  {
    id: 'Lora',
    name: 'Warm Storyteller',
    sampleTitle: 'Cozy & Inviting Pages',
    sampleBody: 'A friendly book font that feels warm for cookbooks, family albums, and stories.',
    cssFamily: 'Georgia, "Lora", serif'
  },
  {
    id: 'Newsreader',
    name: 'Classic Printed Book',
    sampleTitle: 'Timeless Chapter Style',
    sampleBody: 'Traditional book style with graceful headings and smooth paragraphs.',
    cssFamily: 'Cambria, Georgia, serif'
  }
];

export function getVisualTemplateForProject(project) {
  const catId = project?.publicationType || project?.bookType || 'photobook';
  const catList = TEMPLATES_BY_CATEGORY[catId] || TEMPLATES_BY_CATEGORY.photobook;
  const savedVisualId = project?.coverConfig?.visualTemplateId;
  return catList.find(t => t.id === savedVisualId) || catList[0];
}
