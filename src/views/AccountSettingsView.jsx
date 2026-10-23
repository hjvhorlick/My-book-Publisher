import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Sliders,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { apiRequest, setStoredToken } from '../api/client';

export default function AccountSettingsView({
  user,
  onUserUpdated,
  onAccountDeleted
}) {
  const [name, setName] = useState(user?.name || '');
  const [penName, setPenName] = useState(user?.penName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [prefs, setPrefs] = useState(user?.preferences || {});
  const [aiStatus, setAiStatus] = useState(null);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    apiRequest('/api/ai/status')
      .then(data => setAiStatus(data))
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      const data = await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: {
          name,
          penName,
          bio,
          preferences: prefs
        }
      });
      if (onUserUpdated) onUserUpdated(data.user);
      setSavedMsg('Author profile and studio preferences saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    try {
      await apiRequest('/api/auth/account', {
        method: 'DELETE',
        body: { password: deletePassword }
      });
      setStoredToken('');
      if (onAccountDeleted) onAccountDeleted();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8 text-xs">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-400">
          Author Account, Preferences &amp; Privacy
        </div>
        <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
          Account &amp; Studio Settings
        </h1>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-5">
        <div className="flex items-center gap-2 font-serif font-bold text-lg">
          <User className="w-5 h-5 text-amber-800" />
          Author Profile &amp; Pen Name
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-stone-600 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-medium text-stone-600 mb-1">Default Pen Name / Author Credit</label>
            <input
              type="text"
              value={penName}
              onChange={e => setPenName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-stone-600 mb-1">Default Author Biography (Used for Back Matter)</label>
          <textarea
            rows={3}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Write a brief biography for your 'About the Author' section..."
            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
          />
        </div>

        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4">
          <div className="flex items-center gap-2 font-serif font-bold text-lg">
            <Sliders className="w-5 h-5 text-amber-800" />
            Default Writing Studio Comfort
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-stone-600 mb-1">Editor Font Family</label>
              <select
                value={prefs.editorFont || 'Newsreader'}
                onChange={e => setPrefs({ ...prefs, editorFont: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              >
                <option value="Newsreader">Newsreader Literary Serif</option>
                <option value="Inter">Inter Editorial Sans</option>
                <option value="JetBrains Mono">Drafting Monospace</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-600 mb-1">Editor Font Size ({prefs.editorFontSize || 18}px)</label>
              <input
                type="number"
                min="14"
                max="24"
                value={prefs.editorFontSize || 18}
                onChange={e => setPrefs({ ...prefs, editorFontSize: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-600 mb-1">Column Width</label>
              <select
                value={prefs.editorWidth || 'comfortable'}
                onChange={e => setPrefs({ ...prefs, editorWidth: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              >
                <option value="narrow">Narrow Focus</option>
                <option value="comfortable">Comfortable Literary</option>
                <option value="wide">Wide Canvas</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold"
        >
          {saving ? 'Saving...' : 'Save Profile & Preferences'}
        </button>
      </form>

      {/* Privacy & AI Transparency Notice */}
      <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-3">
        <div className="flex items-center gap-2 font-serif font-bold text-lg">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          Manuscript Privacy &amp; AI Service Disclosure
        </div>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          Your manuscripts, research notes, character profiles, and uploaded book assets are private to your account (`{user?.email}`) and protected by server-side authorization checks.
        </p>
        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
          <div className="font-semibold text-stone-800 dark:text-stone-200">
            Active Assistant Engine: {aiStatus?.providerName || 'Local Editorial Engine'}
          </div>
          <p className="text-stone-500 mt-1">{aiStatus?.privacyNotice}</p>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-red-200 dark:border-red-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-lg text-red-800 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Account &amp; Associated Data
            </h2>
            <p className="text-stone-500 mt-0.5">
              Permanently deletes your account and all books, chapters, version history, notes, and uploaded assets.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className="px-4 py-2 rounded-xl border border-red-300 text-red-700 dark:text-red-400 font-semibold hover:bg-red-50"
          >
            {showDeleteConfirm ? 'Cancel' : 'Delete Account...'}
          </button>
        </div>

        {showDeleteConfirm && (
          <form onSubmit={handleDeleteAccount} className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-3">
            {deleteError && <div className="text-red-700 font-semibold">{deleteError}</div>}
            <div>
              <label className="block font-medium text-red-900 dark:text-red-200 mb-1">
                Confirm your current password to permanently delete your account:
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="Enter current password..."
                className="w-full max-w-sm px-3 py-2 rounded-lg border border-red-300 bg-white dark:bg-stone-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold"
            >
              Permanently Delete My Account &amp; Books
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
