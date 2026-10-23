const express = require('express');
const crypto = require('node:crypto');
const multer = require('multer');
const { db } = require('../db');
const { requireAuth, verifyProjectOwnership } = require('../auth');
const {
  IMAGE_PROVIDERS,
  getImageProviderKeys,
  searchStockImages,
  validateProviderImageUrl,
  fetchStockImage
} = require('../imageProviders');

const router = express.Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8 MB max per image
});

const STOCK_SOURCE_HOSTS = {
  pexels: new Set(['pexels.com', 'www.pexels.com']),
  pixabay: new Set(['pixabay.com', 'www.pixabay.com'])
};

function validateStockSourceUrl(providerId, value) {
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    throw new Error('The provider returned an invalid source link.');
  }
  const hostname = url.hostname.toLowerCase();
  const hosts = STOCK_SOURCE_HOSTS[providerId];
  if (!hosts || url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.has(hostname)) {
    throw new Error('The source link does not belong to the selected stock-image provider.');
  }
  return url.toString();
}

function formatAssetRow(row, chapters = []) {
  const usedInChapters = chapters
    .filter(ch => (ch.content_html || '').includes(row.id) || (ch.content_html || '').includes(row.filename))
    .map(ch => ({ id: ch.id, title: ch.title }));

  const requiresAttribution = row.license_type === 'cc_by';
  const hasCommercialWarning = row.license_type === 'editorial_only' || row.license_type === 'unknown' || row.license_type === 'stock_provider_license' || (requiresAttribution && !row.creator_attribution);

  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    dataUrl: row.data_url,
    caption: row.caption || '',
    altText: row.alt_text || '',
    sourceUrl: row.source_url || '',
    creatorAttribution: row.creator_attribution || '',
    licenseUrl: row.license_url || '',
    licenseType: row.license_type || 'own_work',
    placementNotes: row.placement_notes || '',
    alignment: row.alignment || 'center',
    widthPercent: row.width_percent || 80,
    usedInChapters,
    isUnused: usedInChapters.length === 0,
    requiresAttribution,
    hasCommercialWarning,
    createdAt: row.created_at
  };
}

// Search configured stock-image providers for a specific owned project.
router.get('/search', requireAuth, async (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  try {
    const result = await searchStockImages({
      query: req.query.q,
      provider: req.query.provider || 'all',
      keys: getImageProviderKeys(req.user.id),
      count: 12
    });
    return res.json(result);
  } catch (error) {
    const status = /at least two characters|choose pexels/i.test(error.message || '') ? 400 : 500;
    return res.status(status).json({ error: error.message || 'Could not search stock images.' });
  }
});

// Import a search result as a normal book asset, preserving provider and creator details.
router.post('/import-stock', requireAuth, async (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const providerId = String(req.body?.provider || '').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(IMAGE_PROVIDERS, providerId)) {
    return res.status(400).json({ error: 'Choose a valid Pexels or Pixabay search result.' });
  }

  let imageUrl;
  let fallbackImageUrl = '';
  let sourceUrl;
  try {
    imageUrl = validateProviderImageUrl(providerId, req.body?.imageUrl).toString();
    fallbackImageUrl = req.body?.fallbackImageUrl
      ? validateProviderImageUrl(providerId, req.body.fallbackImageUrl).toString()
      : '';
    sourceUrl = validateStockSourceUrl(providerId, req.body?.sourceUrl);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'The stock-image details are invalid.' });
  }

  try {
    let downloadedImage;
    try {
      downloadedImage = await fetchStockImage(providerId, imageUrl);
    } catch (primaryError) {
      const canUseSmallerVersion = fallbackImageUrl && /8 MB book-asset limit|could not be downloaded \(HTTP (?:400|403|404|410)/i.test(primaryError.message || '');
      if (!canUseSmallerVersion) throw primaryError;
      downloadedImage = await fetchStockImage(providerId, fallbackImageUrl);
    }
    const { buffer, mimeType } = downloadedImage;
    const id = `asset-${crypto.randomUUID()}`;
    const receivedPhotoId = String(req.body?.id || 'stock-image').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'stock-image';
    const photoId = receivedPhotoId.startsWith(`${providerId}-`) ? receivedPhotoId.slice(providerId.length + 1) : receivedPhotoId;
    const extension = mimeType === 'image/jpeg' ? 'jpg' : (mimeType.split('/')[1] || 'img').replace(/[^a-z0-9]/gi, '');
    const originalName = `${providerId}-${photoId || 'stock-image'}.${extension}`;
    const filename = `${id}.${extension}`;
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const now = new Date().toISOString();
    const altText = String(req.body?.altText || '').trim().slice(0, 500);
    const creatorAttribution = String(req.body?.creatorAttribution || `${IMAGE_PROVIDERS[providerId].name} contributor`).trim().slice(0, 200);
    const licenseUrl = IMAGE_PROVIDERS[providerId].licenseUrl;
    const caption = String(req.body?.caption || '').trim().slice(0, 500);
    const placementNotes = `Stock image imported from ${IMAGE_PROVIDERS[providerId].name}. Review the provider’s current license terms before publication.`;

    db.prepare(`
      INSERT INTO assets (id, project_id, user_id, filename, original_name, mime_type, size_bytes, data_url, caption, alt_text, source_url, creator_attribution, license_url, license_type, placement_notes, alignment, width_percent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.params.projectId,
      req.user.id,
      filename,
      originalName,
      mimeType,
      buffer.length,
      dataUrl,
      caption,
      altText,
      sourceUrl,
      creatorAttribution,
      licenseUrl,
      'stock_provider_license',
      placementNotes,
      'center',
      80,
      now
    );

    const chapters = db.prepare('SELECT id, title, content_html FROM chapters WHERE project_id = ?').all(req.params.projectId);
    const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
    return res.status(201).json({ asset: formatAssetRow(row, chapters) });
  } catch (error) {
    const message = error.message || 'Could not import this stock image.';
    const status = /8 MB book-asset limit/i.test(message) ? 413 : 502;
    return res.status(status).json({ error: message });
  }
});

// List project assets
router.get('/', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }
  const chapters = db.prepare('SELECT id, title, content_html FROM chapters WHERE project_id = ?').all(req.params.projectId);
  const rows = db.prepare('SELECT * FROM assets WHERE project_id = ? ORDER BY created_at DESC').all(req.params.projectId);
  return res.json({ assets: rows.map(r => formatAssetRow(r, chapters)) });
});

// Upload image asset (supports multipart file OR JSON base64 dataUrl)
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  try {
    const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    let originalName = '';
    let mimeType = '';
    let sizeBytes = 0;
    let dataUrl = '';

    if (req.file) {
      originalName = req.file.originalname || 'uploaded-image.png';
      mimeType = req.file.mimetype || 'image/png';
      if (!mimeType.startsWith('image/')) {
        return res.status(400).json({ error: 'Only image files (PNG, JPEG, WEBP, GIF, SVG) are allowed as book assets.' });
      }
      sizeBytes = req.file.size;
      dataUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body?.dataUrl) {
      dataUrl = String(req.body.dataUrl);
      if (!dataUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image data URL.' });
      }
      originalName = String(req.body.originalName || 'illustration.png');
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      mimeType = match ? match[1] : 'image/png';
      sizeBytes = Math.round((dataUrl.length * 3) / 4);
    } else {
      return res.status(400).json({ error: 'Please provide an image file to upload.' });
    }

    const id = `asset-${crypto.randomUUID()}`;
    const ext = originalName.includes('.') ? originalName.split('.').pop() : 'png';
    const filename = `${id}.${ext}`;
    const now = new Date().toISOString();

    const {
      caption = '',
      altText = '',
      sourceUrl = '',
      creatorAttribution = '',
      licenseUrl = '',
      licenseType = 'own_work',
      placementNotes = '',
      alignment = 'center',
      widthPercent = 80
    } = req.body || {};

    db.prepare(`
      INSERT INTO assets (id, project_id, user_id, filename, original_name, mime_type, size_bytes, data_url, caption, alt_text, source_url, creator_attribution, license_url, license_type, placement_notes, alignment, width_percent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.params.projectId,
      req.user.id,
      filename,
      originalName,
      mimeType,
      sizeBytes,
      dataUrl,
      String(caption).trim(),
      String(altText).trim(),
      String(sourceUrl).trim(),
      String(creatorAttribution).trim(),
      String(licenseUrl).trim(),
      String(licenseType),
      String(placementNotes).trim(),
      String(alignment),
      Number(widthPercent) || 80,
      now
    );

    const chapters = db.prepare('SELECT id, title, content_html FROM chapters WHERE project_id = ?').all(req.params.projectId);
    const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
    return res.status(201).json({ asset: formatAssetRow(row, chapters) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload asset.', details: err.message });
  }
});

// Update asset metadata / replace image file while preserving manuscript placement
router.put('/:assetId', requireAuth, upload.single('file'), (req, res) => {
  try {
    const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const cur = db.prepare('SELECT * FROM assets WHERE id = ? AND project_id = ?').get(req.params.assetId, req.params.projectId);
    if (!cur) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    let nextDataUrl = cur.data_url;
    let nextMime = cur.mime_type;
    let nextSize = cur.size_bytes;
    let nextOrigName = cur.original_name;

    if (req.file) {
      nextOrigName = req.file.originalname || cur.original_name;
      nextMime = req.file.mimetype || cur.mime_type;
      nextSize = req.file.size;
      nextDataUrl = `data:${nextMime};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body?.dataUrl && String(req.body.dataUrl).startsWith('data:image/')) {
      nextDataUrl = String(req.body.dataUrl);
      nextSize = Math.round((nextDataUrl.length * 3) / 4);
    }

    const b = req.body || {};
    const nextCaption = b.caption !== undefined ? String(b.caption).trim() : cur.caption;
    const nextAlt = b.altText !== undefined ? String(b.altText).trim() : cur.alt_text;
    const nextLicenseUrl = b.licenseUrl !== undefined ? String(b.licenseUrl).trim() : (cur.license_url || '');
    const nextAlign = b.alignment !== undefined ? String(b.alignment) : cur.alignment;
    const nextWidth = b.widthPercent !== undefined ? (Number(b.widthPercent) || 80) : cur.width_percent;

    db.prepare(`
      UPDATE assets
      SET original_name = ?,
          mime_type = ?,
          size_bytes = ?,
          data_url = ?,
          caption = ?,
          alt_text = ?,
          source_url = ?,
          creator_attribution = ?,
          license_url = ?,
          license_type = ?,
          placement_notes = ?,
          alignment = ?,
          width_percent = ?
      WHERE id = ? AND project_id = ?
    `).run(
      nextOrigName,
      nextMime,
      nextSize,
      nextDataUrl,
      nextCaption,
      nextAlt,
      b.sourceUrl !== undefined ? String(b.sourceUrl).trim() : cur.source_url,
      b.creatorAttribution !== undefined ? String(b.creatorAttribution).trim() : cur.creator_attribution,
      nextLicenseUrl,
      b.licenseType !== undefined ? String(b.licenseType) : cur.license_type,
      b.placementNotes !== undefined ? String(b.placementNotes).trim() : cur.placement_notes,
      nextAlign,
      nextWidth,
      cur.id,
      req.params.projectId
    );

    const chapters = db.prepare('SELECT id, title, content_html FROM chapters WHERE project_id = ?').all(req.params.projectId);
    const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(cur.id);
    return res.json({ asset: formatAssetRow(updated, chapters) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update asset.', details: err.message });
  }
});

// Delete single asset
router.delete('/:assetId', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const cur = db.prepare('SELECT id FROM assets WHERE id = ? AND project_id = ?').get(req.params.assetId, req.params.projectId);
  if (!cur) {
    return res.status(404).json({ error: 'Asset not found.' });
  }
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.assetId);
  return res.json({ success: true });
});

// Remove all unused assets for a project
router.post('/cleanup-unused', requireAuth, (req, res) => {
  const ownership = verifyProjectOwnership(req.params.projectId, req.user.id);
  if (ownership.error) {
    return res.status(ownership.status).json({ error: ownership.error });
  }

  const chapters = db.prepare('SELECT content_html FROM chapters WHERE project_id = ?').all(req.params.projectId);
  const assets = db.prepare('SELECT id, filename FROM assets WHERE project_id = ?').all(req.params.projectId);

  let removedCount = 0;
  for (const a of assets) {
    const isUsed = chapters.some(ch => (ch.content_html || '').includes(a.id) || (ch.content_html || '').includes(a.filename));
    if (!isUsed) {
      db.prepare('DELETE FROM assets WHERE id = ?').run(a.id);
      removedCount++;
    }
  }

  return res.json({ removedCount });
});

module.exports = router;
