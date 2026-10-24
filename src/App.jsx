import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import AiProviderSettingsModal from './components/AiProviderSettingsModal';
import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import WizardView from './views/WizardView';
import WritingStudioView from './views/WritingStudioView';
import ExportPublishView from './views/ExportPublishView';
import IndexStepView from './views/IndexStepView';
import { apiRequest, setStoredToken } from './api/client';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  // Views in the 5-step flow:
  // Step 1: 'dashboard'
  // Steps 2 & 3: 'wizard'
  // Step 4: 'writing' (page content, photos, and book style)
  // Step 5: 'export'
  const [currentView, setCurrentView] = useState('dashboard');
  const [preselectedCategory, setPreselectedCategory] = useState('photobook');
  const [wizardStep, setWizardStep] = useState(2);
  const [wizardMode, setWizardMode] = useState('create');

  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [formatting, setFormatting] = useState(null);
  const [assets, setAssets] = useState([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const writingPageFlushRef = useRef(null);

  const registerWritingPageFlush = useCallback((flushPage) => {
    writingPageFlushRef.current = flushPage;
  }, []);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 3600);
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const projRes = await apiRequest('/api/projects');
      const list = projRes.projects || [];
      setProjects(list);
      return list;
    } catch (err) {
      console.warn('Failed to fetch projects list:', err);
      return [];
    }
  }, []);

  const loadActiveProjectDetails = useCallback(async (projectId) => {
    if (!projectId) return null;
    try {
      const [detailRes, assetsRes] = await Promise.all([
        apiRequest(`/api/projects/${projectId}`),
        apiRequest(`/api/projects/${projectId}/assets`)
      ]);
      setActiveProject(detailRes.project);
      setChapters(detailRes.chapters || []);
      setFormatting(detailRes.formatting || null);
      setAssets(assetsRes.assets || []);

      setActiveChapterId((prev) => {
        const exists = (detailRes.chapters || []).some((c) => c.id === prev);
        if (exists) return prev;
        return (
          detailRes.project?.lastOpenedChapterId ||
          detailRes.chapters?.[0]?.id ||
          null
        );
      });

      apiRequest('/api/projects')
        .then((r) => setProjects(r.projects || []))
        .catch(() => {});

      return detailRes;
    } catch (err) {
      console.warn(`Could not load project details for ${projectId}:`, err?.message || err);
      // Clean up active project state so the UI is not left in an inconsistent/broken view
      setActiveProject(null);
      setChapters([]);
      setFormatting(null);
      setAssets([]);
      setActiveChapterId(null);
      // Resync project list to remove any stale project from UI
      try {
        const fresh = await apiRequest('/api/projects');
        setProjects(fresh.projects || []);
      } catch {
        // ignore
      }
      return null;
    }
  }, []);

  // Automatically enter the studio on startup without blocking behind a login screen
  useEffect(() => {
    apiRequest('/api/auth/me')
      .then(async (data) => {
        setUser(data.user);
        setShowAuthScreen(false);
        try {
          const projs = await loadProjects();
          const initialProj =
            projs.find((p) => p.id === data.user?.lastActiveProjectId) || projs[0];
          if (initialProj) {
            await loadActiveProjectDetails(initialProj.id);
          }
        } catch (loadErr) {
          console.warn('Startup project load error:', loadErr);
        }
      })
      .catch(() => {
        setShowAuthScreen(true);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [loadProjects, loadActiveProjectDetails]);

  useEffect(() => {
    if (!user?.id) {
      setAiConfigured(false);
      return undefined;
    }
    let active = true;
    apiRequest('/api/ai/providers')
      .then((result) => {
        if (active) setAiConfigured((result.providers || []).some((provider) => provider.configured));
      })
      .catch(() => {
        if (active) setAiConfigured(false);
      });
    return () => { active = false; };
  }, [user?.id]);

  const handleAuthenticated = async (loggedInUser) => {
    setUser(loggedInUser);
    setShowAuthScreen(false);
    try {
      const projs = await loadProjects();
      if (projs[0]) {
        await loadActiveProjectDetails(projs[0].id);
      }
    } catch (err) {
      console.warn('Post-auth project load error:', err);
    }
    setCurrentView('dashboard');
  };

  // Step 1 -> Step 2 (Locked to chosen book category)
  const handleStartNewWizard = (categoryId) => {
    setPreselectedCategory(categoryId || 'photobook');
    setWizardMode('create');
    setWizardStep(2);
    setCurrentView('wizard');
  };

  // Step 3 -> Step 4 (Creates the Index pages and opens the page chosen in the Index list)
  const handleCreateProject = async (payload) => {
    try {
      const { startChapterIndex = 0, ...projectPayload } = payload || {};
      const res = await apiRequest('/api/projects', {
        method: 'POST',
        body: projectPayload
      });
      if (res?.project) {
        await loadProjects();
        const details = await loadActiveProjectDetails(res.project.id);
        const createdChapters = details?.chapters || res.chapters || [];
        const requestedIndex = Number.isInteger(Number(startChapterIndex))
          ? Number(startChapterIndex)
          : 0;
        const chapterIndex = Math.max(
          0,
          Math.min(requestedIndex, createdChapters.length - 1)
        );
        if (createdChapters[chapterIndex]?.id) {
          setActiveChapterId(createdChapters[chapterIndex].id);
        }
        setActivePageIndex(0);
        setWizardMode('create');
        setCurrentView('writing');
      }
    } catch (err) {
      notify(err.message || 'Failed to create project.', 'error');
    }
  };

  // Open an existing saved book directly into Step 4
  const handleSelectProject = async (projectId, targetView = 'writing') => {
    if (!projectId) return;
    setActivePageIndex(0);
    setWizardMode('edit');
    try {
      const details = await loadActiveProjectDetails(projectId);
      if (details?.project) {
        setCurrentView(targetView);
      } else {
        notify('This book could not be found. Returning to dashboard.', 'error');
        await loadProjects();
        setCurrentView('dashboard');
      }
    } catch (err) {
      console.warn('handleSelectProject error:', err);
      notify('This book could not be opened. Returning to dashboard.', 'error');
      await loadProjects();
      setCurrentView('dashboard');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!projectId) return;
    try {
      await apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' });
      notify('Book removed.');
    } catch (err) {
      notify(err.message || 'Could not delete book.', 'error');
    }
    const remaining = await loadProjects();
    if (activeProject?.id === projectId) {
      if (remaining[0]) {
        await loadActiveProjectDetails(remaining[0].id);
      } else {
        setActiveProject(null);
        setChapters([]);
        setFormatting(null);
        setAssets([]);
        setActiveChapterId(null);
        setCurrentView('dashboard');
      }
    }
  };

  // Step 4: Save chapter script or Index title
  const handleSaveChapter = async (chapterId, updates) => {
    if (!activeProject?.id || !chapterId) return;
    const res = await apiRequest(
      `/api/projects/${activeProject.id}/chapters/${chapterId}`,
      {
        method: 'PUT',
        body: updates
      }
    );
    if (res.chapter) {
      setChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? res.chapter : c))
      );
      return res.chapter;
    }
    return null;
  };

  const handleUpdateProject = async (updates) => {
    if (!activeProject?.id) return null;
    const result = await apiRequest(`/api/projects/${activeProject.id}`, {
      method: 'PUT',
      body: updates
    });
    await loadActiveProjectDetails(activeProject.id);
    return result.project;
  };

  const handleNavigateStep = async (step) => {
    const creatingBook = currentView === 'wizard' && wizardMode === 'create';
    if (currentView === 'writing' && step !== 4 && writingPageFlushRef.current) {
      try {
        await writingPageFlushRef.current();
      } catch (error) {
        notify(error.message || 'Could not save this page before leaving. Please try again.', 'error');
        return;
      }
    }
    if (step === 1) {
      setCurrentView('dashboard');
      return;
    }
    if (step === 2) {
      if (currentView === 'wizard') {
        setWizardStep(2);
        return;
      }
      if (activeProject) {
        setPreselectedCategory(activeProject.publicationType || activeProject.bookType || 'photobook');
        setWizardMode('edit');
        setWizardStep(2);
        setCurrentView('wizard');
      }
      return;
    }
    if (step === 3) {
      if (creatingBook) {
        setWizardStep(3);
      } else if (activeProject) {
        setCurrentView('index');
      }
      return;
    }
    if (step === 4 && activeProject && !creatingBook) {
      setCurrentView('writing');
      return;
    }
    if (step === 5 && activeProject && !creatingBook) {
      setCurrentView('export');
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-bold text-base">
        Opening CreateStudio...
      </div>
    );
  }

  if (showAuthScreen && !user) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  const activeChapter =
    chapters.find((c) => c.id === activeChapterId) || chapters[0] || null;

  return (
    <div
      className="min-h-screen flex flex-col transition-colors"
      style={{
        background:
          'radial-gradient(ellipse at top, #102552 0%, #071430 55%, #040B1B 100%)',
        color: '#FDE08D'
      }}
    >
      <Navbar
        user={user}
        activeProject={activeProject}
        currentView={currentView}
        wizardStep={wizardStep}
        wizardMode={wizardMode}
        onNavigateStep={handleNavigateStep}
        aiConfigured={aiConfigured}
        onOpenAiSettings={() => setAiSettingsOpen(true)}
        onLogout={() => {
          setStoredToken('');
          setUser(null);
          setAiConfigured(false);
          setAiSettingsOpen(false);
          setActiveProject(null);
          setChapters([]);
          setCurrentView('dashboard');
          setShowAuthScreen(true);
        }}
      />
      <AiProviderSettingsModal
        open={aiSettingsOpen}
        onClose={() => setAiSettingsOpen(false)}
        onConfiguredChange={setAiConfigured}
      />

      <main className="flex-1">
        {currentView === 'dashboard' && (
          <DashboardView
            projects={projects}
            activeProject={activeProject}
            onSelectProject={handleSelectProject}
            onStartNewWizard={handleStartNewWizard}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {currentView === 'wizard' && (
          <WizardView
            preselectedCategory={preselectedCategory}
            user={user}
            wizardStep={wizardStep}
            onWizardStepChange={setWizardStep}
            editingProject={wizardMode === 'edit' ? activeProject : null}
            onUpdateProject={handleUpdateProject}
            onCreateProject={handleCreateProject}
          />
        )}

        {currentView === 'index' && activeProject && (
          <IndexStepView
            project={activeProject}
            chapters={chapters}
            onSelectChapter={(chapterId) => {
              setActiveChapterId(chapterId);
              setActivePageIndex(0);
              setCurrentView('writing');
            }}
          />
        )}

        {currentView === 'writing' && activeProject && (
          <WritingStudioView
            project={activeProject}
            chapters={chapters}
            aiConfigured={aiConfigured}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
            activeChapter={activeChapter}
            activePageIndex={activePageIndex}
            onActivePageIndexChange={setActivePageIndex}
            onRegisterPageFlush={registerWritingPageFlush}
            assets={assets}
            onSelectChapter={(chId) => {
              setActiveChapterId(chId);
              setActivePageIndex(0);
            }}
            onSaveChapter={handleSaveChapter}
            onUpdateProject={handleUpdateProject}
            onAssetsChanged={() => loadActiveProjectDetails(activeProject.id)}
            notify={notify}
          />
        )}

        {currentView === 'export' && activeProject && (
          <ExportPublishView
            project={activeProject}
            chapters={chapters}
            formatting={formatting}
            notify={notify}
          />
        )}
      </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-4 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl"
          style={{
            background:
              toast.type === 'error'
                ? 'linear-gradient(145deg, #4B1320, #260A12)'
                : 'linear-gradient(145deg, #0D234C, #061128)',
            color: '#FDE08D',
            border: '1px solid rgba(229, 184, 75, 0.7)'
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
