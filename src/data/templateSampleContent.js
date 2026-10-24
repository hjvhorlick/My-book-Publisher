/**
 * SAMPLE PAGE CONTENT FOR THE TEMPLATE CHOOSER
 *
 * The style chooser shows each template as a photograph of a finished book.
 * To make sure the author can compare that photograph with what the studio
 * will actually produce, the chooser also offers a *live* page drawn by the
 * real page renderer. A page with no words would be empty, so this module
 * supplies short, obviously-sample words for each category. They are never
 * saved to a project — they exist only for the preview.
 */

const SAMPLE_PHOTO_CAPTIONS = [
  { title: 'Morning light on the water', location: 'First day' },
  { title: 'The long way home', location: 'Afternoon' },
  { title: 'Quiet corners', location: 'At the house' },
  { title: 'Golden hour', location: 'Last evening' },
  { title: 'Keeping the small things', location: 'Collected' },
  { title: 'Until next time', location: 'Closing page' }
];

function categorySample(categoryId) {
  switch (categoryId) {
    case 'cookbook':
      return {
        course: 'Main course',
        servings: 'Serves 4',
        prepTime: '15 min',
        cookTime: '25 min',
        difficulty: 'Simple',
        ingredientsHtml: '<ul><li>2 cups plain flour</li><li>1 tsp instant yeast</li><li>1 cup warm water</li><li>2 tbsp olive oil</li><li>Fresh rosemary &amp; sea salt</li></ul>',
        stepsHtml: '<ol><li>Heat the oven and warm the water with the yeast.</li><li>Combine flour, salt, oil and water into a soft dough.</li><li>Rest the dough, then press it out on a floured board.</li><li>Add herbs and oil, and bake until golden.</li></ol>',
        chefNotes: 'A warm pan and a hot oven give the crispest base. Serve the flatbread straight from the oven, while the rosemary is still fragrant.'
      };
    case 'magazine':
      return {
        kicker: 'Design',
        byline: 'Words by the author',
        articleBody: '<p>The first part of any good story is noticing what is already there. A room, a street, a familiar walk — each one holds a detail worth writing down.</p><p>This feature gives the author room for a longer piece of writing, with a pull quote beside it to carry the strongest line of the story.</p>',
        pullQuote: '“Design is simply the care you take with the things you cannot see.”',
        sidebarContent: '<ul><li>Three ideas to try this week</li><li>One habit worth keeping</li><li>A note on the next chapter</li></ul>'
      };
    case 'storybook':
      return {
        storyText: '<p>Deep in the heart of the whispering wood, where the trees stood tall and the stars shone brightly, there hung an old, warm lantern.</p><p>It was not just any lantern; it held a friendly glow that lit the path for all the forest animals who travelled by night.</p>',
        moral: 'A small light is enough to guide someone home.'
      };
    case 'informational':
      return {
        overview: '<p>Start with the smallest useful step, then repeat it until it becomes the shape of the work. This guide walks through the method in plain language, with a short checklist at the end of each page.</p>',
        calloutTitle: 'Quick tip',
        calloutBody: 'Keep one page for one idea. When the idea grows, add a page — never squeeze it into the margin.',
        tableNotes: '<ul><li>Layout — clean, unfussy, easy to scan</li><li>Colour — one accent used with intent</li><li>Type — one heading voice, one reading voice</li></ul>',
        roadmapSteps: '<ol><li>Choose the outcome</li><li>List the three steps that matter</li><li>Do the first step today</li></ol>',
        comparisonLeft: '<p><strong>Option A</strong> — the simple route. Fewer decisions, faster to finish, easy to share.</p>',
        comparisonRight: '<p><strong>Option B</strong> — the crafted route. More control, more detail, and a slower, steadier finish.</p>'
      };
    case 'photobook':
      return {
        captions: SAMPLE_PHOTO_CAPTIONS,
        curatorialNote: '<p>A short note on this page: the places we returned to, and the small details that made the journey ours.</p>'
      };
    case 'workbook':
      return {
        overview: '<p>Write short answers in the space below. One honest sentence is worth more than a page of tidy intentions.</p>',
        calloutBody: 'Check off one item before the end of the day.'
      };
    case 'book':
    default:
      return {
        chapterText: '<p>In the heart of the forest, where ancient trees spoke in hushed tones, Elara found herself enchanted by the ethereal light. The air was thick with the scent of pine and magic, and the path ahead was dappled with shadows and sunlight.</p><p>She stepped cautiously, guided only by the soft glow emanating from the mysterious flowers lining the trail — and by the feeling, impossible to explain, that the house at the end of the path had been waiting for her.</p>',
        epigraph: 'Some doors only open for the people who keep walking.',
        marginNote: 'Note the change of season here — the light matters more than the distance.',
        pullQuote: 'The path was not lost. It was simply keeping its own time.'
      };
  }
}

/**
 * A page of obviously-sample words for one template, ready for the real
 * page renderer. Never saved anywhere.
 */
export function buildSamplePageForTemplate(categoryId, template = {}, options = {}) {
  const firstPage = Array.isArray(template?.defaultPages) ? template.defaultPages[0] || {} : {};
  const sample = categorySample(categoryId);
  return {
    id: `sample-page-${template?.id || 'template'}`,
    title: options.title || firstPage.title || template?.name || 'Sample page',
    subtitle: options.subtitle !== undefined ? options.subtitle : (firstPage.subtitle || ''),
    sectionType: options.sectionType || 'chapter',
    layoutId: template?.layoutId || 'longform-chapter',
    updatedAt: '2026-01-01T00:00:00.000Z',
    contentHtml: '',
    structuredData: {
      pageStructure: Number(options.pageStructure) || 0,
      isFlipped: false,
      ...sample
    }
  };
}

export function buildSampleProjectForTemplate({
  categoryId,
  template,
  title = 'Your Book Title',
  authorName = 'Your Name',
  fontFamily,
  design = {}
}) {
  return {
    id: `sample-project-${template?.id || 'template'}`,
    title,
    authorName,
    publicationType: categoryId,
    bookType: categoryId,
    coverConfig: {
      visualTemplateId: template?.id,
      fontFamily: fontFamily || template?.fontFamily,
      // A preview may explore a creative direction without saving anything.
      design: design && typeof design === 'object' ? design : {}
    }
  };
}
