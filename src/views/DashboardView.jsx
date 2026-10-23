import React from 'react';
import {
  Trash2,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  Tablet
} from 'lucide-react';
import {
  BOOK_CATEGORIES,
  TEMPLATES_BY_CATEGORY
} from '../data/visualTemplatesCatalog';
import TemplateVisualPreview from '../components/TemplateVisualPreview';

const CLASSICAL_SERIF =
  '"Playfair Display", "Cinzel", "Cormorant Garamond", "Newsreader", "Lora", Georgia, "Times New Roman", serif';

export default function DashboardView({
  projects,
  activeProject,
  onSelectProject,
  onStartNewWizard,
  onDeleteProject
}) {
  const generatedPlaceholderTitles = new Set([
    'untitled publication',
    ...BOOK_CATEGORIES.map((category) => `my ${category.shortName.toLowerCase()}`)
  ]);
  const savedBooks = Array.isArray(projects)
    ? projects.filter((project) => {
        const title = String(project?.title || '').trim();
        return title && !generatedPlaceholderTitles.has(title.toLowerCase());
      })
    : [];

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-12"
      style={{ fontFamily: CLASSICAL_SERIF }}
    >
      {/* Step 1 Classical Dark-Blue & Gold Hero Block with Deep Layered Shadows */}
      <div
        className="rounded-3xl p-6 sm:p-10 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #0D234C 0%, #081838 55%, #050F26 100%)',
          border: '2px solid rgba(229, 184, 75, 0.75)',
          boxShadow:
            '0 28px 65px rgba(0, 0, 0, 0.85), 0 8px 30px rgba(229, 184, 75, 0.22), inset 0 0 0 4px rgba(8, 24, 56, 0.9), inset 0 0 0 5px rgba(229, 184, 75, 0.35)'
        }}
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{
              backgroundColor: 'rgba(229, 184, 75, 0.16)',
              color: '#FDE08D',
              border: '1px solid rgba(245, 196, 81, 0.65)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F5C451]" />
            <span>Step 1 of 5 • Pick Your Book Type</span>
          </div>

          <div
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide"
            style={{
              backgroundColor: 'rgba(13, 35, 76, 0.85)',
              color: '#F5C451',
              border: '1px solid rgba(229, 184, 75, 0.5)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
            }}
          >
            <Tablet className="w-3.5 h-3.5 text-[#FDE08D]" />
            <span>Auto-Adapts to Every Tablet (EPUB &amp; PDF)</span>
          </div>
        </div>

        <h1
          className="text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-wide leading-tight"
          style={{
            color: '#FDE08D',
            textShadow: '0 3px 14px rgba(0, 0, 0, 0.8)'
          }}
        >
          What kind of tablet book would you like to create today?
        </h1>

        <div
          className="my-3 text-sm tracking-[0.25em] select-none"
          style={{ color: '#E5B84B' }}
        >
          ─── ❖ ───
        </div>

        <p
          className="text-sm sm:text-lg mt-2 max-w-3xl leading-relaxed italic"
          style={{
            color: '#F3D78B',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.65)'
          }}
        >
          Click one book type below. Once you choose it, all other book types are hidden and we will show you realistic tablet previews of the 8 layout styles, borders, and headings for your book.
        </p>

        {/* Classical 6-Step Overview Pills with Gold Writing & Shadows */}
        <div className="mt-6 flex flex-wrap gap-2.5 text-xs sm:text-sm font-bold">
          <span
            className="px-4 py-2 rounded-xl tracking-wide"
            style={{
              background:
                'linear-gradient(180deg, #FCE38A 0%, #E5B84B 55%, #C89629 100%)',
              color: '#061128',
              border: '1px solid #FFF3B8',
              boxShadow:
                '0 8px 20px rgba(0, 0, 0, 0.65), 0 0 12px rgba(245, 196, 81, 0.35)'
            }}
          >
            I. Pick Book Type
          </span>
          <span
            className="px-3.5 py-2 rounded-xl tracking-wide"
            style={{
              backgroundColor: 'rgba(6, 17, 40, 0.78)',
              color: '#FDE08D',
              border: '1px solid rgba(229, 184, 75, 0.48)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.55)'
            }}
          >
            II. Pick Visual Style &amp; Layout
          </span>
          <span
            className="px-3.5 py-2 rounded-xl tracking-wide"
            style={{
              backgroundColor: 'rgba(6, 17, 40, 0.78)',
              color: '#FDE08D',
              border: '1px solid rgba(229, 184, 75, 0.48)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.55)'
            }}
          >
            III. How Many Pages &amp; Clickable Index
          </span>
          <span
            className="px-3.5 py-2 rounded-xl tracking-wide"
            style={{
              backgroundColor: 'rgba(6, 17, 40, 0.78)',
              color: '#FDE08D',
              border: '1px solid rgba(229, 184, 75, 0.48)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.55)'
            }}
          >
            IV. Type Scripts &amp; Index Titles
          </span>
          <span
            className="px-3.5 py-2 rounded-xl tracking-wide"
            style={{
              backgroundColor: 'rgba(6, 17, 40, 0.78)',
              color: '#FDE08D',
              border: '1px solid rgba(229, 184, 75, 0.48)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.55)'
            }}
          >
            V. Add Photos &amp; Pick Font
          </span>
          <span
            className="px-3.5 py-2 rounded-xl tracking-wide"
            style={{
              backgroundColor: 'rgba(6, 17, 40, 0.78)',
              color: '#FDE08D',
              border: '1px solid rgba(229, 184, 75, 0.48)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.55)'
            }}
          >
            VI. Clickable Index &amp; Download
          </span>
        </div>
      </div>

      {/* Main book-type previews are the large touch targets; no duplicated CTA buttons. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {BOOK_CATEGORIES.map((cat) => {
          const previewTemplate = (TEMPLATES_BY_CATEGORY[cat.id] || [])[0];
          return (
            <div
              key={cat.id}
              className="rounded-3xl p-5 sm:p-7 flex flex-col"
              style={{
                background:
                  'linear-gradient(160deg, #0E244F 0%, #091836 60%, #061026 100%)',
                border: '2px solid rgba(229, 184, 75, 0.65)',
                boxShadow:
                  '0 24px 55px rgba(0, 0, 0, 0.85), 0 8px 25px rgba(229, 184, 75, 0.16), inset 0 1px 0 rgba(253, 224, 141, 0.3)'
              }}
            >
              <button
                type="button"
                aria-label={`Choose ${cat.name}`}
                onClick={() => onStartNewWizard(cat.id)}
                className="w-full touch-manipulation rounded-2xl p-1.5 text-left transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FDE08D] focus-visible:ring-offset-4 focus-visible:ring-offset-[#071430]"
                style={{
                  backgroundColor: '#050D21',
                  border: '1px solid rgba(229, 184, 75, 0.5)',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.75)'
                }}
              >
                <span className="sr-only">Choose {cat.name}</span>
                <TemplateVisualPreview
                  categoryId={cat.id}
                  template={previewTemplate}
                  height="h-56 sm:h-72 lg:h-80"
                  showPlaque={false}
                />
              </button>

              <div className="mt-4">
                <span
                  className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
                  style={{
                    backgroundColor: 'rgba(229, 184, 75, 0.16)',
                    color: '#FDE08D',
                    border: '1px solid rgba(229, 184, 75, 0.55)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)'
                  }}
                >
                  ❖ {cat.badge}
                </span>

                <h2
                  className="text-xl sm:text-2xl font-bold mt-3 tracking-wide"
                  style={{
                    color: '#FDE08D',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.75)'
                  }}
                >
                  {cat.name}
                </h2>
                <p
                  className="text-xs sm:text-sm mt-1.5 leading-relaxed italic"
                  style={{ color: '#F3D78B' }}
                >
                  {cat.tagline}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Saved Books Block with Classical Dark Blue, Gold Writing & Deep Shadows */}
      <section
        aria-label="Saved Books"
        className="rounded-3xl p-6 sm:p-8"
        style={{
          background:
            'linear-gradient(155deg, #0D224A 0%, #081634 60%, #050E24 100%)',
          border: '2px solid rgba(229, 184, 75, 0.65)',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.85), 0 8px 26px rgba(229, 184, 75, 0.16), inset 0 1px 0 rgba(253, 224, 141, 0.28)'
        }}
      >
        <div className="flex items-center justify-between mb-6 pb-3" style={{ borderBottom: '1px solid rgba(229, 184, 75, 0.35)' }}>
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-[#F5C451]" />
            <h2
              className="text-xl sm:text-2xl font-bold tracking-wide"
              style={{
                color: '#FDE08D',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.75)'
              }}
            >
              Saved Books
            </h2>
          </div>
          <span
            className="text-xs sm:text-sm font-bold italic"
            style={{ color: '#E5B84B' }}
          >
            {savedBooks.length} saved
          </span>
        </div>

        {savedBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savedBooks.map((proj) => {
              const cat =
                BOOK_CATEGORIES.find(
                  (c) => c.id === (proj.publicationType || proj.bookType)
                ) || BOOK_CATEGORIES[0];
              const isCurrent = activeProject?.id === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id, 'writing')}
                  className="p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
                  style={{
                    backgroundColor: isCurrent ? '#102A5C' : '#081838',
                    border: isCurrent
                      ? '2px solid #FDE08D'
                      : '1.5px solid rgba(229, 184, 75, 0.5)',
                    boxShadow:
                      '0 14px 35px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(253, 224, 141, 0.2)'
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
                        style={{
                          backgroundColor: 'rgba(229, 184, 75, 0.18)',
                          color: '#FDE08D',
                          border: '1px solid rgba(229, 184, 75, 0.55)'
                        }}
                      >
                        ❖ {cat.shortName}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(proj.id);
                        }}
                        className="p-1.5 rounded-lg transition-colors hover:bg-rose-950/60"
                        style={{ color: '#E5B84B' }}
                        title="Delete this saved book"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h3
                      className="font-bold text-lg mt-2.5 truncate tracking-wide"
                      style={{ color: '#FDE08D' }}
                    >
                      {proj.title}
                    </h3>
                    <p
                      className="text-xs sm:text-sm italic truncate mt-0.5"
                      style={{ color: '#F3D78B' }}
                    >
                      {proj.subtitle || `By ${proj.author || 'Author'}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProject(proj.id, 'writing');
                    }}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all hover:brightness-105"
                    style={{
                      background:
                        'linear-gradient(180deg, #FCE38A 0%, #E5B84B 55%, #C89629 100%)',
                      color: '#061128',
                      border: '1px solid #FFF3B8',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.65)',
                      fontFamily: CLASSICAL_SERIF
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#061128]" />
                    <span>Open “{proj.title.slice(0, 22)}” in Step 4</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl p-5 text-sm sm:text-base italic" style={{ backgroundColor: '#081838', color: '#F3D78B' }}>
            No titled books yet. Explore styles freely; enter a title and tap a Chapter button to save a book you can return to and finish.
          </p>
        )}
      </section>
    </div>
  );
}
