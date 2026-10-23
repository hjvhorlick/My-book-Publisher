import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sparkles,
  HelpCircle,
  Lightbulb,
  BookOpenCheck,
  AlertCircle,
  ArrowRight,
  FastForward,
  CheckSquare,
  Square,
  Edit3,
  Copy,
  Check,
  Plus,
  Replace,
  X,
  Wand2
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function LivingTemplatePanel({
  project,
  chapter,
  onChapterUpdated,
  onSelectChapter,
  selectedText,
  onInsertIntoEditor
}) {
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'assistant'
  const [guidance, setGuidance] = useState(null);
  const [activePromptCard, setActivePromptCard] = useState('explain_step');
  const [editingGuidance, setEditingGuidance] = useState(false);
  const [customPurpose, setCustomPurpose] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Editorial / AI Assistant state
  const [aiStatus, setAiStatus] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!project?.id || !chapter?.id) return;
    apiRequest(`/api/templates/guidance/${project.id}/${chapter.id}`)
      .then(data => {
        setGuidance(data.guidance);
        setCustomPurpose(data.guidance?.purpose || '');
        setCustomNotes(data.guidance?.customNotes || '');
      })
      .catch(() => {});
  }, [project?.id, chapter?.id, chapter?.wordCount, chapter?.status]);

  useEffect(() => {
    apiRequest('/api/ai/status')
      .then(data => setAiStatus(data))
      .catch(() => {});
  }, []);

  const handleToggleCriterion = async (criterion) => {
    if (!guidance || !project?.id || !chapter?.id) return;
    const current = guidance.completedCriteria || [];
    const next = current.includes(criterion)
      ? current.filter(c => c !== criterion)
      : [...current, criterion];

    try {
      const res = await apiRequest(`/api/projects/${project.id}/chapters/${chapter.id}`, {
        method: 'PUT',
        body: {
          guidance: {
            ...chapter.guidance,
            completedCriteria: next
          }
        }
      });
      if (res.chapter && onChapterUpdated) onChapterUpdated(res.chapter);
      setGuidance(prev => ({ ...prev, completedCriteria: next }));
    } catch {
      // ignore
    }
  };

  const handleSaveCustomGuidance = async (e) => {
    e.preventDefault();
    if (!project?.id || !chapter?.id) return;
    try {
      const res = await apiRequest(`/api/projects/${project.id}/chapters/${chapter.id}`, {
        method: 'PUT',
        body: {
          guidance: {
            ...chapter.guidance,
            purpose: customPurpose,
            customNotes
          }
        }
      });
      if (res.chapter && onChapterUpdated) onChapterUpdated(res.chapter);
      setGuidance(prev => ({ ...prev, purpose: customPurpose, customNotes }));
      setEditingGuidance(false);
    } catch {
      // ignore
    }
  };

  const handleSkipForNow = async () => {
    if (!project?.id || !chapter?.id) return;
    try {
      const res = await apiRequest(`/api/projects/${project.id}/chapters/${chapter.id}`, {
        method: 'PUT',
        body: { status: 'skipped' }
      });
      if (res.chapter && onChapterUpdated) onChapterUpdated(res.chapter);
      if (guidance?.nextChapter?.id && onSelectChapter) {
        onSelectChapter(guidance.nextChapter.id);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkComplete = async () => {
    if (!project?.id || !chapter?.id) return;
    const nextStatus = chapter.status === 'completed' ? 'drafting' : 'completed';
    try {
      const res = await apiRequest(`/api/projects/${project.id}/chapters/${chapter.id}`, {
        method: 'PUT',
        body: { status: nextStatus }
      });
      if (res.chapter && onChapterUpdated) onChapterUpdated(res.chapter);
    } catch {
      // ignore
    }
  };

  const triggerAiAssist = async (action) => {
    if (!project?.id) return;
    setAiLoading(true);
    try {
      const data = await apiRequest('/api/ai/assist', {
        method: 'POST',
        body: {
          action,
          projectId: project.id,
          chapterId: chapter?.id,
          selectedText
        }
      });
      setAiSuggestion(data.suggestion);
    } catch (err) {
      setAiSuggestion({
        title: 'Service Notice',
        explanation: err.message || 'Unable to run assistant action at this time.',
        items: [],
        suggestedText: ''
      });
    } finally {
      setAiLoading(false);
    }
  };

  const interactiveButtons = [
    { id: 'explain_step', label: 'Explain this step', icon: Compass },
    { id: 'show_ideas', label: 'Show me ideas', icon: Lightbulb },
    { id: 'help_start', label: 'Help me get started', icon: Sparkles },
    { id: 'ask_questions', label: 'Ask me questions', icon: HelpCircle },
    { id: 'give_example', label: 'Give me an example', icon: BookOpenCheck },
    { id: 'suggest_missing', label: 'Suggest missing elements', icon: AlertCircle },
    { id: 'next_step', label: 'Show the next step', icon: ArrowRight }
  ];

  const activeResponse = guidance?.interactiveResponses?.[activePromptCard];

  return (
    <aside className="w-full h-full flex flex-col bg-[#F7F3EB] dark:bg-[#1B1815] border-l border-stone-200 dark:border-stone-800 text-xs overflow-hidden">
      {/* Top Switcher Tabs */}
      <div className="grid grid-cols-2 border-b border-stone-200 dark:border-stone-800 bg-[#EFE8D8]/60 dark:bg-stone-900">
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center justify-center gap-1.5 py-2.5 font-semibold transition border-b-2 ${
            activeTab === 'guide'
              ? 'border-amber-800 dark:border-amber-500 text-amber-900 dark:text-amber-300 bg-[#F7F3EB] dark:bg-[#1B1815]'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Living Guide
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex items-center justify-center gap-1.5 py-2.5 font-semibold transition border-b-2 ${
            activeTab === 'assistant'
              ? 'border-amber-800 dark:border-amber-500 text-amber-900 dark:text-amber-300 bg-[#F7F3EB] dark:bg-[#1B1815]'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Editorial Assistant
        </button>
      </div>

      {/* TAB 1: THE LIVING TEMPLATE CONTEXTUAL GUIDE */}
      {activeTab === 'guide' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Header & Purpose */}
          <div className="bg-white dark:bg-stone-900 rounded-xl p-3.5 border border-stone-200/80 dark:border-stone-800 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Living Template Stage
              </span>
              <button
                onClick={() => setEditingGuidance(!editingGuidance)}
                className="text-stone-400 hover:text-amber-800 dark:hover:text-amber-400 flex items-center gap-1 text-[11px]"
                title="Customize prompts and notes for this chapter"
              >
                <Edit3 className="w-3 h-3" />
                {editingGuidance ? 'Close' : 'Customize'}
              </button>
            </div>

            {editingGuidance ? (
              <form onSubmit={handleSaveCustomGuidance} className="space-y-2 pt-1">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-0.5">Custom Stage Purpose:</label>
                  <textarea
                    rows={2}
                    value={customPurpose}
                    onChange={e => setCustomPurpose(e.target.value)}
                    className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-500 mb-0.5">Your Personal Chapter Notes:</label>
                  <textarea
                    rows={2}
                    value={customNotes}
                    onChange={e => setCustomNotes(e.target.value)}
                    placeholder="Add reminders, key beats, or sensory notes..."
                    className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded bg-amber-900 text-white font-medium hover:bg-amber-800"
                >
                  Save Stage Guidance
                </button>
              </form>
            ) : (
              <>
                <p className="text-stone-800 dark:text-stone-200 font-medium leading-relaxed">
                  {guidance?.purpose || 'Develop the core narrative and insight of this chapter.'}
                </p>
                {guidance?.customNotes && (
                  <div className="p-2 rounded bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 italic">
                    Note: {guidance.customNotes}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 8 Interactive Contextual Actions */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Contextual Guidance Prompts
            </div>
            <div className="flex flex-wrap gap-1.5">
              {interactiveButtons.map(btn => {
                const Icon = btn.icon;
                const isSelected = activePromptCard === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setActivePromptCard(btn.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition ${
                      isSelected
                        ? 'bg-amber-900 text-white border-amber-900 dark:bg-amber-700 dark:border-amber-600 shadow-2xs'
                        : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200/90 dark:border-stone-800 hover:border-amber-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{btn.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleSkipForNow}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition"
                title="Skip this chapter for now and move freely to the next stage"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Skip for now</span>
              </button>
            </div>
          </div>

          {/* Active Contextual Response Card */}
          {activeResponse && (
            <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-amber-800/25 dark:border-amber-600/30 shadow-xs space-y-2.5">
              <div className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                {activeResponse.title}
              </div>

              {activeResponse.body && (
                <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-serif text-[13px]">
                  {activeResponse.body}
                </p>
              )}

              {activeResponse.detail && (
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                  {activeResponse.detail}
                </p>
              )}

              {Array.isArray(activeResponse.items) && activeResponse.items.length > 0 && (
                <ul className="space-y-2 pt-1">
                  {activeResponse.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-stone-700 dark:text-stone-300 leading-relaxed">
                      <span className="w-4 h-4 rounded-full bg-amber-900/10 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {activeResponse.scaffoldHtml && (
                <button
                  type="button"
                  onClick={() =>
                    onInsertIntoEditor({
                      mode: 'append',
                      html: activeResponse.scaffoldHtml
                    })
                  }
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-900/10 hover:bg-amber-900 text-amber-900 hover:text-white dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-700 dark:hover:text-white font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Insert Starter Scaffold into Manuscript
                </button>
              )}

              {activeResponse.nextChapterId && onSelectChapter && (
                <button
                  type="button"
                  onClick={() => onSelectChapter(activeResponse.nextChapterId)}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-stone-900 dark:bg-stone-700 text-white font-medium hover:bg-stone-800 transition flex items-center justify-center gap-1.5"
                >
                  <span>Open Next: {activeResponse.nextChapterTitle}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {activeResponse.contextNote && (
                <div className="text-[11px] text-stone-400 dark:text-stone-500 italic pt-1 border-t border-stone-100 dark:border-stone-800">
                  {activeResponse.contextNote}
                </div>
              )}
            </div>
          )}

          {/* Stage Completion Self-Check (Non-Blocking) */}
          <div className="bg-white dark:bg-stone-900 rounded-xl p-3.5 border border-stone-200/80 dark:border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Stage Milestones (Optional)
              </span>
              <button
                type="button"
                onClick={handleMarkComplete}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  chapter?.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-50'
                }`}
              >
                {chapter?.status === 'completed' ? '✓ Stage Complete' : 'Mark Stage Complete'}
              </button>
            </div>

            <div className="space-y-1.5">
              {(guidance?.completionCriteria || []).map((crit, idx) => {
                const checked = (guidance?.completedCriteria || []).includes(crit);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleCriterion(crit)}
                    className="w-full flex items-center gap-2 text-left py-1 text-stone-700 dark:text-stone-300 hover:text-amber-900 dark:hover:text-amber-300"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                    <span className={checked ? 'line-through opacity-70' : ''}>{crit}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EDITORIAL & AI WRITING ASSISTANT */}
      {activeTab === 'assistant' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-200 dark:border-stone-800 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              {aiStatus?.providerName || 'Editorial Assistant'}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
              {aiStatus?.privacyNotice || 'Suggestions never overwrite your manuscript automatically. Preview and choose what to accept.'}
            </p>
          </div>

          {selectedText ? (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 space-y-1">
              <div className="text-[10px] font-semibold uppercase text-amber-900 dark:text-amber-300">
                Selected Passage ({selectedText.split(/\s+/).length} words)
              </div>
              <p className="italic text-stone-700 dark:text-stone-300 line-clamp-3">
                “{selectedText}”
              </p>
            </div>
          ) : (
            <div className="text-[11px] text-stone-500 italic px-1">
              Tip: Highlight any sentence or paragraph in the editor to analyze or refine that specific passage.
            </div>
          )}

          {/* Assistant Actions Grid */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Editorial &amp; Brainstorming Actions
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'improve_clarity', label: 'Improve Clarity' },
                { id: 'alternative_wording', label: 'Alternative Wording' },
                { id: 'check_repetition', label: 'Check Repetition' },
                { id: 'passage_feedback', label: 'Passage Feedback' },
                { id: 'brainstorm', label: 'Brainstorm Ideas' },
                { id: 'outline', label: 'Develop Outline' },
                { id: 'clarify_questions', label: 'Clarify Thinking' },
                { id: 'check_consistency', label: 'Check Consistency' },
                { id: 'suggest_missing', label: 'Missing Sections' },
                { id: 'summarize_notes', label: 'Synthesize Notes' },
                { id: 'develop_character', label: 'Develop Character' },
                { id: 'book_synopsis', label: 'Book Synopsis' }
              ].map(act => (
                <button
                  key={act.id}
                  type="button"
                  disabled={aiLoading}
                  onClick={() => triggerAiAssist(act.id)}
                  className="px-2.5 py-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-800 dark:hover:border-amber-500 text-stone-700 dark:text-stone-200 font-medium text-left transition disabled:opacity-50"
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {aiLoading && (
            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-stone-500">
              Analyzing manuscript context...
            </div>
          )}

          {/* Explicit Suggestion Preview & Comparison Card */}
          {aiSuggestion && !aiLoading && (
            <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border-2 border-amber-800/30 dark:border-amber-600/40 shadow-md space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                  {aiSuggestion.title}
                </div>
                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="text-stone-400 hover:text-stone-600"
                  title="Dismiss suggestion"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {aiSuggestion.explanation && (
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                  {aiSuggestion.explanation}
                </p>
              )}

              {aiSuggestion.originalText && (
                <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-1">
                  <div className="text-[10px] font-semibold uppercase text-stone-500">Original Passage</div>
                  <p className="text-stone-600 dark:text-stone-400 line-clamp-4">{aiSuggestion.originalText}</p>
                </div>
              )}

              {Array.isArray(aiSuggestion.items) && aiSuggestion.items.length > 0 && (
                <ul className="space-y-1.5">
                  {aiSuggestion.items.map((item, i) => (
                    <li key={i} className="p-2 rounded bg-stone-50 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300 leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              )}

              {aiSuggestion.suggestedText && (
                <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                  <div className="text-[10px] font-semibold uppercase text-emerald-800 dark:text-emerald-400">
                    Suggested Text Preview
                  </div>
                  <div
                    className="text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: aiSuggestion.suggestedText }}
                  />
                </div>
              )}

              {/* Explicit Author Control Actions: Insert, Replace, Copy, Dismiss */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
                {aiSuggestion.suggestedText && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onInsertIntoEditor({
                          mode: 'append',
                          html: aiSuggestion.suggestedText.startsWith('<')
                            ? aiSuggestion.suggestedText
                            : `<p>${aiSuggestion.suggestedText}</p>`
                        });
                        setAiSuggestion(null);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-900 text-white font-medium hover:bg-amber-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Insert into Chapter
                    </button>

                    {selectedText && (
                      <button
                        type="button"
                        onClick={() => {
                          onInsertIntoEditor({
                            mode: 'replace_selection',
                            html: aiSuggestion.suggestedText
                          });
                          setAiSuggestion(null);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 text-white font-medium hover:bg-stone-700"
                      >
                        <Replace className="w-3.5 h-3.5" />
                        Replace Selection
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(aiSuggestion.suggestedText.replace(/<[^>]+>/g, ''));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1800);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="ml-auto px-2.5 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
