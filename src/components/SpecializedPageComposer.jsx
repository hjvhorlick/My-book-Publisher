import React from 'react';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { getVisualTemplateForProject } from '../data/visualTemplatesCatalog';

/**
 * Category-locked page script editor + automatic template border & heading preview.
 * Only displays the fields for the book's chosen category — other book types are hidden.
 */
export default function SpecializedPageComposer({
  project,
  chapter,
  assets = [],
  onUpdateStructured,
  onNavigateToImages
}) {
  const categoryId = project?.publicationType || project?.bookType || 'photobook';
  const visualTpl = getVisualTemplateForProject(project);

  const pageBg = project?.coverConfig?.pageBg || visualTpl.pageBg || '#FFFFFF';
  const pageText = project?.coverConfig?.pageText || visualTpl.pageText || '#0F172A';
  const borderColor = project?.coverConfig?.borderColor || visualTpl.borderColor || '#4F46E5';
  const accentColor = project?.coverConfig?.accentColor || visualTpl.accentColor || '#4F46E5';
  const borderStyle = project?.coverConfig?.borderStyle || visualTpl.borderStyle || 'clean-line';
  const headingStyle = project?.coverConfig?.headingStyle || visualTpl.headingStyle || 'top-banner';
  const fontFamily = project?.coverConfig?.fontFamily || visualTpl.fontFamily || 'Plus Jakarta Sans';

  const sd = chapter?.structuredData || {};

  const updateField = (key, val) => {
    onUpdateStructured({ ...sd, [key]: val });
  };

  const borderFrameCss =
    borderStyle === 'double-gold'
      ? { border: `4px double ${borderColor}`, borderRadius: '14px' }
      : borderStyle === 'rounded-frame'
      ? { border: `3px solid ${borderColor}`, borderRadius: '24px' }
      : { border: `2px solid ${borderColor}`, borderRadius: '10px' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT SIDE: Simple Script Inputs ONLY for this Book Category */}
      <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Automatic Template: {visualTpl.name}
            </span>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              Type Your Page Script Below
            </h3>
          </div>
          {onNavigateToImages && (
            <button
              type="button"
              onClick={onNavigateToImages}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Step 5: Insert Photos</span>
            </button>
          )}
        </div>

        {/* PHOTO BOOK SCRIPT INPUTS */}
        {categoryId === 'photobook' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                Opening Story or Note for This Photo Page
              </label>
              <textarea
                rows={2}
                value={sd.curatorialNote || ''}
                onChange={(e) => updateField('curatorialNote', e.target.value)}
                placeholder="Write a short sentence about the photos on this page..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Framed Photos & Captions on This Page
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const current = Array.isArray(sd.captions) ? sd.captions : [
                      { title: 'Photo 1', location: '', technical: '' },
                      { title: 'Photo 2', location: '', technical: '' }
                    ];
                    updateField('captions', [
                      ...current,
                      { title: `Photo ${current.length + 1}`, location: '', technical: '' }
                    ]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Photo Box</span>
                </button>
              </div>

              {(Array.isArray(sd.captions) && sd.captions.length > 0
                ? sd.captions
                : [
                    { title: 'Morning Highlight Photo', location: 'Favorite Place', imageUrl: '' },
                    { title: 'Afternoon Memory Photo', location: 'Special Moment', imageUrl: '' }
                  ]
              ).map((cap, idx, arr) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-700">
                      Photo Frame #{idx + 1}
                    </span>
                    {arr.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'captions',
                            arr.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={cap.title || ''}
                    onChange={(e) => {
                      const next = arr.map((c, i) =>
                        i === idx ? { ...c, title: e.target.value } : c
                      );
                      updateField('captions', next);
                    }}
                    placeholder="Photo Caption / Title"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                  />

                  <input
                    type="text"
                    value={cap.location || ''}
                    onChange={(e) => {
                      const next = arr.map((c, i) =>
                        i === idx ? { ...c, location: e.target.value } : c
                      );
                      updateField('captions', next);
                    }}
                    placeholder="Place, Date, or Short Story Note"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />

                  {assets.length > 0 && (
                    <select
                      value={cap.imageUrl || ''}
                      onChange={(e) => {
                        const next = arr.map((c, i) =>
                          i === idx ? { ...c, imageUrl: e.target.value } : c
                        );
                        updateField('captions', next);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-indigo-900"
                    >
                      <option value="">Choose an uploaded photo for Frame #{idx + 1}...</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.fileUrl}>
                          📷 {a.title || a.fileName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COOKBOOK SCRIPT INPUTS */}
        {categoryId === 'cookbook' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                  Serves
                </label>
                <input
                  type="text"
                  value={sd.servings || ''}
                  onChange={(e) => updateField('servings', e.target.value)}
                  placeholder="4 people"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                  Prep Time
                </label>
                <input
                  type="text"
                  value={sd.prepTime || ''}
                  onChange={(e) => updateField('prepTime', e.target.value)}
                  placeholder="15 mins"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                  Cook Time
                </label>
                <input
                  type="text"
                  value={sd.cookTime || ''}
                  onChange={(e) => updateField('cookTime', e.target.value)}
                  placeholder="25 mins"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                Short Story About This Dish
              </label>
              <textarea
                rows={2}
                value={sd.headnote || ''}
                onChange={(e) => updateField('headnote', e.target.value)}
                placeholder="Why your family loves this recipe..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                Ingredients (One per line)
              </label>
              <textarea
                rows={4}
                value={
                  Array.isArray(sd.ingredients)
                    ? sd.ingredients
                        .map((i) =>
                          typeof i === 'string'
                            ? i
                            : `${i.amount || ''} ${i.unit || ''} ${i.item || ''}`.trim()
                        )
                        .join('\n')
                    : ''
                }
                onChange={(e) =>
                  updateField(
                    'ingredients',
                    e.target.value
                      .split('\n')
                      .map((line) => ({ amount: '', unit: '', item: line }))
                  )
                }
                placeholder={'2 cups flour\n1 tbsp olive oil\nPinch of sea salt'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                Cooking Steps (One step per line)
              </label>
              <textarea
                rows={4}
                value={Array.isArray(sd.steps) ? sd.steps.join('\n') : ''}
                onChange={(e) => updateField('steps', e.target.value.split('\n'))}
                placeholder={'Preheat oven to 375°F.\nMix dry ingredients in a warm bowl.\nBake for 25 minutes until golden.'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                Chef’s Tip Box (Automatically Framed)
              </label>
              <input
                type="text"
                value={sd.chefNotes || ''}
                onChange={(e) => updateField('chefNotes', e.target.value)}
                placeholder="e.g. Serve warm with fresh herbs on top."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>
        )}

        {/* MAGAZINE SCRIPT INPUTS */}
        {categoryId === 'magazine' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Top Banner Tag
                </label>
                <input
                  type="text"
                  value={sd.kicker || ''}
                  onChange={(e) => updateField('kicker', e.target.value)}
                  placeholder="FEATURE STORY"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Writer Name (Byline)
                </label>
                <input
                  type="text"
                  value={sd.byline || ''}
                  onChange={(e) => updateField('byline', e.target.value)}
                  placeholder="By Studio Editor"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Big Highlight Quote (Automatically Framed)
              </label>
              <input
                type="text"
                value={sd.pullQuote || ''}
                onChange={(e) => updateField('pullQuote', e.target.value)}
                placeholder="Type an exciting sentence to highlight in the middle of the page..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Article Script (Automatically Flows into Columns)
              </label>
              <textarea
                rows={6}
                value={sd.articleBody || ''}
                onChange={(e) => updateField('articleBody', e.target.value)}
                placeholder="Type your magazine story here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Side Highlight Box (Optional Quick Facts)
              </label>
              <textarea
                rows={2}
                value={sd.sidebarContent || ''}
                onChange={(e) => updateField('sidebarContent', e.target.value)}
                placeholder="3 Quick Facts or Highlights..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>
        )}

        {/* CHILDREN'S PICTURE BOOK SCRIPT INPUTS */}
        {categoryId === 'storybook' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Big Story Words on This Page
              </label>
              <textarea
                rows={4}
                value={sd.storyText || ''}
                onChange={(e) => updateField('storyText', e.target.value)}
                placeholder="Once upon a time, the little lantern glowed brightly..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Picture Description / Illustration Note
              </label>
              <input
                type="text"
                value={sd.illustrationPrompt || ''}
                onChange={(e) => updateField('illustrationPrompt', e.target.value)}
                placeholder="Describe the picture on this page..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>
        )}

        {/* HOW-TO / INFORMATIONAL GUIDE INPUTS */}
        {categoryId === 'informational' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Main Explanation / Guide Script
              </label>
              <textarea
                rows={4}
                value={sd.overview || ''}
                onChange={(e) => updateField('overview', e.target.value)}
                placeholder="Explain this step or topic simply..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Important Tip Box (Automatically Framed)
              </label>
              <input
                type="text"
                value={sd.calloutTitle || ''}
                onChange={(e) => updateField('calloutTitle', e.target.value)}
                placeholder="Tip Title (e.g. Helpful Reminder)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold mb-2"
              />
              <textarea
                rows={2}
                value={sd.calloutBody || ''}
                onChange={(e) => updateField('calloutBody', e.target.value)}
                placeholder="Write your helpful tip here..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>
        )}

        {/* WORKBOOK & JOURNAL INPUTS */}
        {categoryId === 'workbook' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Goal or Question Prompt for This Worksheet
              </label>
              <textarea
                rows={3}
                value={sd.objective || ''}
                onChange={(e) => updateField('objective', e.target.value)}
                placeholder="What should the reader think about or write on this page?"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                Checklist Items (One per line)
              </label>
              <textarea
                rows={4}
                value={Array.isArray(sd.checklistItems) ? sd.checklistItems.join('\n') : ''}
                onChange={(e) => updateField('checklistItems', e.target.value.split('\n'))}
                placeholder={'Complete step 1\nWrite down 3 ideas\nReview progress'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDE: LIVE PAGE PREVIEW WITH AUTOMATIC TEMPLATE BORDERS & HEADINGS */}
      <div className="lg:col-span-6 sticky top-24">
        <div className="bg-slate-200/70 rounded-3xl p-4 sm:p-6 border border-slate-300/80 shadow-inner">
          <div className="flex items-center justify-between mb-3 text-xs font-extrabold text-slate-600">
            <span>LIVE AUTOMATIC TEMPLATE PREVIEW</span>
            <span className="text-indigo-600">{visualTpl.name}</span>
          </div>

          {/* Framed Book Page */}
          <div
            className="w-full min-h-[420px] p-6 shadow-xl flex flex-col justify-between transition-all"
            style={{
              backgroundColor: pageBg,
              color: pageText,
              fontFamily,
              ...borderFrameCss
            }}
          >
            {/* Automatic Template Heading */}
            <div>
              {headingStyle === 'top-banner' && (
                <div
                  className="w-full px-4 py-2.5 rounded-xl flex items-center justify-between text-white font-extrabold text-sm tracking-wide shadow-sm mb-5"
                  style={{ backgroundColor: accentColor }}
                >
                  <span>{chapter?.title || 'Page Title'}</span>
                  <span className="text-xs opacity-85">
                    INDEX #{Number(chapter?.orderIndex || 0) + 1}
                  </span>
                </div>
              )}

              {headingStyle === 'centered-pill' && (
                <div className="text-center mb-5">
                  <span
                    className="inline-block px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-white mb-2"
                    style={{ backgroundColor: accentColor }}
                  >
                    Index #{Number(chapter?.orderIndex || 0) + 1}
                  </span>
                  <h2 className="text-xl font-extrabold">{chapter?.title || 'Page Title'}</h2>
                </div>
              )}

              {headingStyle === 'underline-bar' && (
                <div
                  className="pb-2.5 mb-5 flex items-baseline justify-between"
                  style={{ borderBottom: `3px solid ${accentColor}` }}
                >
                  <h2 className="text-xl font-extrabold">{chapter?.title || 'Page Title'}</h2>
                  <span className="text-xs font-extrabold" style={{ color: accentColor }}>
                    INDEX #{Number(chapter?.orderIndex || 0) + 1}
                  </span>
                </div>
              )}

              {/* Primary Hero Photo if attached */}
              {sd.heroImageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border-2" style={{ borderColor }}>
                  <img
                    src={sd.heroImageUrl}
                    alt={chapter?.title || 'Page photo'}
                    className="w-full h-44 object-cover"
                  />
                </div>
              )}

              {/* Live Category Content Inside Automatic Frame */}
              {categoryId === 'photobook' && (
                <div className="space-y-4">
                  {sd.curatorialNote && (
                    <p className="text-xs italic opacity-85 text-center px-2">
                      “{sd.curatorialNote}”
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {(Array.isArray(sd.captions) && sd.captions.length > 0
                      ? sd.captions
                      : [
                          { title: 'Morning Highlight Photo', location: 'Favorite Place' },
                          { title: 'Afternoon Memory Photo', location: 'Special Moment' }
                        ]
                    ).map((cap, i) => (
                      <div
                        key={i}
                        className="rounded-xl p-2.5 flex flex-col justify-between"
                        style={{
                          border: `1.5px solid ${borderColor}`,
                          backgroundColor: `${accentColor}12`
                        }}
                      >
                        {cap.imageUrl ? (
                          <img
                            src={cap.imageUrl}
                            alt={cap.title || 'Photo'}
                            className="w-full h-28 object-cover rounded-lg mb-2"
                          />
                        ) : (
                          <div
                            className="w-full h-28 rounded-lg mb-2 flex flex-col items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: `${borderColor}22` }}
                          >
                            <span className="text-2xl mb-1">📷</span>
                            <span>Photo Frame #{i + 1}</span>
                          </div>
                        )}
                        <div className="text-xs font-extrabold">{cap.title || `Photo #${i + 1}`}</div>
                        {cap.location && (
                          <div className="text-[11px] opacity-75">{cap.location}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {categoryId === 'cookbook' && (
                <div className="space-y-3 text-xs">
                  <div
                    className="flex flex-wrap gap-3 p-2.5 rounded-xl font-bold"
                    style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                  >
                    <span>🍽 Serves: {sd.servings || '4'}</span>
                    <span>⏱ Prep: {sd.prepTime || '15m'}</span>
                    <span>🔥 Cook: {sd.cookTime || '25m'}</span>
                  </div>
                  {sd.headnote && <p className="italic opacity-85">{sd.headnote}</p>}
                  <div className="grid grid-cols-12 gap-3">
                    <div
                      className="col-span-5 p-3 rounded-xl space-y-1"
                      style={{ backgroundColor: `${borderColor}15`, border: `1px solid ${borderColor}55` }}
                    >
                      <div className="font-extrabold uppercase text-[10px]" style={{ color: accentColor }}>
                        Ingredients
                      </div>
                      {(Array.isArray(sd.ingredients) && sd.ingredients.length > 0
                        ? sd.ingredients
                        : [{ item: '2 cups flour' }, { item: '1 tbsp olive oil' }]
                      ).map((ing, i) => (
                        <div key={i}>
                          • {typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.item || ''}`}
                        </div>
                      ))}
                    </div>
                    <div className="col-span-7 space-y-1.5">
                      <div className="font-extrabold uppercase text-[10px]" style={{ color: accentColor }}>
                        Step-by-Step Instructions
                      </div>
                      {(Array.isArray(sd.steps) && sd.steps.length > 0
                        ? sd.steps
                        : ['Mix the warm ingredients together.', 'Bake until golden and serve.']
                      ).map((st, i) => (
                        <div key={i}>
                          <strong>{i + 1}.</strong> {st}
                        </div>
                      ))}
                    </div>
                  </div>
                  {sd.chefNotes && (
                    <div
                      className="p-2.5 rounded-xl font-semibold"
                      style={{ backgroundColor: `${accentColor}15`, borderLeft: `4px solid ${accentColor}` }}
                    >
                      <strong>Chef’s Tip:</strong> {sd.chefNotes}
                    </div>
                  )}
                </div>
              )}

              {categoryId === 'magazine' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between font-bold uppercase text-[11px]" style={{ color: accentColor }}>
                    <span>{sd.kicker || 'FEATURE STORY'}</span>
                    <span>{sd.byline || ''}</span>
                  </div>
                  {sd.pullQuote && (
                    <div
                      className="p-3 rounded-xl font-extrabold italic text-sm"
                      style={{ backgroundColor: `${accentColor}15`, borderLeft: `4px solid ${accentColor}` }}
                    >
                      “{sd.pullQuote}”
                    </div>
                  )}
                  <div className="columns-2 gap-4 leading-relaxed whitespace-pre-line">
                    {sd.articleBody || 'Type your article script on the left and watch it automatically flow into clean magazine columns inside your framed page.'}
                  </div>
                </div>
              )}

              {categoryId === 'storybook' && (
                <div className="space-y-4 text-center py-4">
                  <p className="text-base sm:text-lg font-bold leading-relaxed">
                    {sd.storyText || 'Once upon a time, your story words appear here in big, friendly letters...'}
                  </p>
                </div>
              )}

              {categoryId === 'informational' && (
                <div className="space-y-3 text-xs">
                  <p className="leading-relaxed whitespace-pre-line">
                    {sd.overview || 'Your step-by-step guide explanation appears here inside the automatic template border.'}
                  </p>
                  {(sd.calloutTitle || sd.calloutBody) && (
                    <div
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${accentColor}15`, borderLeft: `4px solid ${accentColor}` }}
                    >
                      <div className="font-extrabold">{sd.calloutTitle || 'Helpful Tip'}</div>
                      <div className="mt-1">{sd.calloutBody}</div>
                    </div>
                  )}
                </div>
              )}

              {categoryId === 'workbook' && (
                <div className="space-y-3 text-xs">
                  <p className="font-semibold">
                    {sd.objective || 'Worksheet goal & instructions appear here:'}
                  </p>
                  <div className="space-y-1.5">
                    {(Array.isArray(sd.checklistItems) && sd.checklistItems.length > 0
                      ? sd.checklistItems
                      : ['Action item 1', 'Action item 2']
                    ).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded border inline-block" style={{ borderColor: accentColor }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 space-y-3">
                    <div className="border-b border-dashed py-1.5 opacity-60" style={{ borderColor }}>
                      Reader writing line 1...
                    </div>
                    <div className="border-b border-dashed py-1.5 opacity-60" style={{ borderColor }} />
                  </div>
                </div>
              )}
            </div>

            {/* Automatic Framed Page Footer */}
            <div
              className="mt-6 pt-2.5 flex items-center justify-between text-[11px] font-bold opacity-75"
              style={{ borderTop: `1px solid ${borderColor}55` }}
            >
              <span>{project?.title || 'My Book'}</span>
              <span>Clickable Index #{Number(chapter?.orderIndex || 0) + 1}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
