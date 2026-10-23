import React, { useState, useEffect } from 'react';
import {
  Plus,
  Lightbulb,
  Users,
  Globe,
  BookOpen,
  Quote,
  HelpCircle,
  Archive,
  ListTree,
  FilePlus2,
  Trash2,
  Link as LinkIcon,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../api/client';

const NOTE_TYPES = [
  { id: 'concept', label: 'Book Concepts', icon: Lightbulb, forTypes: ['all'] },
  { id: 'outline', label: 'Scene / Section Outlines', icon: ListTree, forTypes: ['all'] },
  { id: 'character', label: 'Character Profiles', icon: Users, forTypes: ['fiction', 'memoir', 'children'] },
  { id: 'worldbuilding', label: 'World-Building & Setting', icon: Globe, forTypes: ['fiction', 'children'] },
  { id: 'research', label: 'Research & Sources', icon: BookOpen, forTypes: ['nonfiction', 'academic', 'workbook', 'memoir', 'devotional'] },
  { id: 'quotation', label: 'Quotations & Excerpts', icon: Quote, forTypes: ['all'] },
  { id: 'question', label: 'Unanswered Questions', icon: HelpCircle, forTypes: ['all'] },
  { id: 'discarded', label: 'Discarded / Alt Ideas', icon: Archive, forTypes: ['all'] }
];

export default function ResearchNotesView({
  project,
  chapters = [],
  onChaptersChanged,
  onOpenChapterInStudio
}) {
  const [notes, setNotes] = useState([]);
  const [activeType, setActiveType] = useState('all');
  const [showAllTools, setShowAllTools] = useState(false);

  // New / Edit note state
  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState('concept');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkedChapterId, setLinkedChapterId] = useState('');

  // Type-specific metadata fields
  const [charRole, setCharRole] = useState('');
  const [charMotivation, setCharMotivation] = useState('');
  const [charFlaw, setCharFlaw] = useState('');
  const [charRelationships, setCharRelationships] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [publication, setPublication] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [attribution, setAttribution] = useState('');

  const [convertFeedback, setConvertFeedback] = useState('');

  const loadNotes = async () => {
    if (!project?.id) return;
    const data = await apiRequest(`/api/projects/${project.id}/notes`);
    setNotes(data.notes || []);
  };

  useEffect(() => {
    loadNotes();
  }, [project?.id]);

  const visibleNoteTypes = NOTE_TYPES.filter(nt => {
    if (showAllTools) return true;
    if (nt.forTypes.includes('all')) return true;
    return nt.forTypes.includes(project?.bookType || 'general');
  });

  const filteredNotes = notes.filter(n => activeType === 'all' || n.noteType === activeType);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!project?.id || !title.trim()) return;

    let metadata = {};
    if (noteType === 'character') {
      metadata = { role: charRole, motivation: charMotivation, flaw: charFlaw, relationships: charRelationships };
    } else if (noteType === 'research') {
      metadata = { sourceAuthor, publication, url: sourceUrl };
    } else if (noteType === 'quotation') {
      metadata = { attribution };
    } else if (noteType === 'question') {
      metadata = { resolved: false };
    }

    await apiRequest(`/api/projects/${project.id}/notes`, {
      method: 'POST',
      body: {
        noteType,
        title: title.trim(),
        content: content.trim(),
        metadata,
        linkedChapterId: linkedChapterId || null
      }
    });

    setTitle('');
    setContent('');
    setCharRole('');
    setCharMotivation('');
    setCharFlaw('');
    setCharRelationships('');
    setSourceAuthor('');
    setPublication('');
    setSourceUrl('');
    setAttribution('');
    setShowForm(false);
    await loadNotes();
  };

  const handleDeleteNote = async (noteId) => {
    await apiRequest(`/api/projects/${project.id}/notes/${noteId}`, { method: 'DELETE' });
    await loadNotes();
  };

  const handleConvertToChapter = async (note, targetChapterId = null) => {
    const data = await apiRequest(`/api/projects/${project.id}/notes/${note.id}/convert-to-chapter`, {
      method: 'POST',
      body: { targetChapterId }
    });
    await onChaptersChanged();
    await loadNotes();
    setConvertFeedback(
      data.mode === 'appended_to_chapter'
        ? `Added "${note.title}" as a section in "${data.chapter.title}" (original note preserved).`
        : `Created new chapter "${data.chapter.title}" from note (original note preserved).`
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-400">
            Connected Planning &amp; Research Studio
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
            Research, Characters &amp; Book Notes
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Develop concepts, character profiles, research sources, quotations, and unanswered questions—and turn any note into a manuscript chapter without losing your original material.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllTools(!showAllTools)}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-300"
          >
            {showAllTools ? 'Show Recommended Tools' : 'Show All Fiction & Nonfiction Tools'}
          </button>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Note / Profile
          </button>
        </div>
      </div>

      {convertFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{convertFeedback}</span>
          </div>
          <button onClick={() => setConvertFeedback('')} className="text-stone-400">✕</button>
        </div>
      )}

      {/* Note Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveType('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            activeType === 'all'
              ? 'bg-amber-900 text-white'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
          }`}
        >
          All Notes ({notes.length})
        </button>
        {visibleNoteTypes.map(nt => {
          const Icon = nt.icon;
          const count = notes.filter(n => n.noteType === nt.id).length;
          return (
            <button
              key={nt.id}
              onClick={() => {
                setActiveType(nt.id);
                setNoteType(nt.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeType === nt.id
                  ? 'bg-amber-900 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{nt.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Create Note Form */}
      {showForm && (
        <form
          onSubmit={handleCreateNote}
          className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-sm text-xs"
        >
          <div className="font-serif font-bold text-base">Create Planning Entry</div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-stone-600 mb-1">Entry Category</label>
              <select
                value={noteType}
                onChange={e => setNoteType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              >
                {NOTE_TYPES.map(nt => (
                  <option key={nt.id} value={nt.id}>{nt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-stone-600 mb-1">Title / Name</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={noteType === 'character' ? 'Character Name...' : 'Note or Source Title...'}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-600 mb-1">Link to Chapter (Optional)</label>
              <select
                value={linkedChapterId}
                onChange={e => setLinkedChapterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              >
                <option value="">— Unlinked (Project-wide) —</option>
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {noteType === 'character' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <input
                type="text"
                placeholder="Role (e.g., Protagonist, Foil)"
                value={charRole}
                onChange={e => setCharRole(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <input
                type="text"
                placeholder="Core Motivation / Desire"
                value={charMotivation}
                onChange={e => setCharMotivation(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <input
                type="text"
                placeholder="Internal Wound / Flaw"
                value={charFlaw}
                onChange={e => setCharFlaw(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <input
                type="text"
                placeholder="Key Relationships"
                value={charRelationships}
                onChange={e => setCharRelationships(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          )}

          {noteType === 'research' && (
            <div className="grid sm:grid-cols-3 gap-3 pt-1">
              <input
                type="text"
                placeholder="Source Author(s)"
                value={sourceAuthor}
                onChange={e => setSourceAuthor(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <input
                type="text"
                placeholder="Publication / Journal / Year"
                value={publication}
                onChange={e => setPublication(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <input
                type="text"
                placeholder="URL or Archive Reference"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          )}

          {noteType === 'quotation' && (
            <div>
              <input
                type="text"
                placeholder="Speaker / Book Attribution"
                value={attribution}
                onChange={e => setAttribution(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          )}

          <div>
            <label className="block font-medium text-stone-600 mb-1">Details, Excerpt, or Notes</label>
            <textarea
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your research findings, character biography, scene outline, or quotation..."
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-stone-500">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-amber-900 text-white font-semibold">
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Notes Cards Grid */}
      {filteredNotes.length === 0 ? (
        <div className="p-12 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-800 text-center text-xs text-stone-500 space-y-2">
          <p className="font-serif text-base text-stone-700 dark:text-stone-300">No planning notes in this view yet.</p>
          <p>Capture ideas, character sketches, research citations, or unanswered questions as you work.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map(n => {
            const linkedChapter = chapters.find(c => c.id === n.linkedChapterId);
            return (
              <div
                key={n.id}
                className="rounded-2xl bg-white dark:bg-[#1E1B18] border border-stone-200/90 dark:border-stone-800 p-5 flex flex-col justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-900/10 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      {n.noteType}
                    </span>
                    {linkedChapter && (
                      <button
                        onClick={() => onOpenChapterInStudio(linkedChapter.id)}
                        className="text-[11px] text-stone-500 hover:text-amber-800 flex items-center gap-1 truncate max-w-[170px]"
                        title={`Linked to ${linkedChapter.title}`}
                      >
                        <LinkIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{linkedChapter.title}</span>
                      </button>
                    )}
                  </div>

                  <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                    {n.title}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                    {n.content}
                  </p>

                  {/* Character / Research / Quote Metadata */}
                  {n.metadata?.role && (
                    <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 text-[11px] space-y-1 text-stone-600 dark:text-stone-400">
                      <div><strong>Role:</strong> {n.metadata.role}</div>
                      {n.metadata.motivation && <div><strong>Motivation:</strong> {n.metadata.motivation}</div>}
                      {n.metadata.flaw && <div><strong>Flaw:</strong> {n.metadata.flaw}</div>}
                      {n.metadata.relationships && <div><strong>Relationships:</strong> {n.metadata.relationships}</div>}
                    </div>
                  )}

                  {n.metadata?.sourceAuthor && (
                    <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 text-[11px] text-stone-600 dark:text-stone-400">
                      <strong>Source:</strong> {n.metadata.sourceAuthor} {n.metadata.publication ? `(${n.metadata.publication})` : ''}
                    </div>
                  )}

                  {n.metadata?.attribution && (
                    <div className="text-[11px] italic text-stone-500">— {n.metadata.attribution}</div>
                  )}
                </div>

                {/* Note Actions: Convert to Chapter or Append to Linked Chapter */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConvertToChapter(n, null)}
                      className="flex items-center gap-1 text-amber-900 dark:text-amber-400 font-semibold hover:underline"
                      title="Create a new manuscript chapter from this note without deleting the note"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      Turn into Chapter
                    </button>

                    {linkedChapter && (
                      <button
                        onClick={() => handleConvertToChapter(n, linkedChapter.id)}
                        className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline text-[11px]"
                        title={`Append this note into ${linkedChapter.title}`}
                      >
                        + Send to Linked Chapter
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    className="p-1 text-stone-400 hover:text-red-600"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
