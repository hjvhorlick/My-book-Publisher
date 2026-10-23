import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Check, ClipboardPaste, ExternalLink, Eye, EyeOff, KeyRound, LoaderCircle, Trash2, X } from 'lucide-react';
import { apiRequest } from '../api/client';

const INITIAL_GEMINI_PROVIDER = {
  id: 'gemini',
  name: 'Google Gemini',
  description: 'Connect a Google AI Studio key to use Gemini for contextual writing assistance.',
  configured: false,
  keyLastFour: '',
  model: 'gemini-3.8-flash',
  priority: 1,
  usage: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  lastError: ''
};

const INITIAL_IMAGE_PROVIDERS = [
  { id: 'pexels', name: 'Pexels', description: 'Search the Pexels photo library for book-page images.', configured: false, keyLastFour: '', lastError: '', keyUrl: 'https://www.pexels.com/api/documentation/' },
  { id: 'pixabay', name: 'Pixabay', description: 'Search Pixabay photos and illustrations for book-page images.', configured: false, keyLastFour: '', lastError: '', keyUrl: 'https://pixabay.com/api/docs/' }
];

const PROVIDER_LINKS = {
  gemini: {
    keys: 'https://aistudio.google.com/app/apikey',
    pricing: 'https://ai.google.dev/gemini-api/docs/pricing'
  },
  groq: {
    keys: 'https://console.groq.com/keys',
    pricing: 'https://groq.com/pricing'
  },
  openai: {
    keys: 'https://platform.openai.com/api-keys',
    pricing: 'https://openai.com/api/pricing/'
  }
};

function usageLabel(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

export function handleApiKeyPaste(event, { onKey, onFeedback }) {
  const clipboardData = event.clipboardData;
  const pastedKey = String(clipboardData?.getData('text/plain') || clipboardData?.getData('text') || '').trim();
  if (!pastedKey) {
    // Clipboard contents are not exposed in some browsers/embedded previews. Do not
    // cancel the event here: the browser may still be able to perform native paste.
    onFeedback({
      type: 'warning',
      text: 'Clipboard text is unavailable to this page; allowing the browser’s normal paste. If nothing appears, use the Paste button or check clipboard permission.'
    });
    return false;
  }
  event.preventDefault();
  onKey(pastedKey);
  onFeedback({
    type: 'success',
    text: 'Key pasted. Use the eye to verify it, then click Save settings.'
  });
  return true;
}

export default function AiProviderSettingsModal({ open, onClose, onConfiguredChange }) {
  const [providers, setProviders] = useState([INITIAL_GEMINI_PROVIDER]);
  const [imageProviders, setImageProviders] = useState(INITIAL_IMAGE_PROVIDERS);
  const [apiKeys, setApiKeys] = useState({});
  const [imageApiKeys, setImageApiKeys] = useState({});
  const [visibleKeys, setVisibleKeys] = useState({});
  const [visibleImageKeys, setVisibleImageKeys] = useState({});
  const [keyFeedback, setKeyFeedback] = useState({});
  const [imageKeyFeedback, setImageKeyFeedback] = useState({});
  const [modelsByProvider, setModelsByProvider] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageSettingsLoading, setImageSettingsLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let mounted = true;
    setLoading(true);
    setImageSettingsLoading(true);
    setError('');
    apiRequest('/api/ai/providers')
      .then((result) => {
        if (!mounted) return;
        const list = result.providers || [];
        setProviders(list);
        onConfiguredChange?.(list.some((provider) => provider.configured));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Could not load AI providers.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    apiRequest('/api/image-providers')
      .then((result) => {
        if (mounted) setImageProviders(result.providers || INITIAL_IMAGE_PROVIDERS);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Could not load image-provider settings.');
      })
      .finally(() => {
        if (mounted) setImageSettingsLoading(false);
      });
    return () => { mounted = false; };
  }, [open, onConfiguredChange]);

  if (!open) return null;

  const applyProviders = (list) => {
    setProviders(list || []);
    onConfiguredChange?.((list || []).some((provider) => provider.configured));
  };

  const updateProvider = (providerId, patch) => {
    setProviders((current) => current.map((provider) =>
      provider.id === providerId ? { ...provider, ...patch } : provider
    ));
  };

  const applyImageProviders = (list) => setImageProviders(list || INITIAL_IMAGE_PROVIDERS);

  const updateImageKeyFeedback = (providerId, feedback) => {
    setImageKeyFeedback((current) => ({ ...current, [providerId]: feedback }));
  };

  const saveImageProvider = async (provider) => {
    setBusyId(`image-${provider.id}`);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest(`/api/image-providers/${provider.id}`, {
        method: 'PUT',
        body: { apiKey: imageApiKeys[provider.id] || '' }
      });
      setImageApiKeys((current) => ({ ...current, [provider.id]: '' }));
      applyImageProviders(result.providers);
      setMessage(`${provider.name} image-search key saved securely. Test the connection before searching.`);
    } catch (saveError) {
      setError(saveError.message || `Could not save the ${provider.name} key.`);
    } finally {
      setBusyId('');
    }
  };

  const testImageProvider = async (provider) => {
    setBusyId(`image-${provider.id}`);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest(`/api/image-providers/${provider.id}/test`, {
        method: 'POST',
        body: { apiKey: imageApiKeys[provider.id] || '' }
      });
      const settings = await apiRequest('/api/image-providers');
      applyImageProviders(settings.providers);
      setMessage(result.message || `${provider.name} connection succeeded.`);
    } catch (testError) {
      setError(testError.message || `Could not test the ${provider.name} key.`);
      try {
        const settings = await apiRequest('/api/image-providers');
        applyImageProviders(settings.providers);
      } catch {
        // Keep the test error visible if the settings refresh also fails.
      }
    } finally {
      setBusyId('');
    }
  };

  const removeImageProvider = async (provider) => {
    setBusyId(`image-${provider.id}`);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest(`/api/image-providers/${provider.id}`, { method: 'DELETE' });
      setImageApiKeys((current) => ({ ...current, [provider.id]: '' }));
      applyImageProviders(result.providers);
      setMessage(`${provider.name} key was removed.`);
    } catch (removeError) {
      setError(removeError.message || `Could not remove the ${provider.name} key.`);
    } finally {
      setBusyId('');
    }
  };

  const pasteImageApiKey = async (provider) => {
    updateImageKeyFeedback(provider.id, null);
    setError('');
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
        updateImageKeyFeedback(provider.id, {
          type: 'error',
          text: 'Automatic clipboard access is unavailable. Focus the field and press Ctrl+V (Windows/Linux) or Cmd+V (Mac).'
        });
        return;
      }
      const value = String(await navigator.clipboard.readText() || '').trim();
      if (!value) {
        updateImageKeyFeedback(provider.id, { type: 'error', text: 'Clipboard is empty. Copy the key first, then paste it here.' });
        return;
      }
      setImageApiKeys((current) => ({ ...current, [provider.id]: value }));
      updateImageKeyFeedback(provider.id, { type: 'success', text: 'Key pasted. Use the eye to verify it, then save.' });
    } catch (pasteError) {
      updateImageKeyFeedback(provider.id, {
        type: 'error',
        text: `${pasteError.message || 'Clipboard access was blocked.'} Focus the field and press Ctrl+V / Cmd+V.`
      });
    }
  };

  const saveProvider = async (provider) => {
    setBusyId(provider.id);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest(`/api/ai/providers/${provider.id}`, {
        method: 'PUT',
        body: {
          apiKey: apiKeys[provider.id] || '',
          model: provider.model,
          priority: Number(provider.priority) || 1
        }
      });
      setApiKeys((current) => ({ ...current, [provider.id]: '' }));
      applyProviders(result.providers);
      setMessage(`${provider.name} settings saved. Test the connection before using it.`);
    } catch (saveError) {
      setError(saveError.message || `Could not save ${provider.name}.`);
    } finally {
      setBusyId('');
    }
  };

  const loadModels = async (provider) => {
    setBusyId(provider.id);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest(`/api/ai/providers/${provider.id}/models`, {
        method: 'POST',
        body: { apiKey: apiKeys[provider.id] || '' }
      });
      const models = result.models || [];
      setModelsByProvider((current) => ({ ...current, [provider.id]: models }));
      const currentModelExists = models.some((model) => model.id === provider.model);
      const preferredGemini = provider.id === 'gemini'
        ? models.find((model) => model.id === 'gemini-3.8-flash') || models.find((model) => /flash/i.test(model.id))
        : null;
      const selectedModel = currentModelExists ? provider.model : (preferredGemini?.id || models[0]?.id);
      if (selectedModel) updateProvider(provider.id, { model: selectedModel });
      setMessage(`${models.length} available ${provider.name} text model${models.length === 1 ? '' : 's'} loaded${selectedModel ? ` · selected ${selectedModel}` : ''}. Save settings to use this model.`);
    } catch (modelError) {
      setError(modelError.message || `Could not load ${provider.name} models.`);
    } finally {
      setBusyId('');
    }
  };

  const testProvider = async (provider) => {
    setBusyId(provider.id);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest(`/api/ai/providers/${provider.id}/test`, { method: 'POST', body: {} });
      const settings = await apiRequest('/api/ai/providers');
      applyProviders(settings.providers);
      setMessage(`${result.provider} connection succeeded${result.usage?.totalTokens ? ` · ${usageLabel(result.usage.totalTokens)} tokens used` : ''}.`);
    } catch (testError) {
      setError(testError.message || `Could not test ${provider.name}.`);
      try {
        const settings = await apiRequest('/api/ai/providers');
        applyProviders(settings.providers);
      } catch {
        // Keep the test error visible; the existing provider row remains in place.
      }
    } finally {
      setBusyId('');
    }
  };

  const removeProvider = async (provider) => {
    setBusyId(provider.id);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest(`/api/ai/providers/${provider.id}`, { method: 'DELETE' });
      setApiKeys((current) => ({ ...current, [provider.id]: '' }));
      applyProviders(result.providers);
      setMessage(`${provider.name} was removed.`);
    } catch (removeError) {
      setError(removeError.message || `Could not remove ${provider.name}.`);
    } finally {
      setBusyId('');
    }
  };

  const updateKeyFeedback = (providerId, feedback) => {
    setKeyFeedback((current) => ({ ...current, [providerId]: feedback }));
  };

  const pasteApiKey = async (provider) => {
    updateKeyFeedback(provider.id, null);
    setError('');
    setMessage('');
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
        updateKeyFeedback(provider.id, {
          type: 'error',
          text: 'Automatic clipboard access is unavailable. Click the field and press Ctrl+V (Windows/Linux) or Cmd+V (Mac).'
        });
        return;
      }
      const clipboardText = await navigator.clipboard.readText();
      const pastedKey = String(clipboardText || '').trim();
      if (!pastedKey) {
        updateKeyFeedback(provider.id, {
          type: 'error',
          text: 'Clipboard is empty. Copy the key first, or click the field and press Ctrl+V / Cmd+V.'
        });
        return;
      }
      setApiKeys((current) => ({ ...current, [provider.id]: pastedKey }));
      updateKeyFeedback(provider.id, {
        type: 'success',
        text: 'Key pasted. Use the eye to verify it, then click Save settings.'
      });
    } catch (pasteError) {
      const reason = String(pasteError?.message || '').trim();
      updateKeyFeedback(provider.id, {
        type: 'error',
        text: `${reason ? `${reason} ` : 'Clipboard access was blocked. '}Click the field and press Ctrl+V (Windows/Linux) or Cmd+V (Mac).`
      });
    }
  };

  const orderedProviders = [...providers].sort((a, b) => {
    if (a.id === 'gemini' && b.id !== 'gemini') return -1;
    if (b.id === 'gemini' && a.id !== 'gemini') return 1;
    return Number(a.priority || 99) - Number(b.priority || 99);
  });

  const dialog = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) onClose?.(); }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl"
        style={{ background: 'linear-gradient(155deg, #0D234C 0%, #081838 58%, #050F26 100%)', border: '2px solid rgba(229,184,75,.75)', boxShadow: '0 30px 100px rgba(0,0,0,.8)' }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-amber-300/20 p-4 sm:p-6">
          <div>
            <h2 id="ai-settings-title" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[#FDE08D]">
              <KeyRound className="h-5 w-5 text-[#F5C451]" /> AI and image provider keys
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#F3D78B]">
              Add your Gemini key in the first card for writing assistance. Pexels and Pixabay image-search keys are managed in the stock-image section below; all keys are encrypted on this server.
            </p>
          </div>
          <button type="button" aria-label="Close API key settings" onClick={onClose} disabled={Boolean(busyId)} className="rounded-xl p-2 text-[#FDE08D] hover:bg-white/10 disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-[#F3D78B]/80"><LoaderCircle className="h-3 w-3 animate-spin" /> Checking saved provider settings…</div>
          )}
          {orderedProviders.map((provider) => {
            const links = PROVIDER_LINKS[provider.id] || {};
            const isBusy = busyId === provider.id;
            return (
              <article key={provider.id} className="rounded-2xl border border-amber-200/30 bg-[#07142E]/90 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[#FDE08D]">{provider.name}</h3>
                      {provider.id === 'gemini' && <span className="rounded-full border border-amber-200/35 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100">Recommended for your test</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${provider.configured ? 'bg-emerald-900/60 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                        {provider.configured ? `Configured · •••• ${provider.keyLastFour}` : 'Not configured'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#F3D78B]">{provider.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                      {links.keys && <a href={links.keys} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-200 underline underline-offset-2">Get an API key <ExternalLink className="h-3 w-3" /></a>}
                      {links.pricing && <a href={links.pricing} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-200 underline underline-offset-2">Current pricing <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                  </div>
                  {provider.configured && (
                    <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-[#F3D78B]">
                      <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" /> Requests</span><strong className="text-right text-[#FDE08D]">{usageLabel(provider.usage?.requests)}</strong>
                      <span>Prompt tokens</span><strong className="text-right text-[#FDE08D]">{usageLabel(provider.usage?.promptTokens)}</strong>
                      <span>Completion tokens</span><strong className="text-right text-[#FDE08D]">{usageLabel(provider.usage?.completionTokens)}</strong>
                      <span>Total tokens</span><strong className="text-right text-[#FDE08D]">{usageLabel(provider.usage?.totalTokens)}</strong>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-6 min-w-0 text-[10px] font-bold text-[#F3D78B]">
                    <label htmlFor={`ai-api-key-${provider.id}`}>
                      {provider.configured ? 'Replace API key (leave blank to keep current)' : `${provider.name} API key`}
                    </label>
                    <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                      <input
                        id={`ai-api-key-${provider.id}`}
                        type={visibleKeys[provider.id] ? 'text' : 'password'}
                        autoFocus={provider.id === 'gemini'}
                        autoComplete="off"
                        spellCheck="false"
                        value={apiKeys[provider.id] || ''}
                        onChange={(event) => {
                          setApiKeys((current) => ({ ...current, [provider.id]: event.target.value }));
                          updateKeyFeedback(provider.id, null);
                          setError('');
                          setMessage('');
                        }}
                        onPaste={(event) => handleApiKeyPaste(event, {
                          onKey: (pastedKey) => {
                            setApiKeys((current) => ({ ...current, [provider.id]: pastedKey }));
                            setError('');
                            setMessage('');
                          },
                          onFeedback: (feedback) => updateKeyFeedback(provider.id, feedback)
                        })}
                        aria-label={`${provider.name} API key`}
                        placeholder={provider.configured ? 'Saved securely · enter a new key to rotate' : provider.id === 'gemini' ? 'Paste the key from Google AI Studio' : `Paste your ${provider.name} API key`}
                        className="min-h-10 min-w-0 flex-1 rounded-xl border border-amber-200/30 bg-[#040B1B] px-3 text-xs text-white outline-none focus:border-amber-200/80"
                      />
                      <button
                        type="button"
                        onClick={() => setVisibleKeys((current) => ({ ...current, [provider.id]: !current[provider.id] }))}
                        aria-label={visibleKeys[provider.id] ? 'Hide API key' : 'Show API key'}
                        title={visibleKeys[provider.id] ? 'Hide key' : 'Show key to verify it pasted'}
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-amber-200/30 text-amber-100"
                      >
                        {visibleKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => pasteApiKey(provider)}
                        aria-label={`Paste ${provider.name} API key from clipboard`}
                        title="Paste from clipboard"
                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-amber-200/45 px-2 text-[10px] font-bold text-amber-100"
                      >
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        <span>Paste</span>
                      </button>
                    </div>
                    <span className="mt-1 block font-normal text-[#F3D78B]/80">Click <strong>Paste</strong> or focus the field and press Ctrl+V / Cmd+V. Use the eye to confirm the key appeared. The key is encrypted on this server and never returned to page code.</span>
                    {keyFeedback[provider.id]?.text && (
                      <p
                        role={keyFeedback[provider.id].type === 'error' ? 'alert' : 'status'}
                        className={`mt-1 text-[10px] font-semibold ${keyFeedback[provider.id].type === 'error' ? 'text-rose-200' : keyFeedback[provider.id].type === 'warning' ? 'text-amber-100' : 'text-emerald-200'}`}
                      >
                        {keyFeedback[provider.id].text}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-4 text-[10px] font-bold text-[#F3D78B]">
                    <label htmlFor={`ai-model-${provider.id}`}>Model ID</label>
                    <input
                      id={`ai-model-${provider.id}`}
                      type="text"
                      list={`ai-model-list-${provider.id}`}
                      value={provider.model || ''}
                      onChange={(event) => updateProvider(provider.id, { model: event.target.value })}
                      className="mt-1.5 min-h-10 w-full rounded-xl border border-amber-200/30 bg-[#040B1B] px-3 text-xs text-white outline-none focus:border-amber-200/80"
                    />
                    <datalist id={`ai-model-list-${provider.id}`}>
                      {(modelsByProvider[provider.id] || []).map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
                    </datalist>
                    <button
                      type="button"
                      disabled={Boolean(busyId) || (!provider.configured && !(apiKeys[provider.id] || '').trim())}
                      onClick={() => loadModels(provider)}
                      className="mt-1.5 inline-flex min-h-8 items-center gap-1 rounded-lg border border-amber-200/35 px-2 text-[10px] font-bold text-amber-100 disabled:opacity-40"
                    >
                      {isBusy ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                      Find available models
                    </button>
                    {modelsByProvider[provider.id]?.length > 0 && <span className="ml-2 text-[9px] font-normal text-[#F3D78B]/80">{modelsByProvider[provider.id].length} available to this key</span>}
                  </div>
                  <label className="sm:col-span-2 text-[10px] font-bold text-[#F3D78B]">
                    Fallback order
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={provider.priority || 1}
                      onChange={(event) => updateProvider(provider.id, { priority: event.target.value })}
                      className="mt-1.5 min-h-10 w-full rounded-xl border border-amber-200/30 bg-[#040B1B] px-3 text-xs text-white outline-none focus:border-amber-200/80"
                    />
                  </label>
                </div>

                {provider.lastError && <p className="mt-2 text-[10px] text-rose-200">Last error: {provider.lastError}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={Boolean(busyId) || (!provider.configured && !(apiKeys[provider.id] || '').trim())} onClick={() => saveProvider(provider)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-3 text-[11px] font-extrabold text-[#061128] disabled:opacity-50">
                    {isBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save settings
                  </button>
                  <button type="button" disabled={Boolean(busyId) || !provider.configured} onClick={() => testProvider(provider)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-amber-200/40 px-3 text-[11px] font-bold text-[#FDE08D] disabled:opacity-40">
                    {isBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                    Test connection
                  </button>
                  {provider.configured && <button type="button" disabled={Boolean(busyId)} onClick={() => removeProvider(provider)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-300/35 px-3 text-[11px] font-bold text-rose-200 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Remove</button>}
                </div>
              </article>
            );
          })}

          <section className="space-y-3 rounded-2xl border border-sky-200/25 bg-sky-200/5 p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-extrabold text-[#FDE08D]">Stock image search · Pexels and Pixabay</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#F3D78B]">
                Connect either or both providers. Search results can be imported into the active book’s asset library with their source page and creator credit; the selected image is downloaded and stored with the book.
              </p>
            </div>
            {imageSettingsLoading && <div className="flex items-center gap-2 text-[10px] text-[#F3D78B]/80"><LoaderCircle className="h-3 w-3 animate-spin" /> Loading image-provider settings…</div>}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {imageProviders.map((provider) => {
                const isBusy = busyId === `image-${provider.id}`;
                const keyFeedback = imageKeyFeedback[provider.id];
                return (
                  <article key={provider.id} className="rounded-2xl border border-sky-100/20 bg-[#07142E]/90 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-[#FDE08D]">{provider.name}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${provider.configured ? 'bg-emerald-900/60 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                        {provider.configured ? `Configured · •••• ${provider.keyLastFour}` : 'Not configured'}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#F3D78B]">{provider.description}</p>
                    <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-200 underline underline-offset-2">
                      Get a {provider.name} API key <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="mt-3 text-[10px] font-bold text-[#F3D78B]">
                      <label htmlFor={`image-api-key-${provider.id}`}>
                        {provider.configured ? 'Replace key (leave blank to keep current)' : `${provider.name} API key`}
                      </label>
                      <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                        <input
                          id={`image-api-key-${provider.id}`}
                          type={visibleImageKeys[provider.id] ? 'text' : 'password'}
                          autoComplete="off"
                          spellCheck="false"
                          value={imageApiKeys[provider.id] || ''}
                          onChange={(event) => {
                            setImageApiKeys((current) => ({ ...current, [provider.id]: event.target.value }));
                            updateImageKeyFeedback(provider.id, null);
                            setError('');
                            setMessage('');
                          }}
                          onPaste={(event) => handleApiKeyPaste(event, {
                            onKey: (value) => setImageApiKeys((current) => ({ ...current, [provider.id]: value })),
                            onFeedback: (feedback) => updateImageKeyFeedback(provider.id, feedback)
                          })}
                          aria-label={`${provider.name} API key`}
                          placeholder={provider.configured ? 'Saved securely · enter a new key to rotate' : `Paste your ${provider.name} API key`}
                          className="min-h-10 min-w-0 flex-1 rounded-xl border border-sky-100/25 bg-[#040B1B] px-3 text-xs text-white outline-none focus:border-sky-100/70"
                        />
                        <button
                          type="button"
                          onClick={() => setVisibleImageKeys((current) => ({ ...current, [provider.id]: !current[provider.id] }))}
                          aria-label={visibleImageKeys[provider.id] ? 'Hide image API key' : 'Show image API key'}
                          title={visibleImageKeys[provider.id] ? 'Hide key' : 'Show key'}
                          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-sky-100/25 text-amber-100"
                        >
                          {visibleImageKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => pasteImageApiKey(provider)}
                          aria-label={`Paste ${provider.name} API key from clipboard`}
                          title="Paste from clipboard"
                          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-sky-100/30 px-2 text-[10px] font-bold text-amber-100"
                        >
                          <ClipboardPaste className="h-3.5 w-3.5" /> <span>Paste</span>
                        </button>
                      </div>
                      <span className="mt-1 block font-normal text-[#F3D78B]/80">Paste or press Ctrl+V / Cmd+V. The full key is never returned to the browser after saving.</span>
                      {keyFeedback?.text && <p role={keyFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-1 text-[10px] font-semibold ${keyFeedback.type === 'error' ? 'text-rose-200' : keyFeedback.type === 'warning' ? 'text-amber-100' : 'text-emerald-200'}`}>{keyFeedback.text}</p>}
                    </div>
                    {provider.lastError && <p className="mt-2 text-[10px] text-rose-200">Last test error: {provider.lastError}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" disabled={Boolean(busyId) || !(imageApiKeys[provider.id] || '').trim()} onClick={() => saveImageProvider(provider)} className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-gradient-to-b from-amber-200 to-amber-500 px-2.5 text-[10px] font-extrabold text-[#061128] disabled:opacity-50">
                        {isBusy ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save key
                      </button>
                      <button type="button" disabled={Boolean(busyId) || (!provider.configured && !(imageApiKeys[provider.id] || '').trim())} onClick={() => testImageProvider(provider)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-sky-100/30 px-2.5 text-[10px] font-bold text-[#FDE08D] disabled:opacity-40">
                        {isBusy ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />} Test connection
                      </button>
                      {provider.configured && <button type="button" disabled={Boolean(busyId)} onClick={() => removeImageProvider(provider)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-300/35 px-2.5 text-[10px] font-bold text-rose-200 disabled:opacity-40"><Trash2 className="h-3 w-3" /> Remove</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200/30 bg-amber-200/5 p-4 text-[11px] leading-relaxed text-[#F3D78B]">
            <h3 className="text-xs font-extrabold text-[#FDE08D]">After entering your Gemini key</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Save settings, then choose <strong className="text-[#FDE08D]">Test connection</strong>.</li>
              <li>Return to a writing page and choose <strong className="text-[#FDE08D]">Write with AI</strong> beside a field. CreateStudio prepares the prompt from your book, chapter, page, field, template, and existing text; you review the draft before inserting it.</li>
            </ol>
          </section>

          <div className="rounded-2xl border border-amber-200/30 bg-[#061128]/70 p-3 text-[11px] leading-relaxed text-[#F3D78B]">
            <strong className="text-[#FDE08D]">Costs and limits change.</strong> Some Gemini models may have limited no-cost access; Groq pricing and rate limits vary by model and account, and OpenAI API usage is paid. Actual availability, rate limits, and pricing depend on your provider account and selected model. Check each provider’s current terms and pricing before use. Usage totals below come from provider-reported tokens; cost is not estimated here.
          </div>

          {!loading && providers.length === 0 && <p className="py-8 text-center text-xs text-[#F3D78B]">No provider settings are available.</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">{message}</p>}
          {error && <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">{error}</p>}
        </div>

        <footer className="border-t border-amber-300/20 p-4 text-[10px] leading-relaxed text-[#F3D78B] sm:px-6">
          Keys are encrypted at rest on this server and are never returned to the browser. For production, set <code className="text-amber-100">AI_CREDENTIAL_ENCRYPTION_KEY</code> to a stable secret in your deployment environment and back it up securely.
        </footer>
      </section>
    </div>
  );
  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
