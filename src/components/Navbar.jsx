import React from 'react';
import { Sparkles, CheckCircle2, KeyRound, LogOut } from 'lucide-react';
import { BOOK_CATEGORIES } from '../data/visualTemplatesCatalog';

const CLASSICAL_SERIF =
  '"Playfair Display", "Cinzel", "Cormorant Garamond", "Newsreader", "Lora", Georgia, "Times New Roman", serif';

const WORKFLOW_STEPS = [
  { step: 1, title: 'Start', description: 'Book type' },
  { step: 2, title: 'Style', description: 'Pick a look' },
  { step: 3, title: 'Index', description: 'Chapters' },
  { step: 4, title: 'Pages', description: 'Write & add' },
  { step: 5, title: 'Export', description: 'Preview & download' }
];

function getActiveStep(currentView, wizardStep) {
  if (currentView === 'dashboard') return 1;
  if (currentView === 'wizard') return wizardStep === 3 ? 3 : 2;
  if (currentView === 'index') return 3;
  if (currentView === 'writing') return 4;
  if (currentView === 'export') return 5;
  return 1;
}

export default function Navbar({
  user,
  activeProject,
  currentView,
  wizardStep = 2,
  wizardMode = 'create',
  onNavigateStep,
  aiConfigured = false,
  onOpenAiSettings,
  onLogout
}) {
  const activeCategory = BOOK_CATEGORIES.find(
    (category) => category.id === (activeProject?.publicationType || activeProject?.bookType)
  );
  const activeStep = getActiveStep(currentView, wizardStep);
  const creatingBook = currentView === 'wizard' && wizardMode === 'create';
  const canOpenBook = Boolean(activeProject && !creatingBook);

  const canNavigate = (step) => {
    if (step === 1) return true;
    if (step === 2) return currentView === 'wizard' || Boolean(activeProject);
    if (step === 3) return currentView === 'wizard' || canOpenBook;
    return canOpenBook;
  };

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md transition-colors"
      style={{
        backgroundColor: 'rgba(6, 17, 40, 0.97)',
        borderBottom: '2px solid rgba(229, 184, 75, 0.45)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.65)'
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 space-y-2">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigateStep?.(1)}
            className="flex min-w-0 items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE08D] rounded-xl"
            title="Step 1: Choose a book type or open a saved book"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(145deg, #FCE38A 0%, #E5B84B 55%, #B8860B 100%)',
                color: '#061128',
                border: '1px solid #FFF3B8',
                boxShadow: '0 6px 18px rgba(0,0,0,0.6), 0 0 12px rgba(245,196,81,0.35)'
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="min-w-0" style={{ fontFamily: CLASSICAL_SERIF }}>
              <span className="block truncate font-bold text-base sm:text-lg tracking-wider leading-none" style={{ color: '#FDE08D' }}>
                CreateStudio
              </span>
              <span className="hidden sm:block mt-0.5 text-[10px] italic tracking-wide truncate" style={{ color: '#E5B84B' }}>
                Classical step-by-step book maker
              </span>
            </span>
          </button>

          {activeProject && activeCategory && currentView !== 'dashboard' && (
            <div className="hidden lg:flex min-w-0 items-center gap-2 pl-3" style={{ borderLeft: '1px solid rgba(229, 184, 75, 0.35)' }}>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0" style={{ backgroundColor: 'rgba(229, 184, 75, 0.18)', color: '#FDE08D', border: '1px solid rgba(229, 184, 75, 0.5)', fontFamily: CLASSICAL_SERIF }}>
                <CheckCircle2 className="w-3 h-3 text-[#F5C451]" />
                {activeCategory.shortName}
              </span>
              <span className="text-xs font-bold truncate max-w-[190px]" style={{ color: '#FDE08D', fontFamily: CLASSICAL_SERIF }}>
                {activeProject.title}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <button
                type="button"
                onClick={onOpenAiSettings}
                aria-label="Open AI and image API-key settings"
                title="Manage Gemini, Pexels, and Pixabay API keys"
                className="min-h-9 rounded-xl px-2 sm:px-3 inline-flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold"
                style={{
                  color: '#FDE08D',
                  border: '1px solid rgba(229, 184, 75, 0.55)',
                  backgroundColor: aiConfigured ? 'rgba(229, 184, 75, 0.13)' : 'rgba(6, 17, 40, 0.8)'
                }}
              >
                <KeyRound className="w-3.5 h-3.5 text-[#F5C451]" />
                <span>API keys</span>
              </button>
            )}
            {user && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sign out"
                title="Sign out"
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ color: '#F3D78B', border: '1px solid rgba(229, 184, 75, 0.35)' }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <nav
          aria-label="Book workflow steps"
          className="grid grid-cols-5 gap-1 p-1 rounded-2xl"
          style={{ backgroundColor: '#07142E', border: '1px solid rgba(229, 184, 75, 0.4)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)' }}
        >
          {WORKFLOW_STEPS.map(({ step, title, description }) => {
            const isActive = activeStep === step;
            const enabled = canNavigate(step);
            return (
              <button
                key={step}
                type="button"
                onClick={() => enabled && onNavigateStep?.(step)}
                disabled={!enabled}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${step}: ${title}. ${description}`}
                className="min-w-0 rounded-xl px-1 sm:px-2 py-1.5 sm:py-2 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE08D]"
                style={isActive
                  ? { background: 'linear-gradient(180deg, #FCE38A 0%, #E5B84B 55%, #C89629 100%)', color: '#061128', border: '1px solid #FFF3B8', boxShadow: '0 4px 14px rgba(0,0,0,0.55)', fontFamily: CLASSICAL_SERIF }
                  : { color: '#F3D78B', fontFamily: CLASSICAL_SERIF }}
              >
                <span className="block text-[10px] sm:text-xs font-extrabold leading-tight">
                  <span className="mr-0.5 opacity-70">{step}</span>{title}
                </span>
                <span className={`hidden sm:block mt-0.5 text-[9px] leading-tight truncate ${isActive ? 'text-[#061128]/80' : 'text-[#F3D78B]/80'}`}>
                  {description}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
