import React, { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  History,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  RotateCcw
} from 'lucide-react';
import {
  apiRequest,
  saveLocalDraftBackup,
  getLocalDraftBackup,
  clearLocalDraftBackup
} from '../api/client';

export default function RichTextEditor({
  project,
  chapter,
  assets = [],
  onChapterSaved,
  onSelectForAi,
  editorPrefs,
  externalInsertRequest,
  onClearExternalInsert
}) {
  const editorRef = useRef(null);
  const lastChapterIdRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [title, setTitle] = useState(chapter?.title || '');
  const [subtitle, setSubtitle] = useState(chapter?.subtitle || '');
  const [status, setStatus] = useState(chapter?.status || 'drafting');
  const [targetWords, setTargetWords] = useState(chapter?.targetWords || 1500);
  const [htmlContent, setHtmlContent] = useState(chapter?.contentHtml || '');

  const [saveState, setSaveState] = useState('saved');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(chapter?.updatedAt || null);
  const [versionNum, setVersionNum] = useState(chapter?.version || 1);
  const [recoverableDraft, setRecoverableDraft] = useState(null);

  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (!chapter) return;
    if (lastChapterIdRef.current !== chapter.id) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      lastChapterIdRef.current = chapter.id;
      setTitle(chapter.title || '');
      setSubtitle(chapter.subtitle || '');
      setStatus(chapter.status || 'drafting');
      setTargetWords(chapter.targetWords || 1500);
      setHtmlContent(chapter.contentHtml || '');
      setSaveState('saved');
      setSaveErrorMsg('');
      setLastSavedAt(chapter.updatedAt || null);
      setVersionNum(chapter.version || 1);

      if (editorRef.current) {
        editorRef.current.innerHTML = chapter.contentHtml || '<p></p>';
      }

      const backup = getLocalDraftBackup(chapter.id);
      if (
        backup &&
        backup.contentHtml !== undefined &&
        backup.contentHtml !== (chapter.contentHtml || '') &&
        (!chapter.updatedAt || new Date(backup.backedUpAt) > new Date(chapter.updatedAt))
      ) {
        setRecoverableDraft(backup);
      } else {
        setRecoverableDraft(null);
      }
    }
  }, [chapter?.id]);

  useEffect(() => {
    if (!externalInsertRequest || !editorRef.current) return;
    const { mode, html, text } = externalInsertRequest;
    const snippet = html || `<p>${text}</p>`;

    let nextHtml = editorRef.current.innerHTML;
    if (mode === 'replace_selection') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
        document.execCommand('insertHTML', false, snippet);
        nextHtml = editorRef.current.innerHTML;
      } else {
        nextHtml = `${nextHtml}\n${snippet}`;
        editorRef.current.innerHTML = nextHtml;
      }
    } else {
      nextHtml = `${nextHtml}\n${snippet}`;
      editorRef.current.innerHTML = nextHtml;
    }

    setHtmlContent(nextHtml);
    scheduleAutosave({
      nextTitle: title,
      nextSubtitle: subtitle,
      nextStatus: status,
      nextTargetWords: targetWords,
      nextHtml
    });
    if (onClearExternalInsert) onClearExternalInsert();
  }, [externalInsertRequest]);

  const performServerSave = async ({
    nextTitle = title,
    nextSubtitle = subtitle,
    nextStatus = status,
    nextTargetWords = targetWords,
    nextHtml = htmlContent,
    createSnapshot = false,
    snapshotLabel = 'Saved page'
  } = {}) => {
    if (!project?.id || !chapter?.id) return;
    setSaveState('saving');
    setSaveErrorMsg('');

    try {
      const data = await apiRequest(`/api/projects/${project.id}/chapters/${chapter.id}`, {
        method: 'PUT',
        body: {
          title: nextTitle,
          subtitle: nextSubtitle,
          status: nextStatus,
          targetWords: nextTargetWords,
          contentHtml: nextHtml,
          createSnapshot,
          snapshotLabel
        }
      });

      clearLocalDraftBackup(chapter.id);
      setRecoverableDraft(null);
      setSaveState('saved');
      setLastSavedAt(data.savedAt);
      setVersionNum(data.version || versionNum + 1);
      if (onChapterSaved && data.chapter) {
        onChapterSaved(data.chapter);
      }
    } catch (err) {
      setSaveState('error');
      setSaveErrorMsg(err.message || 'Could not save right now.');
      saveLocalDraftBackup(chapter.id, {
        title: nextTitle,
        subtitle: nextSubtitle,
        status: nextStatus,
        contentHtml: nextHtml
      });
    }
  };

  const scheduleAutosave = ({
    nextTitle = title,
    nextSubtitle = subtitle,
    nextStatus = status,
    nextTargetWords = targetWords,
    nextHtml = htmlContent
  }) => {
    setSaveState('dirty');
    if (chapter?.id) {
      saveLocalDraftBackup(chapter.id, {
        title: nextTitle,
        subtitle: nextSubtitle,
        status: nextStatus,
        contentHtml: nextHtml
      });
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      performServerSave({
        nextTitle,
        nextSubtitle,
        nextStatus,
        nextTargetWords,
        nextHtml
      });
    }, 900);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    setHtmlContent(currentHtml);
    scheduleAutosave({
      nextTitle: title,
      nextSubtitle: subtitle,
      nextStatus: status,
      nextTargetWords: targetWords,
      nextHtml: currentHtml
    });
  };

  const handleSelectionMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0 && onSelectForAi) {
      onSelectForAi(sel.toString().trim());
    }
  };

  const execFormat = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const handleInsertAssetFigure = (asset) => {
    const figHtml = `<figure data-asset-id="${asset.id}" style="width: 80%; margin: 1rem auto; text-align: center;">
      <img src="${asset.dataUrl}" alt="${(asset.altText || asset.caption || asset.originalName).replace(/"/g, '&quot;')}" style="max-width: 100%; height: auto; border-radius: 12px; display: inline-block;" />
      ${asset.caption ? `<figcaption>${asset.caption}</figcaption>` : ''}
    </figure><p><br/></p>`;

    if (editorRef.current) {
      editorRef.current.focus();
      const next = `${editorRef.current.innerHTML}\n${figHtml}`;
      editorRef.current.innerHTML = next;
      setHtmlContent(next);
      performServerSave({ nextHtml: next });
    }
    setShowAssetPicker(false);
  };

  const loadVersionHistory = async () => {
    if (!project?.id || !chapter?.id) return;
    setShowVersionsModal(true);
    setLoadingVersions(true);
    try {
      const data = await apiRequest(`/api/projects/${project.id}/chapters/${chapter.id}/versions`);
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (ver) => {
    if (!project?.id || !chapter?.id) return;
    try {
      const data = await apiRequest(`/api/projects/${project.id}/chapters/${chapter.id}/restore/${ver.id}`, {
        method: 'POST'
      });
      if (data.chapter) {
        setTitle(data.chapter.title);
        setHtmlContent(data.chapter.contentHtml);
        if (editorRef.current) {
          editorRef.current.innerHTML = data.chapter.contentHtml;
        }
        setVersionNum(data.chapter.version);
        setSaveState('saved');
        if (onChapterSaved) onChapterSaved(data.chapter);
        setShowVersionsModal(false);
      }
    } catch (err) {
      setSaveErrorMsg(err.message || 'Could not restore version.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Unsaved Local Draft Recovery Banner */}
      {recoverableDraft && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 shrink-0 text-amber-600" />
            <span>We found unsaved words from earlier. Would you like to put them back?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTitle(recoverableDraft.title || title);
                setSubtitle(recoverableDraft.subtitle || subtitle);
                setHtmlContent(recoverableDraft.contentHtml || '');
                if (editorRef.current) {
                  editorRef.current.innerHTML = recoverableDraft.contentHtml || '';
                }
                performServerSave({
                  nextTitle: recoverableDraft.title || title,
                  nextSubtitle: recoverableDraft.subtitle || subtitle,
                  nextHtml: recoverableDraft.contentHtml || '',
                  createSnapshot: true
                });
              }}
              className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold"
            >
              Yes, Restore My Words
            </button>
            <button
              onClick={() => {
                clearLocalDraftBackup(chapter.id);
                setRecoverableDraft(null);
              }}
              className="px-3 py-1 rounded-lg border border-amber-300"
            >
              No Thanks
            </button>
          </div>
        </div>
      )}

      {/* Simple, Self-Explanatory Formatting Bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => execFormat('formatBlock', 'H2')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
            title="Make selected text a big section heading"
          >
            <Heading1 className="w-3.5 h-3.5" /> Big Heading
          </button>
          <button
            type="button"
            onClick={() => execFormat('formatBlock', 'H3')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
            title="Make selected text a smaller heading"
          >
            <Heading2 className="w-3.5 h-3.5" /> Small Heading
          </button>
          <button
            type="button"
            onClick={() => execFormat('bold')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
          >
            <Bold className="w-3.5 h-3.5" /> Bold
          </button>
          <button
            type="button"
            onClick={() => execFormat('italic')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
          >
            <Italic className="w-3.5 h-3.5" /> Italic
          </button>
          <button
            type="button"
            onClick={() => execFormat('insertUnorderedList')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
          >
            <List className="w-3.5 h-3.5" /> Bullet List
          </button>
          <button
            type="button"
            onClick={() => execFormat('insertOrderedList')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
          >
            <ListOrdered className="w-3.5 h-3.5" /> Numbered List
          </button>
          <button
            type="button"
            onClick={() => execFormat('formatBlock', 'BLOCKQUOTE')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
          >
            <Quote className="w-3.5 h-3.5" /> Highlight Quote
          </button>
          <button
            type="button"
            onClick={() => setShowAssetPicker(prev => !prev)}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Insert Picture
          </button>
        </div>

        {/* Auto-Save Indicator & Simple Save / Undo History Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800">
            {saveState === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">Saving...</span>
              </>
            )}
            {saveState === 'dirty' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-400">Typing...</span>
              </>
            )}
            {saveState === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                  Auto-Saved
                </span>
              </>
            )}
            {saveState === 'error' && (
              <div className="flex items-center gap-1 text-red-600 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span title={saveErrorMsg}>Not saved yet</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              performServerSave({
                nextTitle: title,
                nextSubtitle: subtitle,
                nextStatus: status,
                nextTargetWords: targetWords,
                nextHtml: editorRef.current ? editorRef.current.innerHTML : htmlContent,
                createSnapshot: true
              })
            }
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 text-white text-xs font-bold flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" /> Save Now
          </button>

          <button
            type="button"
            onClick={loadVersionHistory}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-100"
          >
            <History className="w-3.5 h-3.5" /> Past Copies
          </button>
        </div>
      </div>

      {/* Picture Picker Drawer */}
      {showAssetPicker && (
        <div className="bg-indigo-50/70 dark:bg-slate-900 border-b border-indigo-100 dark:border-slate-800 px-6 py-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 dark:text-white">
              Click a picture below to place it on this page (Upload more in Step 2: Pictures):
            </span>
            <button onClick={() => setShowAssetPicker(false)} className="text-slate-500 font-bold">Close ✕</button>
          </div>
          {assets.length === 0 ? (
            <p className="text-slate-500">
              No pictures uploaded yet. Click <strong>“2. Pictures”</strong> in the top menu bar to upload photos from your computer.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto py-1">
              {assets.map(asset => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => handleInsertAssetFigure(asset)}
                  className="shrink-0 w-28 rounded-xl border border-slate-200 bg-white p-1.5 text-left hover:border-indigo-500 transition"
                >
                  <img src={asset.dataUrl} alt={asset.originalName} className="w-full h-16 object-cover rounded-lg" />
                  <div className="truncate font-bold mt-1 text-[10px]">{asset.caption || asset.originalName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clean Modern Page Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-10 space-y-5">
          {/* Page Title & Done Button */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                Page Title &amp; Words
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = status === 'completed' ? 'drafting' : 'completed';
                  setStatus(next);
                  performServerSave({ nextStatus: next });
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                  status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {status === 'completed' ? 'Page Marked Finished ✓' : 'Mark Page as Finished'}
              </button>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleAutosave({ nextTitle: e.target.value });
              }}
              placeholder="Type your page title here..."
              className="w-full text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white bg-transparent border-none focus:outline-none"
            />

            <input
              type="text"
              value={subtitle}
              onChange={(e) => {
                setSubtitle(e.target.value);
                scheduleAutosave({ nextSubtitle: e.target.value });
              }}
              placeholder="Add a short subtitle if you want (optional)..."
              className="w-full text-sm text-slate-500 dark:text-slate-400 bg-transparent border-none focus:outline-none"
            />
          </div>

          {/* Main Typing Area */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">
              Type your main text or extra notes below:
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onMouseUp={handleSelectionMouseUp}
              style={{
                fontSize: `${editorPrefs?.editorFontSize || 17}px`,
                lineHeight: editorPrefs?.editorLineHeight || 1.7
              }}
              className="manuscript-editor text-slate-800 dark:text-slate-100 min-h-[320px]"
            />
          </div>
        </div>
      </div>

      {/* Past Copies Modal */}
      {showVersionsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base">Saved Past Copies of This Page</h3>
              <button onClick={() => setShowVersionsModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            {loadingVersions ? (
              <p className="text-xs text-slate-500 py-4">Loading saved copies...</p>
            ) : versions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No past copies yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {versions.map(ver => (
                  <div key={ver.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold">{ver.title}</div>
                      <div className="text-slate-400 text-[11px]">
                        {new Date(ver.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold"
                    >
                      Put This Copy Back
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
