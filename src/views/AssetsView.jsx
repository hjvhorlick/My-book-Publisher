import React, { useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  PlusCircle,
  Sparkles,
  Edit3
} from 'lucide-react';
import { apiRequest } from '../api/client';

const LICENSE_OPTIONS = [
  { id: 'own_work', label: 'Author’s Original Work (Full Commercial Rights)' },
  { id: 'public_domain', label: 'Public Domain / CC0 (No Restrictions)' },
  { id: 'commercial_licensed', label: 'Paid / Licensed for Commercial Print & eBook' },
  { id: 'stock_provider_license', label: 'Stock Provider License (Review Terms Before Publishing)' },
  { id: 'cc_by', label: 'Creative Commons Attribution (Requires Credit in Book)' },
  { id: 'editorial_only', label: 'Editorial / Fair Use Only (Warning: Check Commercial Rights)' },
  { id: 'unknown', label: 'Unverified / Unknown Source (Warning: Do Not Publish Without Clearance)' }
];

export default function AssetsView({
  project,
  assets = [],
  chapters = [],
  onAssetsChanged,
  onChaptersChanged
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [targetChapterId, setTargetChapterId] = useState(chapters[0]?.id || '');

  // Upload metadata form
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [creatorAttribution, setCreatorAttribution] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');
  const [licenseType, setLicenseType] = useState('own_work');
  const [alignment, setAlignment] = useState('center');
  const [widthPercent, setWidthPercent] = useState(80);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !project?.id) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);
      formData.append('altText', altText || file.name);
      formData.append('creatorAttribution', creatorAttribution || project.authorName || '');
      formData.append('sourceUrl', sourceUrl);
      formData.append('licenseUrl', licenseUrl);
      formData.append('licenseType', licenseType);
      formData.append('alignment', alignment);
      formData.append('widthPercent', String(widthPercent));

      await apiRequest(`/api/projects/${project.id}/assets`, {
        method: 'POST',
        body: formData
      });
      setCaption('');
      setAltText('');
      await onAssetsChanged();
      setStatusMsg(`Uploaded "${file.name}" to your book asset library.`);
    } catch (err) {
      setError(err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerateStudioDiagram = async () => {
    if (!project?.id) return;
    setUploading(true);
    try {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260">
        <rect width="600" height="260" fill="#FBF8F3" rx="10"/>
        <rect x="16" y="16" width="568" height="228" fill="none" stroke="#9A3412" stroke-width="1.5" rx="6"/>
        <text x="300" y="65" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#1F1B18" font-weight="bold">${(caption || project.title || 'Conceptual Framework').replace(/[<>&]/g, '')}</text>
        <line x1="160" y1="85" x2="440" y2="85" stroke="#D4AF37" stroke-width="1.5"/>
        <rect x="60" y="115" width="140" height="80" fill="#FFFFFF" stroke="#78716C" rx="6"/>
        <text x="130" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#292524">Stage I: Foundation</text>
        <rect x="230" y="115" width="140" height="80" fill="#FFFFFF" stroke="#78716C" rx="6"/>
        <text x="300" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#292524">Stage II: Turning Point</text>
        <rect x="400" y="115" width="140" height="80" fill="#FFFFFF" stroke="#78716C" rx="6"/>
        <text x="470" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#292524">Stage III: Resolution</text>
      </svg>`;
      const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

      await apiRequest(`/api/projects/${project.id}/assets`, {
        method: 'POST',
        body: {
          dataUrl,
          originalName: 'studio-framework-diagram.svg',
          caption: caption || `Figure: ${project.title} Overview`,
          altText: altText || `Three-stage conceptual diagram for ${project.title}`,
          creatorAttribution: creatorAttribution || project.authorName || 'Author',
          licenseType: 'own_work',
          alignment,
          widthPercent
        }
      });
      await onAssetsChanged();
      setStatusMsg('Generated vector diagram figure and added to project assets.');
    } catch (err) {
      setError(err.message || 'Failed to generate diagram.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateAsset = async (e) => {
    e.preventDefault();
    if (!selectedAsset || !project?.id) return;
    await apiRequest(`/api/projects/${project.id}/assets/${selectedAsset.id}`, {
      method: 'PUT',
      body: {
        caption: selectedAsset.caption,
        altText: selectedAsset.altText,
        creatorAttribution: selectedAsset.creatorAttribution,
        sourceUrl: selectedAsset.sourceUrl,
        licenseUrl: selectedAsset.licenseUrl,
        licenseType: selectedAsset.licenseType,
        alignment: selectedAsset.alignment,
        widthPercent: selectedAsset.widthPercent
      }
    });
    await onAssetsChanged();
    setSelectedAsset(null);
    setStatusMsg('Updated asset properties, licensing, and layout settings.');
  };

  const handleInsertIntoChapter = async (asset) => {
    const chId = targetChapterId || chapters[0]?.id;
    const ch = chapters.find(c => c.id === chId);
    if (!ch || !project?.id) return;

    const alignStyle =
      asset.alignment === 'left'
        ? 'margin-right: auto; margin-left: 0;'
        : asset.alignment === 'right'
          ? 'margin-left: auto; margin-right: 0;'
          : 'margin-left: auto; margin-right: auto;';

    const figHtml = `<figure data-asset-id="${asset.id}" style="width: ${asset.widthPercent || 80}%; ${alignStyle} text-align: center;">
      <img src="${asset.dataUrl}" alt="${(asset.altText || asset.originalName).replace(/"/g, '&quot;')}" style="max-width: 100%; height: auto; border-radius: 6px; display: inline-block;" />
      ${asset.caption ? `<figcaption>${asset.caption}</figcaption>` : ''}
    </figure><p></p>`;

    await apiRequest(`/api/projects/${project.id}/chapters/${ch.id}`, {
      method: 'PUT',
      body: {
        contentHtml: `${ch.contentHtml || ''}\n${figHtml}`
      }
    });

    await onChaptersChanged();
    await onAssetsChanged();
    setStatusMsg(`Inserted "${asset.originalName}" into "${ch.title}".`);
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Remove this asset from the project?')) return;
    await apiRequest(`/api/projects/${project.id}/assets/${assetId}`, { method: 'DELETE' });
    await onAssetsChanged();
  };

  const handleCleanupUnused = async () => {
    const res = await apiRequest(`/api/projects/${project.id}/assets/cleanup-unused`, { method: 'POST' });
    await onAssetsChanged();
    setStatusMsg(`Removed ${res.removedCount || 0} unused asset(s).`);
  };

  const unusedCount = assets.filter(a => a.isUnused).length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-400">
            Book Figures, Illustrations &amp; Rights Tracker
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
            Images &amp; Book Assets
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Upload illustrations, manage captions and accessibility alt-text, track commercial licensing &amp; attribution, and insert figures into any chapter.
          </p>
        </div>

        {unusedCount > 0 && (
          <button
            onClick={handleCleanupUnused}
            className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-600 hover:text-red-700"
          >
            Remove Unused Assets ({unusedCount})
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}
      {statusMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')}>✕</button>
        </div>
      )}

      {/* Upload & Diagram Generator Panel */}
      <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xs text-xs">
        <div className="font-serif font-bold text-base">Upload Image or Create Studio Figure</div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block font-medium text-stone-600 mb-1">Figure Caption</label>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="e.g., Figure 1.2: Harbor Map"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>

          <div>
            <label className="block font-medium text-stone-600 mb-1">Accessibility Alt Text</label>
            <input
              type="text"
              value={altText}
              onChange={e => setAltText(e.target.value)}
              placeholder="Describe image for screen readers..."
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>

          <div>
            <label className="block font-medium text-stone-600 mb-1">Licence &amp; Commercial Rights</label>
            <select
              value={licenseType}
              onChange={e => setLicenseType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            >
              {LICENSE_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-stone-600 mb-1">Creator Credit / Attribution</label>
            <input
              type="text"
              value={creatorAttribution}
              onChange={e => setCreatorAttribution(e.target.value)}
              placeholder="Artist / Photographer credit"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>

          <div>
            <label className="block font-medium text-stone-600 mb-1">Source Page URL</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>

          <div>
            <label className="block font-medium text-stone-600 mb-1">License Terms URL</label>
            <input
              type="url"
              value={licenseUrl}
              onChange={e => setLicenseUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Choose Image File (PNG / JPG / SVG / WEBP)'}</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            type="button"
            disabled={uploading}
            onClick={handleGenerateStudioDiagram}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:border-amber-800 font-medium"
          >
            <Sparkles className="w-4 h-4 text-amber-700" />
            Generate Vector Framework Diagram
          </button>

          <div className="ml-auto flex items-center gap-2 text-stone-500">
            <span>Target chapter for quick insert:</span>
            <select
              value={targetChapterId}
              onChange={e => setTargetChapterId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
            >
              {chapters.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assets Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map(asset => (
          <div
            key={asset.id}
            className="rounded-2xl bg-white dark:bg-[#1E1B18] border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="h-48 bg-stone-100 dark:bg-stone-900 flex items-center justify-center p-4 border-b border-stone-200 dark:border-stone-800">
                <img
                  src={asset.dataUrl}
                  alt={asset.altText || asset.originalName}
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>

              <div className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {asset.originalName}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {asset.widthPercent || 80}% • {asset.alignment || 'center'}
                  </span>
                </div>

                {asset.caption && (
                  <p className="italic text-stone-600 dark:text-stone-300">“{asset.caption}”</p>
                )}

                {asset.hasCommercialWarning ? (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 flex items-start gap-1.5 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {asset.licenseType === 'stock_provider_license'
                        ? 'Review the linked stock provider’s current license and restrictions before commercial publication.'
                        : `License (${asset.licenseType}) requires attribution or commercial clearance before publishing.`}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cleared ({asset.licenseType.replace(/_/g, ' ')})</span>
                  </div>
                )}

                {asset.creatorAttribution && (
                  <p className="text-[11px] text-stone-600 dark:text-stone-300">Credit: {asset.creatorAttribution}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  {asset.sourceUrl && (
                    <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-[11px] font-semibold text-amber-800 underline dark:text-amber-400">
                      View source page
                    </a>
                  )}
                  {asset.licenseUrl && (
                    <a href={asset.licenseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-[11px] font-semibold text-amber-800 underline dark:text-amber-400">
                      License terms
                    </a>
                  )}
                </div>
                <div className="text-[11px] text-stone-500">
                  {asset.usedInChapters?.length > 0
                    ? `Used in: ${asset.usedInChapters.map(c => c.title).join(', ')}`
                    : 'Not yet inserted into manuscript'}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
              <button
                onClick={() => handleInsertIntoChapter(asset)}
                className="flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-400 hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Insert into Chapter
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedAsset({ ...asset })}
                  className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500"
                  title="Edit Caption, Size, Alignment & License"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-600"
                  title="Delete Asset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Asset Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateAsset}
            className="max-h-[90vh] overflow-y-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-xs"
          >
            <h3 className="font-serif font-bold text-lg">Edit Asset Placement &amp; Licensing</h3>

            <div>
              <label className="block font-medium mb-1">Caption</label>
              <input
                type="text"
                value={selectedAsset.caption}
                onChange={e => setSelectedAsset({ ...selectedAsset, caption: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Alternative Text (Accessibility)</label>
              <input
                type="text"
                value={selectedAsset.altText}
                onChange={e => setSelectedAsset({ ...selectedAsset, altText: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Alignment</label>
                <select
                  value={selectedAsset.alignment}
                  onChange={e => setSelectedAsset({ ...selectedAsset, alignment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                >
                  <option value="center">Centered</option>
                  <option value="left">Left Aligned</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Width ({selectedAsset.widthPercent}%)</label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={selectedAsset.widthPercent}
                  onChange={e => setSelectedAsset({ ...selectedAsset, widthPercent: Number(e.target.value) })}
                  className="w-full accent-amber-800 mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">License Type</label>
                <select
                  value={selectedAsset.licenseType}
                  onChange={e => setSelectedAsset({ ...selectedAsset, licenseType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                >
                  {LICENSE_OPTIONS.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Creator Attribution</label>
                <input
                  type="text"
                  value={selectedAsset.creatorAttribution || ''}
                  onChange={e => setSelectedAsset({ ...selectedAsset, creatorAttribution: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium mb-1">Source Page URL</label>
                <input
                  type="url"
                  value={selectedAsset.sourceUrl || ''}
                  onChange={e => setSelectedAsset({ ...selectedAsset, sourceUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">License Terms URL</label>
                <input
                  type="url"
                  value={selectedAsset.licenseUrl || ''}
                  onChange={e => setSelectedAsset({ ...selectedAsset, licenseUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSelectedAsset(null)} className="px-4 py-2 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-amber-900 text-white font-semibold">
                Save Asset Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
