import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Eye,
  Plus,
  Check,
  RefreshCw,
  Trash2,
  BookmarkPlus,
  BookOpen
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function TemplatesView({
  templates = [],
  activeProject,
  onStartBookWithTemplate,
  onSwitchActiveProjectTemplate,
  onTemplatesChanged
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Custom template builder state
  const [customizing, setCustomizing] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom Templates');
  const [customDescription, setCustomDescription] = useState('');
  const [customStages, setCustomStages] = useState([]);
  const [savingCustom, setSavingCustom] = useState(false);
  const [appendMissingOnSwitch, setAppendMissingOnSwitch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const categories = ['all', ...new Set(templates.map(t => t.category))];

  const filtered = templates.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.tagline || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      (t.keywords || []).some(k => k.toLowerCase().includes(q))
    );
  });

  const openPreview = (tpl) => {
    setPreviewTemplate(tpl);
    setCustomizing(false);
    setCustomName(`${tpl.name} (Custom)`);
    setCustomCategory(tpl.category || 'Custom Templates');
    setCustomDescription(tpl.description || '');
    setCustomStages(
      (tpl.stages || []).map(s => ({
        ...s,
        title: s.title,
        purpose: s.purpose,
        targetWords: s.targetWords || 2500
      }))
    );
  };

  const handleSaveCustomTemplate = async (e) => {
    e.preventDefault();
    setSavingCustom(true);
    try {
      const data = await apiRequest('/api/templates/custom', {
        method: 'POST',
        body: {
          name: customName,
          category: customCategory,
          bookType: previewTemplate?.bookType || 'general',
          tagline: previewTemplate?.tagline || 'Custom author template',
          description: customDescription,
          intendedAudience: previewTemplate?.intendedAudience || 'Authors',
          accentColor: previewTemplate?.accentColor || '#7C2D12',
          recommendedTrimSize: previewTemplate?.recommendedTrimSize || '5.5x8.5',
          recommendedFont: previewTemplate?.recommendedFont || 'Newsreader',
          stages: customStages
        }
      });
      await onTemplatesChanged();
      setPreviewTemplate(data.template);
      setCustomizing(false);
      setStatusMessage(`Saved custom template "${data.template.name}" to your studio.`);
    } finally {
      setSavingCustom(false);
    }
  };

  const handleDeleteCustomTemplate = async (tplId) => {
    if (!window.confirm('Delete this custom template?')) return;
    await apiRequest(`/api/templates/custom/${tplId}`, { method: 'DELETE' });
    await onTemplatesChanged();
    if (previewTemplate?.id === tplId) setPreviewTemplate(null);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-400">
            Extensible Living Template Engine
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100">
            Templates &amp; Guided Book Architectures
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-3xl">
            Every template is an interactive writing companion with stage-specific guidance, reflection questions, examples, and editable chapter blueprints. Start with a template and make it completely your own.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search genres, themes, or use cases..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
          />
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              categoryFilter === cat
                ? 'bg-amber-900 text-white dark:bg-amber-700'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            {cat === 'all' ? `All Categories (${templates.length})` : cat}
          </button>
        ))}
      </div>

      {/* Template Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(tpl => {
          const isCurrentProjectTpl = activeProject?.templateId === tpl.id;
          return (
            <div
              key={tpl.id}
              className="rounded-2xl bg-white dark:bg-[#1E1B18] border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Top Colored Spine Bar */}
                <div
                  style={{ backgroundColor: tpl.accentColor || '#7C2D12' }}
                  className="h-2.5 w-full"
                />

                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    <span>{tpl.category}</span>
                    <span>{tpl.stages?.length || 1} Guided Stages</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif font-bold text-xl text-stone-900 dark:text-stone-100">
                      {tpl.name}
                    </h3>
                    {isCurrentProjectTpl && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-semibold shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    {tpl.tagline}
                  </p>

                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-3">
                    {tpl.description}
                  </p>

                  <div className="pt-2 space-y-1 text-[11px] text-stone-500">
                    <div>
                      <strong className="text-stone-700 dark:text-stone-300">Audience:</strong> {tpl.intendedAudience}
                    </div>
                    {tpl.useCases && tpl.useCases.length > 0 && (
                      <div>
                        <strong className="text-stone-700 dark:text-stone-300">Examples:</strong> {tpl.useCases.join(' • ')}
                      </div>
                    )}
                  </div>

                  {/* Stage Preview Pills */}
                  <div className="pt-2 flex flex-wrap gap-1">
                    {(tpl.stages || []).slice(0, 4).map((stg, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 truncate max-w-[200px]"
                      >
                        {stg.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-[#F7F3EB]/60 dark:bg-stone-900/60 border-t border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => openPreview(tpl)}
                  className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300 hover:text-amber-900"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview &amp; Customize
                </button>

                <div className="flex items-center gap-1.5">
                  {tpl.isCustom && (
                    <button
                      onClick={() => handleDeleteCustomTemplate(tpl.id)}
                      className="p-1.5 rounded text-stone-400 hover:text-red-600"
                      title="Delete custom template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onStartBookWithTemplate(tpl.id)}
                    className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white font-semibold transition"
                  >
                    Start Book →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Template Deep Preview & Customizer Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-400">
                  {previewTemplate.category}
                </span>
                <h2 className="font-serif font-bold text-2xl text-stone-900 dark:text-stone-100">
                  {previewTemplate.name}
                </h2>
                <p className="text-xs text-stone-500 mt-1">{previewTemplate.description}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-stone-400 hover:text-stone-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!customizing ? (
                <>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
                      <span className="text-stone-400 block">Recommended Trim Size</span>
                      <strong className="text-stone-800 dark:text-stone-200">{previewTemplate.recommendedTrimSize || '5.5x8.5'}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
                      <span className="text-stone-400 block">Typography Preset</span>
                      <strong className="text-stone-800 dark:text-stone-200">{previewTemplate.recommendedFont || 'Newsreader'}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
                      <span className="text-stone-400 block">Guided Stages</span>
                      <strong className="text-stone-800 dark:text-stone-200">{previewTemplate.stages?.length || 1} Chapters / Modules</strong>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-bold text-base">
                        Included Living Template Stages &amp; Guidance
                      </h3>
                      <button
                        onClick={() => setCustomizing(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-900 dark:text-amber-400 hover:underline"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        Customize &amp; Save as Your Own Template
                      </button>
                    </div>

                    {(previewTemplate.stages || []).map((stg, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                            {idx + 1}. {stg.title}
                          </span>
                          <span className="text-stone-400">~{stg.targetWords || 2500} words</span>
                        </div>
                        <p className="text-stone-600 dark:text-stone-300">
                          <strong>Purpose:</strong> {stg.purpose}
                        </p>
                        {stg.questions && stg.questions.length > 0 && (
                          <div className="text-stone-500">
                            <strong>Key Prompt:</strong> “{stg.questions[0]}”
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <form onSubmit={handleSaveCustomTemplate} className="space-y-4 text-xs">
                  <div className="font-serif font-bold text-base">
                    Customize &amp; Save Reusable Template
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Custom Template Name</label>
                      <input
                        type="text"
                        required
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Category</label>
                      <input
                        type="text"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-medium">Template Stages</label>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomStages(prev => [
                            ...prev,
                            {
                              stageKey: `custom-${prev.length + 1}`,
                              title: `Chapter ${prev.length + 1}: New Stage`,
                              purpose: 'Define the purpose of this stage...',
                              targetWords: 2500
                            }
                          ])
                        }
                        className="text-amber-900 dark:text-amber-400 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Stage
                      </button>
                    </div>

                    {customStages.map((stg, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-stone-200 dark:border-stone-700 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={stg.title}
                            onChange={e => {
                              const v = e.target.value;
                              setCustomStages(prev => prev.map((it, i) => (i === idx ? { ...it, title: v } : it)));
                            }}
                            className="flex-1 font-semibold px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                          />
                          {customStages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setCustomStages(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={stg.purpose}
                          onChange={e => {
                            const v = e.target.value;
                            setCustomStages(prev => prev.map((it, i) => (i === idx ? { ...it, purpose: v } : it)));
                          }}
                          className="w-full px-2 py-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomizing(false)}
                      className="px-4 py-2 rounded-lg border border-stone-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingCustom}
                      className="px-4 py-2 rounded-lg bg-amber-900 text-white font-semibold"
                    >
                      {savingCustom ? 'Saving...' : 'Save Custom Template'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="p-5 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              {activeProject && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await onSwitchActiveProjectTemplate(previewTemplate.id, appendMissingOnSwitch);
                      setStatusMessage(`Switched "${activeProject.title}" to template "${previewTemplate.name}" without losing any manuscript content.`);
                      setPreviewTemplate(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-800 text-amber-900 dark:text-amber-300 font-semibold hover:bg-amber-900/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Apply to Current Book ("{activeProject.title}")
                  </button>
                  <label className="flex items-center gap-1.5 text-stone-500">
                    <input
                      type="checkbox"
                      checked={appendMissingOnSwitch}
                      onChange={e => setAppendMissingOnSwitch(e.target.checked)}
                    />
                    <span>Also append new template stages</span>
                  </label>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const id = previewTemplate.id;
                  setPreviewTemplate(null);
                  onStartBookWithTemplate(id);
                }}
                className="ml-auto flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold shadow-xs"
              >
                <BookOpen className="w-4 h-4" />
                Start New Book with This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
