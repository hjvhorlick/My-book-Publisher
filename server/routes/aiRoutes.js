const express = require('express');
const { db } = require('../db');
const { requireAuth, verifyProjectOwnership } = require('../auth');
const { encryptCredential, decryptCredential } = require('../aiCredentialCrypto');
const {
  PROVIDERS,
  listModelsWithProvider,
  generateWithProvider,
  trimToWordLimit,
  countWords
} = require('../aiProviders');

const router = express.Router();

function getProviderRows(userId) {
  return db.prepare(`
    SELECT * FROM ai_provider_settings
    WHERE user_id = ?
    ORDER BY priority ASC, provider ASC
  `).all(userId);
}

function formatProviderSettings(userId) {
  const rows = getProviderRows(userId);
  const rowById = new Map(rows.map((row) => [row.provider, row]));
  const envGeminiKey = process.env.GEMINI_API_KEY || '';
  return Object.values(PROVIDERS).map((provider, index) => {
    const row = rowById.get(provider.id);
    let keyLastFour = '';
    if (row?.encrypted_api_key) {
      try {
        const decrypted = decryptCredential(row.encrypted_api_key);
        if (decrypted && decrypted.length >= 10 && !decrypted.includes('\n') && !decrypted.includes(' ')) {
          keyLastFour = decrypted.slice(-4);
        } else {
          keyLastFour = '••••';
        }
      } catch {
        keyLastFour = '????';
      }
    }
    return {
      id: provider.id,
      name: provider.name,
      description: provider.id === 'gemini' && envGeminiKey
        ? 'Connected to Google Gemini via AI Studio. Ready for writing assistance.'
        : provider.description,
      configured: Boolean(row?.encrypted_api_key),
      keyLastFour,
      model: row?.model || provider.defaultModel,
      priority: Number(row?.priority || index + 1),
      usage: {
        requests: Number(row?.request_count || 0),
        promptTokens: Number(row?.prompt_tokens || 0),
        completionTokens: Number(row?.completion_tokens || 0),
        totalTokens: Number(row?.total_tokens || 0),
        lastUsedAt: row?.last_used_at || null
      },
      lastError: row?.last_error || ''
    };
  });
}

function recordProviderSuccess(userId, providerId, usage) {
  db.prepare(`
    UPDATE ai_provider_settings
    SET request_count = request_count + 1,
        prompt_tokens = prompt_tokens + ?,
        completion_tokens = completion_tokens + ?,
        total_tokens = total_tokens + ?,
        last_used_at = ?,
        last_error = '',
        updated_at = ?
    WHERE user_id = ? AND provider = ?
  `).run(
    Number(usage.promptTokens || 0),
    Number(usage.completionTokens || 0),
    Number(usage.totalTokens || 0),
    new Date().toISOString(),
    new Date().toISOString(),
    userId,
    providerId
  );
}

function recordProviderError(userId, providerId, error) {
  const message = String(error?.message || 'Provider request failed.').slice(0, 300);
  db.prepare(`
    UPDATE ai_provider_settings SET last_error = ?, updated_at = ?
    WHERE user_id = ? AND provider = ?
  `).run(message, new Date().toISOString(), userId, providerId);
}

router.get('/providers', requireAuth, (req, res) => {
  return res.json({ providers: formatProviderSettings(req.user.id) });
});

router.put('/providers/:providerId', requireAuth, (req, res) => {
  const provider = PROVIDERS[req.params.providerId];
  if (!provider) return res.status(404).json({ error: 'Unknown AI provider.' });

  try {
    const existing = db.prepare(`
      SELECT * FROM ai_provider_settings WHERE user_id = ? AND provider = ?
    `).get(req.user.id, provider.id);
    const suppliedKey = String(req.body?.apiKey || '').trim();
    if (!existing && !suppliedKey) {
      return res.status(400).json({ error: 'Add an API key before enabling this provider.' });
    }
    if (suppliedKey && suppliedKey.length < 12) {
      return res.status(400).json({ error: 'That API key looks too short. Check the key and try again.' });
    }

    const model = String(req.body?.model || existing?.model || provider.defaultModel)
      .trim()
      .slice(0, 120);
    if (!/^[A-Za-z0-9._:/-]+$/.test(model)) {
      return res.status(400).json({ error: 'Use a valid provider model ID.' });
    }
    const priority = Math.max(1, Math.min(99, Number(req.body?.priority) || 1));
    const encryptedKey = suppliedKey
      ? encryptCredential(suppliedKey)
      : existing.encrypted_api_key;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO ai_provider_settings (
        user_id, provider, encrypted_api_key, model, priority,
        request_count, prompt_tokens, completion_tokens, total_tokens,
        last_used_at, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, NULL, '', ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        encrypted_api_key = excluded.encrypted_api_key,
        model = excluded.model,
        priority = excluded.priority,
        updated_at = excluded.updated_at
    `).run(req.user.id, provider.id, encryptedKey, model, priority, now, now);

    return res.json({ providers: formatProviderSettings(req.user.id) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not save provider settings.' });
  }
});

router.delete('/providers/:providerId', requireAuth, (req, res) => {
  if (!PROVIDERS[req.params.providerId]) {
    return res.status(404).json({ error: 'Unknown AI provider.' });
  }
  db.prepare('DELETE FROM ai_provider_settings WHERE user_id = ? AND provider = ?')
    .run(req.user.id, req.params.providerId);
  return res.json({ providers: formatProviderSettings(req.user.id) });
});

router.post('/providers/:providerId/models', requireAuth, async (req, res) => {
  const provider = PROVIDERS[req.params.providerId];
  if (!provider) return res.status(404).json({ error: 'Unknown AI provider.' });
  const row = db.prepare(`
    SELECT * FROM ai_provider_settings WHERE user_id = ? AND provider = ?
  `).get(req.user.id, provider.id);
  const suppliedKey = String(req.body?.apiKey || '').trim();
  const envGeminiKey = process.env.GEMINI_API_KEY || '';
  let effectiveKey = suppliedKey;
  if (!effectiveKey && row?.encrypted_api_key) {
    try {
      effectiveKey = decryptCredential(row.encrypted_api_key);
    } catch {
      effectiveKey = '';
    }
  }
  if (provider.id === 'gemini' && (!effectiveKey || effectiveKey.includes(' ') || effectiveKey.includes('\n'))) {
    effectiveKey = envGeminiKey || effectiveKey;
  }
  if (!effectiveKey) {
    return res.status(400).json({ error: `Paste or save a ${provider.name} API key first.` });
  }

  try {
    const models = await listModelsWithProvider({
      providerId: provider.id,
      apiKey: effectiveKey
    });
    return res.json({ provider: provider.name, models });
  } catch (error) {
    return res.status(502).json({ error: error.message || `Could not load ${provider.name} models.` });
  }
});

router.post('/providers/:providerId/test', requireAuth, async (req, res) => {
  const provider = PROVIDERS[req.params.providerId];
  if (!provider) return res.status(404).json({ error: 'Unknown AI provider.' });
  const row = db.prepare(`
    SELECT * FROM ai_provider_settings WHERE user_id = ? AND provider = ?
  `).get(req.user.id, provider.id);
  const envGeminiKey = process.env.GEMINI_API_KEY || '';
  if (!row && !(provider.id === 'gemini' && envGeminiKey)) {
    return res.status(404).json({ error: 'Save an API key for this provider first.' });
  }

  try {
    let key = '';
    try {
      key = row ? decryptCredential(row.encrypted_api_key) : '';
    } catch {
      key = '';
    }
    if (provider.id === 'gemini' && (!key || key.includes(' ') || key.includes('\n') || key.length < 12)) {
      key = envGeminiKey || key;
    }
    const result = await generateWithProvider({
      providerId: provider.id,
      apiKey: key,
      model: row?.model || provider.defaultModel,
      prompt: 'Reply with exactly the single word: connected',
      maxWords: 2
    });
    recordProviderSuccess(req.user.id, provider.id, result.usage);
    return res.json({ success: true, provider: provider.name, usage: result.usage });
  } catch (error) {
    recordProviderError(req.user.id, provider.id, error);
    return res.status(502).json({ error: error.message || 'Provider connection test failed.' });
  }
});

router.post('/generate', requireAuth, async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  const maxWords = Math.max(1, Math.min(500, Math.floor(Number(req.body?.maxWords) || 120)));
  if (prompt.length < 20 || prompt.length > 16000) {
    return res.status(400).json({ error: 'The generated prompt must be between 20 and 16,000 characters.' });
  }

  let configuredRows = getProviderRows(req.user.id)
    .filter((row) => Boolean(row.encrypted_api_key) && Boolean(PROVIDERS[row.provider]));
  if (configuredRows.length === 0 && process.env.GEMINI_API_KEY) {
    configuredRows = [{
      user_id: req.user.id,
      provider: 'gemini',
      encrypted_api_key: encryptCredential(process.env.GEMINI_API_KEY),
      model: 'gemini-3.8-flash',
      priority: 1
    }];
  }
  if (configuredRows.length === 0) {
    return res.status(409).json({ error: 'Set up an AI provider in the header before generating text.' });
  }

  const fallbackProviders = [];
  const providerErrors = [];
  for (const row of configuredRows) {
    const provider = PROVIDERS[row.provider];
    try {
      let key = '';
      try {
        key = decryptCredential(row.encrypted_api_key);
      } catch {
        key = '';
      }
      if (provider.id === 'gemini' && (!key || key.includes(' ') || key.includes('\n') || key.length < 12)) {
        key = process.env.GEMINI_API_KEY || key;
      }
      const result = await generateWithProvider({
        providerId: provider.id,
        apiKey: key,
        model: row.model,
        prompt,
        maxWords
      });
      const text = trimToWordLimit(result.text, maxWords);
      const usage = result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      recordProviderSuccess(req.user.id, provider.id, usage);
      return res.json({
        text,
        wordCount: countWords(text),
        maxWords,
        provider: provider.id,
        providerName: provider.name,
        model: result.model,
        fallbackProviders,
        usage
      });
    } catch (error) {
      recordProviderError(req.user.id, provider.id, error);
      providerErrors.push({ provider: provider.name, message: error.message });
      fallbackProviders.push(provider.name);
      // A configured fallback is tried after quota/rate exhaustion and transient/provider failures.
      // Invalid user keys and model IDs are also non-fatal to the remaining provider chain.
    }
  }

  const finalError = providerErrors[providerErrors.length - 1];
  const allQuotaLimited = providerErrors.length > 0 && providerErrors.every(({ message }) =>
    /quota|resource_exhausted|rate.?limit|insufficient.?quota|billing|budget.?exceed|429|402/i.test(message)
  );
  return res.status(allQuotaLimited ? 429 : 502).json({
    error: allQuotaLimited
      ? 'All configured AI providers are out of quota or rate-limited. Add a fallback provider or try again later.'
      : `AI generation failed${finalError ? ` with ${finalError.provider}: ${finalError.message}` : '.'}`,
    triedProviders: providerErrors.map(({ provider }) => provider)
  });
});

function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function analyzeRepetition(text = '') {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !['their', 'there', 'which', 'would', 'could', 'should', 'about', 'through', 'before', 'after', 'where', 'while', 'every', 'other', 'these', 'those', 'because', 'between'].includes(w));

  const counts = {};
  for (const w of words) {
    counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

function tightenProse(passage = '') {
  if (!passage.trim()) return '';
  return passage
    .replace(/\bvery\s+unique\b/gi, 'unique')
    .replace(/\bin\s+order\s+to\b/gi, 'to')
    .replace(/\bdue\s+to\s+the\s+fact\s+that\b/gi, 'because')
    .replace(/\bat\s+this\s+point\s+in\s+time\b/gi, 'now')
    .replace(/\b began\s+to\s+(\w+)\b/gi, ' $1ed')
    .replace(/\bthat\s+really\b/gi, 'that')
    .replace(/\bactually\s+/gi, '')
    .replace(/\bbasically\s+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

router.get('/status', requireAuth, (req, res) => {
  const hasCloudKey = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  return res.json({
    cloudProviderConfigured: hasCloudKey,
    providerName: process.env.OPENAI_API_KEY
      ? 'OpenAI API'
      : process.env.ANTHROPIC_API_KEY
        ? 'Anthropic API'
        : 'Local Editorial & Literary Engine (Privacy-First On-Server)',
    privacyNotice: hasCloudKey
      ? 'External AI assistance is only invoked when you explicitly click an assistant action. Your manuscript is never sent automatically in the background.'
      : 'No external cloud AI key is configured. All editorial analysis, brainstorming, repetition checks, and synopsis generation run locally on this server with 100% data privacy.'
  });
});

router.post('/assist', requireAuth, async (req, res) => {
  try {
    const {
      action = 'brainstorm',
      projectId,
      chapterId,
      selectedText = '',
      customPrompt = ''
    } = req.body || {};

    let project = null;
    let chapter = null;
    let notes = [];
    let allChapters = [];

    if (projectId) {
      const ownership = verifyProjectOwnership(projectId, req.user.id);
      if (ownership.error) {
        return res.status(ownership.status).json({ error: ownership.error });
      }
      project = ownership.project;
      allChapters = db.prepare('SELECT id, title, synopsis, word_count, content_html FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(projectId);
      notes = db.prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC').all(projectId);
      if (chapterId) {
        chapter = db.prepare('SELECT * FROM chapters WHERE id = ? AND project_id = ?').get(chapterId, projectId);
      }
    }

    const chapterPlain = stripHtml(chapter?.content_html || '');
    const passage = String(selectedText || '').trim() || chapterPlain.slice(0, 900);
    const bookTitle = project?.title || 'Your Manuscript';
    const centralIdea = project?.central_idea || project?.description || 'the central premise of your work';
    const chapterTitle = chapter?.title || 'Current Chapter';

    let result = {
      action,
      providerMode: 'local_editorial_engine',
      title: 'Editorial Assistant Suggestion',
      explanation: '',
      originalText: String(selectedText || '').trim(),
      suggestedText: '',
      items: []
    };

    switch (action) {
      case 'brainstorm': {
        result.title = `Brainstorming Angles for "${chapterTitle}"`;
        result.explanation = `Generated using your book’s central premise ("${centralIdea}") and current manuscript progress.`;
        result.items = [
          `Contrast expectation with reality: Open the next section by showing what most people assume about "${chapterTitle}", then pivot to a lived story or surprising truth.`,
          `Sensory or concrete anchor: Introduce a tangible object, place, or specific moment that embodies "${centralIdea}".`,
          `Raise the stakes: Ask what happens if the reader or protagonist ignores the core tension in this chapter.`
        ];
        result.suggestedText = `<h3>Exploring ${chapterTitle}</h3><p>At the heart of ${bookTitle} lies a question we rarely ask out loud: ${centralIdea} In this section, consider how a single turning point reveals the deeper pattern beneath the surface.</p>`;
        break;
      }

      case 'outline': {
        result.title = `Suggested Structural Outline for "${chapterTitle}"`;
        result.explanation = 'A four-part narrative progression you can insert or adapt into your chapter.';
        result.items = [
          '1. The Hook & Context: Ground the reader in a concrete scene or pressing question.',
          '2. The Core Tension: Unpack why conventional approaches or assumptions fall short.',
          '3. The Shift / Insight: Introduce the central insight or dramatic turn of this chapter.',
          '4. Resonance & Bridge: Synthesize the takeaway and point toward the next chapter.'
        ];
        result.suggestedText = `<h2>${chapterTitle}: Structural Outline</h2><h3>I. Opening Hook &amp; Context</h3><p>Establish the immediate scene or question...</p><h3>II. Complicating the Premise</h3><p>Explore the deeper obstacle or tension...</p><h3>III. The Turning Point</h3><p>Present the central insight or character choice...</p><h3>IV. Closing Bridge</h3><p>Connect to the next movement of ${bookTitle}...</p>`;
        break;
      }

      case 'clarify_questions': {
        result.title = 'Clarifying Questions for Deeper Drafting';
        result.explanation = 'Reflect on these questions to sharpen your argument or narrative scene.';
        result.items = [
          `If a reader only remembered one sentence from "${chapterTitle}", which sentence should it be?`,
          `Where is the emotional or intellectual friction in this section—and are you addressing it directly?`,
          `What concrete story, case study, or dialogue can replace abstract explanation here?`,
          customPrompt ? `Regarding "${customPrompt}": What would the strongest counter-argument or obstacle look like?` : 'What unspoken question might a skeptical reader have at this point in the book?'
        ];
        result.suggestedText = `<p><em>Author Reflection Note:</em> What is the single most important shift the reader experiences in ${chapterTitle}?</p>`;
        break;
      }

      case 'improve_clarity': {
        const source = passage || 'Select a passage in the editor or write a paragraph in the chapter to analyze clarity and readability.';
        const cleaned = tightenProse(source);
        const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);
        const avgWords = sentences.length
          ? Math.round(source.split(/\s+/).length / sentences.length)
          : 0;

        result.title = 'Clarity & Readability Refinement';
        result.originalText = source;
        result.explanation = `Analyzed ${sentences.length} sentence(s) (average ${avgWords} words/sentence). Removed filler qualifiers and tightened phrasing while preserving your voice.`;
        result.suggestedText = cleaned !== source
          ? cleaned
          : `${source}\n\n[Editorial Note: Your phrasing is already clean and direct. To heighten rhythm further, consider varying the length of your closing sentence.]`;
        break;
      }

      case 'alternative_wording': {
        const source = passage || 'The truth of the matter is that change takes deliberate practice over time.';
        result.title = 'Alternative Phrasing Options';
        result.originalText = source;
        result.explanation = 'Three tonal variations of your passage so you can compare cadence and emphasis before choosing.';
        const concise = tightenProse(source);
        result.items = [
          `Direct & Concise: "${concise}"`,
          `Reflective & Literary: "Beneath the surface, what endures is not sudden force, but patient, deliberate practice: ${concise}"`,
          `Conversational & Warm: "Here is what matters most as we walk through this: ${concise}"`
        ];
        result.suggestedText = concise;
        break;
      }

      case 'check_repetition': {
        const repeated = analyzeRepetition(passage || chapterPlain);
        result.title = 'Repetition & Echo Analysis';
        if (repeated.length === 0) {
          result.explanation = 'No overused content words (3+ occurrences) were detected in this passage. Your vocabulary variation looks healthy.';
          result.items = ['Vocabulary variation is balanced across this section.'];
        } else {
          result.explanation = 'The following significant words appear frequently in this section. Intentional repetition can build rhythm, while accidental echoes can be varied:';
          result.items = repeated.map(([word, count]) => `"${word}" — appears ${count} times in this section`);
        }
        result.suggestedText = '';
        break;
      }

      case 'check_consistency': {
        const charNotes = notes.filter(n => n.note_type === 'character');
        const findings = [];
        if (charNotes.length > 0) {
          charNotes.forEach(cn => {
            const firstName = cn.title.split(/\s+/)[0];
            const mentioned = chapterPlain.toLowerCase().includes(firstName.toLowerCase());
            findings.push(`Character "${cn.title}": ${mentioned ? 'Present in current chapter' : 'Not yet mentioned in current chapter'}.`);
          });
        }
        findings.push(`Book Title & Central Premise alignment: Chapter "${chapterTitle}" contains ${chapter?.word_count || 0} words toward your ${chapter?.target_words || 2500}-word target.`);
        result.title = 'Continuity & Consistency Check';
        result.explanation = 'Cross-referenced your current chapter against your project metadata and character/research notes.';
        result.items = findings;
        break;
      }

      case 'suggest_missing': {
        const hasQuote = /<blockquote/i.test(chapter?.content_html || '');
        const hasSubhead = /<h[23]/i.test(chapter?.content_html || '');
        result.title = 'Potential Missing Elements';
        result.explanation = `Evaluated "${chapterTitle}" for structural completeness and reader engagement.`;
        result.items = [
          !hasSubhead ? 'Subheadings: Adding 1–2 section headings will make this chapter easier to navigate.' : 'Section headings are present and well-structured.',
          !hasQuote ? ' Illustrative Quote or Callout: Consider adding a blockquote, dialogue beat, or case-study excerpt to anchor the middle of the chapter.' : 'Blockquote / callout emphasis is included.',
          'Closing Bridge: Ensure the final paragraph prepares the reader emotionally or logically for the next chapter.'
        ];
        break;
      }

      case 'summarize_notes': {
        result.title = 'Synthesis of Project Research & Notes';
        if (notes.length === 0) {
          result.explanation = 'You have not added any research or planning notes to this book yet.';
          result.suggestedText = '<p>No notes found yet. Visit Research &amp; Notes to capture sources, character profiles, and ideas.</p>';
        } else {
          result.explanation = `Synthesized ${notes.length} note(s) from your planning workspace.`;
          result.items = notes.slice(0, 6).map(n => `[${n.note_type.toUpperCase()}] ${n.title}: ${n.content.slice(0, 140)}...`);
          result.suggestedText = `<h3>Research &amp; Planning Synthesis</h3><ul>${notes.slice(0, 5).map(n => `<li><strong>${n.title}:</strong> ${n.content}</li>`).join('')}</ul>`;
        }
        break;
      }

      case 'develop_character': {
        result.title = 'Character & Narrative Depth Prompts';
        result.explanation = 'Use these character dimension prompts to deepen motivation, subtext, and agency.';
        result.items = [
          'External Desire vs. Internal Need: What does the character think they want, and what deeper truth do they actually need?',
          'The Contradiction: Give the character one trait that complicates their public persona (e.g., a fearless investigator who cannot bear silence).',
          'Subtext in Dialogue: Have the character talk about a mundane object in the room when they are actually arguing about trust or fear.'
        ];
        result.suggestedText = `<p><strong>Character Study Beat:</strong> Show the character making a small, revealing choice under pressure before any dialogue is spoken.</p>`;
        break;
      }

      case 'review_structure': {
        const totalWords = allChapters.reduce((acc, c) => acc + (c.word_count || 0), 0);
        result.title = 'Chapter & Manuscript Structure Review';
        result.explanation = `Reviewed ${allChapters.length} chapter(s) totaling ${totalWords.toLocaleString()} words.`;
        result.items = allChapters.map((c, idx) => `Chapter ${idx + 1} ("${c.title}"): ${c.word_count || 0} words — ${c.word_count > 300 ? 'Substantial draft' : 'Needs expansion'}`);
        break;
      }

      case 'passage_feedback': {
        const wordLen = passage ? passage.split(/\s+/).length : 0;
        result.title = 'Editorial Feedback on Passage';
        result.originalText = passage;
        result.explanation = `Evaluated ${wordLen} words for pacing, concreteness, and voice.`;
        result.items = [
          'Strength: Clear thematic focus and natural sentence cadence.',
          'Opportunity: Look for any abstract nouns (e.g., "realization", "difficulty") that could be replaced with a visible physical detail or action.',
          'Pacing: Read the final sentence aloud to ensure it lands on a strong stressed noun or verb.'
        ];
        result.suggestedText = tightenProse(passage);
        break;
      }

      case 'book_synopsis': {
        const chTitles = allChapters.slice(0, 5).map(c => c.title).join(', ');
        result.title = 'Generated Book Description & Synopsis';
        result.explanation = 'Drafted from your title, subtitle, central idea, and chapter architecture.';
        const blurb = `${bookTitle}${project?.subtitle ? `: ${project.subtitle}` : ''} is an illuminating ${project?.book_type || 'book'} by ${project?.author_name || 'the author'}. ${centralIdea} Moving through key movements including ${chTitles || 'foundational chapters'}, this book offers readers clarity, depth, and lasting resonance.`;
        result.suggestedText = blurb;
        break;
      }

      default: {
        result.title = 'Writing Studio Suggestion';
        result.explanation = 'Contextual suggestion based on your current chapter.';
        result.suggestedText = `<p>${centralIdea}</p>`;
      }
    }

    return res.json({ suggestion: result });
  } catch (err) {
    return res.status(500).json({ error: 'Writing assistance request failed.', details: err.message });
  }
});

module.exports = router;
