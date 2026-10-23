import React, { useState } from 'react';
import { BookOpen, Feather, Sparkles, Lock, Mail, User, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';
import { apiRequest, setStoredToken } from '../api/client';

export default function AuthView({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [penName, setPenName] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [generatedTokenInfo, setGeneratedTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: { email, password }
        });
        setStoredToken(data.token);
        onAuthenticated(data.user);
      } else if (mode === 'register') {
        const data = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: { email, password, name, penName }
        });
        setStoredToken(data.token);
        onAuthenticated(data.user);
      } else if (mode === 'forgot') {
        const data = await apiRequest('/api/auth/forgot-password', {
          method: 'POST',
          body: { email }
        });
        setGeneratedTokenInfo(data);
        if (data.recoveryToken) {
          setRecoveryToken(data.recoveryToken);
        }
        setMode('reset');
      } else if (mode === 'reset') {
        const data = await apiRequest('/api/auth/reset-password', {
          method: 'POST',
          body: { email, recoveryToken, newPassword: password }
        });
        setSuccessMsg(data.message || 'Password updated. Please sign in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'clara.vance@example.com',
          password: 'StudioAuthor2026!'
        }
      });
      setStoredToken(data.token);
      await onAuthenticated(data.user);
    } catch {
      // Fallback to direct studio session
      try {
        const meData = await apiRequest('/api/auth/me');
        await onAuthenticated(meData.user);
      } catch (err) {
        setError(err.message || 'Demo login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FCFBF8] dark:bg-[#141210] text-stone-900 dark:text-stone-100">
      {/* Left Editorial Hero Showcase */}
      <div className="lg:w-7/12 bg-gradient-to-br from-[#231915] via-[#312018] to-[#1A1412] text-amber-50 p-8 sm:p-14 lg:p-20 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif font-bold text-xl tracking-tight block leading-none">
              Folio &amp; Quill
            </span>
            <span className="text-[11px] uppercase tracking-widest text-amber-300/80">
              Literary Writing &amp; Publishing Studio
            </span>
          </div>
        </div>

        <div className="relative z-10 my-12 max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Guided Creative Freedom — From Idea to Finished Book
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight text-white">
            Where scattered ideas become a finished, publication-ready book.
          </h1>

          <p className="text-amber-100/80 text-base sm:text-lg leading-relaxed font-serif">
            An intelligent writing and book-design studio combining living templates, contextual stage guidance, distraction-free long-form drafting, interior typesetting, and verified DOCX, PDF, and EPUB exports.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-amber-200/15 text-xs text-amber-100/80">
            <div>
              <strong className="text-amber-300 block font-serif text-sm mb-0.5">12+ Living Templates</strong>
              Novels, Nonfiction, Memoirs, Devotionals, Workbooks, Poetry &amp; Academic Monographs.
            </div>
            <div>
              <strong className="text-amber-300 block font-serif text-sm mb-0.5">Connected Studio</strong>
              Character profiles, research notes, image asset licensing, and manuscript quality diagnostics.
            </div>
            <div>
              <strong className="text-amber-300 block font-serif text-sm mb-0.5">Print &amp; eBook Ready</strong>
              Generate real DOCX, paginated PDF, and reflowable EPUB 3 files with KDP &amp; Kobo checks.
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-amber-200/60 flex items-center justify-between">
          <span>Private Multi-User Cloud Workspace</span>
          <span>Your words remain 100% yours</span>
        </div>
      </div>

      {/* Right Authentication Form */}
      <div className="lg:w-5/12 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Quick Demo Access Banner */}
          <div className="p-4 rounded-2xl bg-amber-900/10 dark:bg-amber-500/10 border border-amber-800/25 dark:border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Feather className="w-3.5 h-3.5" />
                Instant Studio Preview
              </span>
              <span className="text-[11px] text-stone-500">Pre-populated sample library</span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Explore a full author library with multi-chapter manuscripts, living templates, research notes, and exports right away.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={handleDemoSignIn}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <span>Enter Studio as Demo Author (Clara Vance)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-stone-200 dark:border-stone-800" />
            <span className="flex-shrink mx-3 text-xs text-stone-400 uppercase tracking-wider">
              Or use your personal account
            </span>
            <div className="flex-grow border-t border-stone-200 dark:border-stone-800" />
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-stone-200 dark:border-stone-800 text-sm font-medium">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`pb-2.5 px-4 border-b-2 transition ${
                mode === 'login'
                  ? 'border-amber-900 dark:border-amber-400 text-stone-900 dark:text-white font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`pb-2.5 px-4 border-b-2 transition ${
                mode === 'register'
                  ? 'border-amber-900 dark:border-amber-400 text-stone-900 dark:text-white font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              Create Author Account
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {generatedTokenInfo?.recoveryToken && mode === 'reset' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-semibold">Recovery Verification Code: {generatedTokenInfo.recoveryToken}</div>
              <div>{generatedTokenInfo.message}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g., Eleanor Vance"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Pen Name / Author Credit (Optional)
                  </label>
                  <input
                    type="text"
                    value={penName}
                    onChange={e => setPenName(e.target.value)}
                    placeholder="How your name should appear on book covers"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="author@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                />
              </div>
            </div>

            {mode === 'reset' && (
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Recovery Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={recoveryToken}
                    onChange={e => setRecoveryToken(e.target.value)}
                    placeholder="Enter recovery code"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                    {mode === 'reset' ? 'New Password (min 8 characters)' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); }}
                      className="text-xs text-amber-800 dark:text-amber-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold text-sm hover:opacity-95 transition disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In to My Library'
                  : mode === 'register'
                    ? 'Create Author Studio Account'
                    : mode === 'forgot'
                      ? 'Generate Password Recovery Code'
                      : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
