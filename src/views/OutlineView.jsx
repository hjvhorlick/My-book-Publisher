import React, { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Feather,
  CheckCircle2,
  FastForward,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function OutlineView({
  project,
  chapters = [],
  onChaptersChanged,
  onOpenChapterInStudio
}) {
  const [viewMode, setViewMode] = useState('corkboard'); // 'corkboard' | 'table'
  const [newTitle, setNewTitle] = useState('');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newSectionType, setNewSectionType] = useState('chapter');
  const [newIsOptional, setNewIsOptional] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCreateChapter = async (e) => {
    e.preventDefault();
    if (!project?.id) return;
    await apiRequest(`/api/projects/${project.id}/chapters`, {
      method: 'POST',
      body: {
        title: newTitle.trim() || `Chapter ${chapters.length + 1}`,
        synopsis: newSynopsis.trim(),
        sectionType: newSectionType,
        isOptional: newIsOptional,
        targetWords: 2500
      }
    });
    setNewTitle('');
    setNewSynopsis('');
    setShowAddForm(false);
    await onChaptersChanged();
  };

  const handleUpdateChapterField = async (chId, updates) => {
    await apiRequest(`/api/projects/${project.id}/chapters/${chId}`, {
      method: 'PUT',
      body: updates
    });
    await onChaptersChanged();
  };

  const handleMove = async (idx, dir) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= chapters.length) return;
    const copy = [...chapters];
    const [moved] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, moved);
    await apiRequest(`/api/projects/${project.id}/chapters/reorder`, {
      method: 'PUT',
      body: { orderedIds: copy.map(c => c.id) }
    });
    await onChaptersChanged();
  };

  const handleDuplicate = async (chId) => {
    await apiRequest(`/api/projects/${project.id}/chapters/${chId}/duplicate`, {
      method: 'POST'
    });
    await onChaptersChanged();
  };

  const handleDelete = async (ch) => {
    if (chapters.length <= 1) {
      window.alert('Your book must keep at least one chapter.');
      return;
    }
    if (!window.confirm(`Delete "${ch.title}" from your manuscript?`)) return;
    await apiRequest(`/api/projects/${project.id}/chapters/${ch.id}`, {
      method: 'DELETE'
    });
    await onChaptersChanged();
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-400">
            Book Architecture &amp; Corkboard
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
            {project?.title} — Chapter Outline
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Organize your chapters, refine synopses, set word-count targets, reorder movements, or skip optional sections freely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-stone-300 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-900">
            <button
              onClick={() => setViewMode('corkboard')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
                viewMode === 'corkboard' ? 'bg-amber-900 text-white' : 'text-stone-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Corkboard
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-amber-900 text-white' : 'text-stone-600'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              Structure Table
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Chapter / Section
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateChapter}
          className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4 shadow-sm"
        >
          <div className="font-serif font-bold text-base">Add New Manuscript Chapter or Section</div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Chapter Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g., Chapter 4: The Turning Point"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Section Type</label>
              <select
                value={newSectionType}
                onChange={e => setNewSectionType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
              >
                <option value="chapter">Standard Chapter</option>
                <option value="exercise">Workbook Exercise</option>
                <option value="reflection">Contemplative Reflection</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Synopsis / Purpose Note</label>
            <textarea
              rows={2}
              value={newSynopsis}
              onChange={e => setNewSynopsis(e.target.value)}
              placeholder="What happens or what is argued in this section?"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={newIsOptional}
                onChange={e => setNewIsOptional(e.target.checked)}
              />
              <span>Mark as an optional section</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl text-xs text-stone-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-900 text-white text-xs font-semibold"
              >
                Create Section
              </button>
            </div>
          </div>
        </form>
      )}

      {viewMode === 'corkboard' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {chapters.map((ch, idx) => {
            const pct = Math.min(100, Math.round(((ch.wordCount || 0) / Math.max(1, ch.targetWords || 2500)) * 100));
            return (
              <div
                key={ch.id}
                className="rounded-2xl bg-white dark:bg-[#1E1B18] border border-stone-200/90 dark:border-stone-800 p-5 flex flex-col justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800 dark:text-amber-400">
                      Section {idx + 1}
                    </span>

                    <select
                      value={ch.status}
                      onChange={e => handleUpdateChapterField(ch.id, { status: e.target.value })}
                      className="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2 py-0.5 text-xs"
                    >
                      <option value="planned">Planned</option>
                      <option value="drafting">Drafting</option>
                      <option value="revising">Revising</option>
                      <option value="completed">Completed ✓</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    defaultValue={ch.title}
                    onBlur={e => {
                      if (e.target.value !== ch.title) {
                        handleUpdateChapterField(ch.id, { title: e.target.value });
                      }
                    }}
                    className="w-full font-serif font-bold text-lg text-stone-900 dark:text-stone-100 bg-transparent border-b border-transparent focus:border-amber-800 focus:outline-none"
                  />

                  <textarea
                    rows={3}
                    defaultValue={ch.synopsis || ch.guidance?.purpose || ''}
                    onBlur={e => {
                      if (e.target.value !== ch.synopsis) {
                        handleUpdateChapterField(ch.id, { synopsis: e.target.value });
                      }
                    }}
                    placeholder="Add chapter outline synopsis..."
                    className="w-full text-xs text-stone-600 dark:text-stone-400 bg-stone-50/80 dark:bg-stone-900/60 rounded-xl p-2.5 border border-stone-200/60 dark:border-stone-800 focus:outline-none"
                  />

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{(ch.wordCount || 0).toLocaleString()} / {(ch.targetWords || 2500).toLocaleString()} words</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div className="h-full bg-amber-800 dark:bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <button
                    onClick={() => onOpenChapterInStudio(ch.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-400 hover:underline"
                  >
                    <Feather className="w-3.5 h-3.5" />
                    Write in Studio
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, -1)}
                      className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 disabled:opacity-30"
                      title="Move Earlier"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === chapters.length - 1}
                      onClick={() => handleMove(idx, 1)}
                      className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 disabled:opacity-30"
                      title="Move Later"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(ch.id)}
                      className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700"
                      title="Duplicate Chapter"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ch)}
                      className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-600"
                      title="Delete Chapter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-200 dark:divide-stone-800">
          {chapters.map((ch, idx) => (
            <div key={ch.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 h-7 rounded-full bg-amber-900/10 text-amber-900 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 truncate">
                    {ch.title}
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {ch.synopsis || ch.guidance?.purpose || 'No synopsis'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs">
                <span className="text-stone-500">{(ch.wordCount || 0).toLocaleString()} words</span>
                <span className="capitalize px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800">{ch.status}</span>
                <button
                  onClick={() => onOpenChapterInStudio(ch.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-900 text-white font-medium"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
