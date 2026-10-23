import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { apiRequest } from '../api/client';

const FRONT_MATTER_SECTIONS = [
  { key: 'dedication', label: 'Dedication', purpose: 'A brief personal inscription honoring the person or people for whom the book was written.' },
  { key: 'epigraph', label: 'Epigraph', purpose: 'A short quotation or poem placed at the beginning of the book to suggest its theme.' },
  { key: 'foreword', label: 'Foreword', purpose: 'An introductory essay written by someone other than the primary author explaining the book’s significance.' },
  { key: 'preface', label: 'Preface', purpose: 'Written by the author to explain how the book came into being, its scope, and why it was written.' },
  { key: 'acknowledgements', label: 'Acknowledgements', purpose: 'Gratitude to editors, researchers, family members, and peers who supported the work.' }
];

const BACK_MATTER_SECTIONS = [
  { key: 'afterword', label: 'Afterword', purpose: 'Closing reflection on the book’s journey or later developments.' },
  { key: 'appendices', label: 'Appendices', purpose: 'Supplementary reference material, worksheets, timelines, or datasets.' },
  { key: 'bibliography', label: 'Bibliography & References', purpose: 'Formal list of primary and secondary sources cited in the work.' },
  { key: 'further_reading', label: 'Further Reading', purpose: 'Recommended books and resources for readers who wish to explore further.' },
  { key: 'author_bio', label: 'About the Author', purpose: 'Biographical note establishing the author’s background and work.' }
];

export default function MetadataMatterView({
  project,
  metadata,
  onMetadataUpdated,
  onProjectUpdated
}) {
  const [title, setTitle] = useState(project?.title || '');
  const [subtitle, setSubtitle] = useState(project?.subtitle || '');
  const [authorName, setAuthorName] = useState(project?.authorName || '');

  const [meta, setMeta] = useState(
    metadata || {
      isbnPrint: '',
      isbnEbook: '',
      publisherName: '',
      publicationDate: '',
      edition: 'First Edition',
      language: 'en',
      copyrightHolder: project?.authorName || '',
      copyrightYear: '',
      rightsStatement: 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form without prior written permission of the copyright holder.',
      bisacCategories: [],
      keywords: [],
      longDescription: project?.description || '',
      shortBlurb: '',
      contributors: [],
      frontMatter: {},
      backMatter: {}
    }
  );

  const [newCategory, setNewCategory] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newContribName, setNewContribName] = useState('');
  const [newContribRole, setNewContribRole] = useState('Co-Author');
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState('');

  useEffect(() => {
    if (project) {
      setTitle(project.title || '');
      setSubtitle(project.subtitle || '');
      setAuthorName(project.authorName || '');
    }
    if (metadata) {
      setMeta(metadata);
    }
  }, [project?.id, metadata]);

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    if (!project?.id) return;
    setSaving(true);
    try {
      const projRes = await apiRequest(`/api/projects/${project.id}`, {
        method: 'PUT',
        body: {
          title,
          subtitle,
          authorName,
          description: meta.longDescription
        }
      });
      if (onProjectUpdated) onProjectUpdated(projRes.project);

      const metaRes = await apiRequest(`/api/projects/${project.id}/metadata`, {
        method: 'PUT',
        body: meta
      });
      if (onMetadataUpdated) onMetadataUpdated(metaRes.metadata);
      setSavedBanner('Saved book metadata, copyright details, front matter, and back matter.');
      setTimeout(() => setSavedBanner(''), 3500);
    } finally {
      setSaving(false);
    }
  };

  const toggleFrontMatter = (key, field, value) => {
    const cur = meta.frontMatter?.[key] || { enabled: false, content: '' };
    setMeta({
      ...meta,
      frontMatter: {
        ...(meta.frontMatter || {}),
        [key]: { ...cur, [field]: value }
      }
    });
  };

  const toggleBackMatter = (key, field, value) => {
    const cur = meta.backMatter?.[key] || { enabled: false, content: '' };
    setMeta({
      ...meta,
      backMatter: {
        ...(meta.backMatter || {}),
        [key]: { ...cur, [field]: value }
      }
    });
  };

  // Identify incomplete official fields without auto-inventing them
  const incompleteFields = [
    !meta.isbnPrint && 'Print ISBN (user-supplied or platform-assigned)',
    !meta.isbnEbook && 'eBook ISBN (optional for KDP/Kobo)',
    !meta.publicationDate && 'Official Publication Date',
    !meta.copyrightYear && 'Copyright Year',
    (meta.bisacCategories || []).length === 0 && 'BISAC Subject Categories',
    (meta.keywords || []).length === 0 && 'Store Search Keywords'
  ].filter(Boolean);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-8 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-400">
            Front Matter, Back Matter &amp; Bibliographic Record
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
            Book Metadata &amp; Publishing Sections
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Configure title pages, copyright statements, contributors, store categories, and optional front/back matter sections included in your exports.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold text-xs shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save All Metadata & Matter'}</span>
        </button>
      </div>

      {savedBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Honest Incomplete Official Fields Status */}
      {incompleteFields.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-800 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-950 dark:text-amber-200">
              Official Publishing Fields Awaiting Your Input
            </div>
            <p className="text-stone-600 dark:text-stone-400">
              We never auto-invent official ISBNs, publication dates, or legal claims. Currently optional/incomplete: <strong>{incompleteFields.join(' • ')}</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Core Bibliographic & Copyright Info */}
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
          <h2 className="font-serif font-bold text-lg">Bibliographic &amp; Copyright Information</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-600 mb-1">Book Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-600 mb-1">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-stone-600 mb-1">Primary Author</label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-600 mb-1">Language (BCP-47)</label>
              <select
                value={meta.language || 'en'}
                onChange={e => setMeta({ ...meta, language: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              >
                <option value="en">English (en)</option>
                <option value="en-GB">English UK (en-GB)</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-600 mb-1">Edition</label>
              <input
                type="text"
                value={meta.edition || ''}
                onChange={e => setMeta({ ...meta, edition: e.target.value })}
                placeholder="First Edition"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-600 mb-1">Publisher / Imprint Name (Optional)</label>
              <input
                type="text"
                value={meta.publisherName || ''}
                onChange={e => setMeta({ ...meta, publisherName: e.target.value })}
                placeholder="Leave blank if self-published without imprint"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-600 mb-1">Publication Date (Optional)</label>
              <input
                type="date"
                value={meta.publicationDate || ''}
                onChange={e => setMeta({ ...meta, publicationDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-600 mb-1">Print ISBN (User-Provided)</label>
              <input
                type="text"
                value={meta.isbnPrint || ''}
                onChange={e => setMeta({ ...meta, isbnPrint: e.target.value })}
                placeholder="978-..."
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-600 mb-1">eBook ISBN (User-Provided)</label>
              <input
                type="text"
                value={meta.isbnEbook || ''}
                onChange={e => setMeta({ ...meta, isbnEbook: e.target.value })}
                placeholder="978-..."
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
            <div>
              <label className="block font-medium text-stone-600 mb-1">Copyright Holder</label>
              <input
                type="text"
                value={meta.copyrightHolder || ''}
                onChange={e => setMeta({ ...meta, copyrightHolder: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-600 mb-1">Copyright Year</label>
              <input
                type="text"
                value={meta.copyrightYear || ''}
                onChange={e => setMeta({ ...meta, copyrightYear: e.target.value })}
                placeholder="e.g., 2026"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-600 mb-1">Copyright &amp; Rights Statement</label>
            <textarea
              rows={2}
              value={meta.rightsStatement || ''}
              onChange={e => setMeta({ ...meta, rightsStatement: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>
        </div>

        {/* Description, Categories, Keywords & Contributors */}
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
          <h2 className="font-serif font-bold text-lg">Store Description, Categories &amp; Contributors</h2>

          <div>
            <label className="block font-medium text-stone-600 mb-1">Long Book Description / Blurb</label>
            <textarea
              rows={4}
              value={meta.longDescription || ''}
              onChange={e => setMeta({ ...meta, longDescription: e.target.value })}
              placeholder="Compelling store and jacket description..."
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>

          {/* BISAC Categories */}
          <div>
            <label className="block font-medium text-stone-600 mb-1">Subject / BISAC Categories</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="e.g., FICTION / Literary or SELF-HELP / Personal Growth"
                className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCategory.trim()) return;
                  setMeta({ ...meta, bisacCategories: [...(meta.bisacCategories || []), newCategory.trim()] });
                  setNewCategory('');
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-white font-medium"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(meta.bisacCategories || []).map((cat, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center gap-1.5">
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setMeta({
                        ...meta,
                        bisacCategories: meta.bisacCategories.filter((_, idx) => idx !== i)
                      })
                    }
                    className="text-stone-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Search Keywords */}
          <div>
            <label className="block font-medium text-stone-600 mb-1">Discovery Keywords (Up to 7 for KDP/Kobo)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="Add search keyword phrase..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newKeyword.trim()) return;
                  setMeta({ ...meta, keywords: [...(meta.keywords || []), newKeyword.trim()] });
                  setNewKeyword('');
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-white font-medium"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(meta.keywords || []).map((kw, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-amber-900/10 text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setMeta({
                        ...meta,
                        keywords: meta.keywords.filter((_, idx) => idx !== i)
                      })
                    }
                    className="text-stone-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Contributors */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <label className="block font-medium text-stone-600 mb-1">Additional Contributors (Foreword, Editor, Illustrator)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newContribName}
                onChange={e => setNewContribName(e.target.value)}
                placeholder="Contributor Name"
                className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <select
                value={newContribRole}
                onChange={e => setNewContribRole(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              >
                <option value="Co-Author">Co-Author</option>
                <option value="Foreword">Foreword By</option>
                <option value="Editor">Editor</option>
                <option value="Illustrator">Illustrator</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!newContribName.trim()) return;
                  setMeta({
                    ...meta,
                    contributors: [...(meta.contributors || []), { name: newContribName.trim(), role: newContribRole }]
                  });
                  setNewContribName('');
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-white font-medium"
              >
                Add
              </button>
            </div>
            <div className="space-y-1">
              {(meta.contributors || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-stone-50 dark:bg-stone-900">
                  <span><strong>{c.name}</strong> ({c.role})</span>
                  <button
                    type="button"
                    onClick={() =>
                      setMeta({
                        ...meta,
                        contributors: meta.contributors.filter((_, idx) => idx !== i)
                      })
                    }
                    className="text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Configurable Front Matter & Back Matter Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
          <div>
            <h2 className="font-serif font-bold text-lg">Front Matter Sections</h2>
            <p className="text-stone-500">Enable only the sections appropriate for your book. Enabled sections are automatically placed before Chapter 1 in DOCX, PDF, and EPUB exports.</p>
          </div>

          <div className="space-y-3">
            {FRONT_MATTER_SECTIONS.map(sec => {
              const entry = meta.frontMatter?.[sec.key] || { enabled: false, content: '' };
              return (
                <div key={sec.key} className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 font-serif font-bold text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(entry.enabled)}
                        onChange={e => toggleFrontMatter(sec.key, 'enabled', e.target.checked)}
                      />
                      <span>{sec.label}</span>
                    </label>
                    <span className="text-[11px] text-stone-400">{entry.enabled ? 'Included in Book' : 'Omitted'}</span>
                  </div>
                  <p className="text-[11px] text-stone-500">{sec.purpose}</p>
                  {entry.enabled && (
                    <textarea
                      rows={3}
                      value={entry.content || ''}
                      onChange={e => toggleFrontMatter(sec.key, 'content', e.target.value)}
                      placeholder={`Write your ${sec.label.toLowerCase()} here...`}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-serif"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
          <div>
            <h2 className="font-serif font-bold text-lg">Back Matter Sections</h2>
            <p className="text-stone-500">Placed after the final chapter of your manuscript during export.</p>
          </div>

          <div className="space-y-3">
            {BACK_MATTER_SECTIONS.map(sec => {
              const entry = meta.backMatter?.[sec.key] || { enabled: false, content: '' };
              return (
                <div key={sec.key} className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 font-serif font-bold text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(entry.enabled)}
                        onChange={e => toggleBackMatter(sec.key, 'enabled', e.target.checked)}
                      />
                      <span>{sec.label}</span>
                    </label>
                    <span className="text-[11px] text-stone-400">{entry.enabled ? 'Included in Book' : 'Omitted'}</span>
                  </div>
                  <p className="text-[11px] text-stone-500">{sec.purpose}</p>
                  {entry.enabled && (
                    <textarea
                      rows={3}
                      value={entry.content || ''}
                      onChange={e => toggleBackMatter(sec.key, 'content', e.target.value)}
                      placeholder={`Write your ${sec.label.toLowerCase()} here...`}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-serif"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
