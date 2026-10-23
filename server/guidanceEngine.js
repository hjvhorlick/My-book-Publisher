const { STARTER_TEMPLATES, suggestAnglesForTopic } = require('./templatesData');
const { countWordsFromHtml } = require('./db');

function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildContextualGuidance({ project, chapter, allChapters = [], template }) {
  let storedGuidance = {};
  try {
    storedGuidance = JSON.parse(chapter?.guidance_json || '{}');
  } catch {
    storedGuidance = {};
  }

  // Fallback to matching template stage or sensible stage defaults
  const matchedStage = (template?.stages || []).find(s => s.stageKey === chapter?.stage_key)
    || (template?.stages || [])[0]
    || {};

  const purpose = storedGuidance.purpose || matchedStage.purpose || `Develop the core focus and narrative flow of "${chapter?.title || 'this chapter'}".`;
  const accomplish = storedGuidance.accomplish || matchedStage.accomplish || 'Communicate the key insight, scene, or argument clearly to your reader.';
  const questions = storedGuidance.questions || matchedStage.questions || [
    `What is the main takeaway or emotional shift in "${chapter?.title || 'this section'}"?`,
    `How does this chapter connect to your book's central idea: "${project?.central_idea || project?.title}"?`,
    'What concrete example or scene brings this section to life?'
  ];
  const approaches = storedGuidance.approaches || matchedStage.approaches || [
    'Open with a compelling scene, question, or observation that hooks the reader.',
    'Develop the core tension or thesis through clear sub-sections.',
    'Close with a transition or lingering insight that bridges to the next chapter.'
  ];
  const subtopics = storedGuidance.subtopics || matchedStage.subtopics || [
    'Opening hook or scene',
    'Core development & evidence',
    'Turning point or deeper insight',
    'Closing synthesis or transition'
  ];
  const example = storedGuidance.example || matchedStage.example || 'Open with a concrete moment before zooming out to the broader implication.';
  const commonOmissions = storedGuidance.commonOmissions || matchedStage.commonOmissions || [
    'Starting too abstractly without grounding the reader in a specific moment or problem.',
    'Ending abruptly without connecting back to the chapter’s core promise.'
  ];
  const completionCriteria = storedGuidance.completionCriteria || matchedStage.completionCriteria || [
    'Opening hook drafted',
    'Core section developed',
    'Closing transition refined'
  ];
  const completedCriteria = Array.isArray(storedGuidance.completedCriteria) ? storedGuidance.completedCriteria : [];
  const customNotes = storedGuidance.customNotes || '';

  // Analyze actual chapter content for contextual awareness
  const plainText = stripHtml(chapter?.content_html || '');
  const wordCount = countWordsFromHtml(chapter?.content_html || '');
  const targetWords = chapter?.target_words || matchedStage.targetWords || 2500;
  const progressPercent = Math.min(100, Math.round((wordCount / Math.max(1, targetWords)) * 100));

  const hasSubheadings = /<h[234][^>]*>/i.test(chapter?.content_html || '');
  const hasBlockquote = /<blockquote[^>]*>/i.test(chapter?.content_html || '');
  const hasDialogue = /[“"][^”"]+[”"]/.test(plainText);

  const dynamicMissingSuggestions = [...commonOmissions];
  if (wordCount < 150) {
    dynamicMissingSuggestions.unshift('This chapter is still in its earliest opening lines—consider drafting a rough opening paragraph before worrying about polish.');
  } else {
    if (!hasSubheadings && wordCount > 600 && project?.book_type !== 'fiction') {
      dynamicMissingSuggestions.unshift('Consider adding 1–2 subheadings (H2/H3) to break up long passages and guide the reader’s eye.');
    }
    if (!hasDialogue && !hasBlockquote && wordCount > 400) {
      dynamicMissingSuggestions.unshift(
        project?.book_type === 'fiction' || project?.book_type === 'memoir'
          ? 'Your draft currently has no direct dialogue—consider letting characters speak in a key moment to heighten immediacy.'
          : 'Consider including a highlighted quote, case-study voice, or callout block to vary the rhythm of exposition.'
      );
    }
  }

  // Determine suggested next step across the chapter and book
  const sortedChapters = [...allChapters].sort((a, b) => a.order_index - b.order_index);
  const currentIndex = sortedChapters.findIndex(c => c.id === chapter?.id);
  const nextChapter = currentIndex >= 0 && currentIndex + 1 < sortedChapters.length ? sortedChapters[currentIndex + 1] : null;

  let nextStepRecommendation = '';
  if (chapter?.status === 'skipped') {
    nextStepRecommendation = nextChapter
      ? `You have marked this section as skipped for now. Continue freely to "${nextChapter.title}" or return here whenever you like.`
      : 'You have marked this section as skipped. You can review your manuscript structure or jump to Book Design.';
  } else if (wordCount === 0) {
    nextStepRecommendation = `Start by drafting 150–300 words for "${chapter?.title}" using one of the starter approaches, or jot a quick synopsis in the outline.`;
  } else if (completedCriteria.length < completionCriteria.length && progressPercent < 50) {
    const nextUnchecked = completionCriteria.find(c => !completedCriteria.includes(c));
    nextStepRecommendation = nextUnchecked
      ? `Focus next on: "${nextUnchecked}" — or explore the suggested subtopics to expand your draft (${wordCount} / ${targetWords} words).`
      : `Continue developing your draft toward your target of ${targetWords} words.`;
  } else if (nextChapter) {
    nextStepRecommendation = `This chapter is taking strong shape (${wordCount} words). When ready, you can mark it complete or move to "${nextChapter.title}".`;
  } else {
    nextStepRecommendation = 'You have reached the final chapter in your current outline! Consider running a Manuscript Quality Review or previewing your layout in Book Design.';
  }

  // Interactive action responses for the 8 Living Template actions
  const interactiveResponses = {
    explain_step: {
      title: 'Purpose of This Stage',
      body: purpose,
      detail: `Goal: ${accomplish}`,
      contextNote: project?.central_idea ? `Anchored to your central idea: "${project.central_idea}"` : null
    },
    show_ideas: {
      title: 'Approaches & Creative Angles',
      items: approaches,
      contextNote: `Tailored for ${template?.name || 'your book'} (${chapter?.title || 'Current Chapter'})`
    },
    help_start: {
      title: 'Subtopics & Starter Scaffold',
      items: subtopics,
      scaffoldHtml: `<h2>${chapter?.title || 'Section Opening'}</h2><p>Begin here by grounding the reader in the central question of this chapter${project?.central_idea ? ` (${project.central_idea})` : ''}...</p><h3>${subtopics[0] || 'Key Point'}</h3><p>Develop your opening scene or example here...</p>`
    },
    ask_questions: {
      title: 'Questions to Clarify Your Thinking',
      items: questions
    },
    give_example: {
      title: 'Illustrative Example',
      body: example,
      contextNote: 'Use this as inspiration for tone and structure—adapt freely to your own voice.'
    },
    suggest_missing: {
      title: 'Elements & Omissions to Watch For',
      items: dynamicMissingSuggestions
    },
    next_step: {
      title: 'Suggested Next Step',
      body: nextStepRecommendation,
      nextChapterId: nextChapter?.id || null,
      nextChapterTitle: nextChapter?.title || null
    }
  };

  return {
    purpose,
    accomplish,
    questions,
    approaches,
    subtopics,
    example,
    commonOmissions: dynamicMissingSuggestions,
    completionCriteria,
    completedCriteria,
    customNotes,
    wordCount,
    targetWords,
    progressPercent,
    status: chapter?.status || 'drafting',
    isOptional: Boolean(chapter?.is_optional),
    nextStepRecommendation,
    nextChapter: nextChapter ? { id: nextChapter.id, title: nextChapter.title } : null,
    interactiveResponses
  };
}

module.exports = {
  buildContextualGuidance,
  suggestAnglesForTopic
};
