const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { encryptCredential, decryptCredential } = require('../aiCredentialCrypto');
const {
  IMAGE_PROVIDERS,
  formatImageProviderSettings,
  verifyImageProviderKey
} = require('../imageProviders');

const router = express.Router();

function isSupportedProvider(providerId) {
  return Object.prototype.hasOwnProperty.call(IMAGE_PROVIDERS, providerId);
}

router.get('/', requireAuth, (req, res) => {
  return res.json({ providers: formatImageProviderSettings(req.user.id) });
});

router.put('/:providerId', requireAuth, (req, res) => {
  const { providerId } = req.params;
  if (!isSupportedProvider(providerId)) {
    return res.status(404).json({ error: 'Image provider not found.' });
  }

  const apiKey = String(req.body?.apiKey || '').trim();
  const current = db.prepare(
    'SELECT encrypted_api_key FROM image_provider_settings WHERE user_id = ? AND provider = ?'
  ).get(req.user.id, providerId);

  if (!apiKey && !current) {
    return res.status(400).json({ error: 'Enter an API key before saving this provider.' });
  }
  if (apiKey && apiKey.length < 12) {
    return res.status(400).json({ error: 'That API key looks too short. Check it and try again.' });
  }
  if (apiKey.length > 500) {
    return res.status(400).json({ error: 'The API key is too long.' });
  }

  const now = new Date().toISOString();
  if (apiKey) {
    db.prepare(`
      INSERT INTO image_provider_settings (user_id, provider, encrypted_api_key, last_error, created_at, updated_at)
      VALUES (?, ?, ?, '', ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        encrypted_api_key = excluded.encrypted_api_key,
        last_error = '',
        updated_at = excluded.updated_at
    `).run(req.user.id, providerId, encryptCredential(apiKey), now, now);
  }

  return res.json({ providers: formatImageProviderSettings(req.user.id) });
});

router.post('/:providerId/test', requireAuth, async (req, res) => {
  const { providerId } = req.params;
  if (!isSupportedProvider(providerId)) {
    return res.status(404).json({ error: 'Image provider not found.' });
  }

  const saved = db.prepare(
    'SELECT encrypted_api_key FROM image_provider_settings WHERE user_id = ? AND provider = ?'
  ).get(req.user.id, providerId);
  let apiKey = String(req.body?.apiKey || '').trim();
  let usingSavedKey = false;
  if (!apiKey && saved) {
    try {
      apiKey = decryptCredential(saved.encrypted_api_key);
      usingSavedKey = true;
    } catch {
      return res.status(500).json({ error: 'The saved key could not be decrypted. Replace it in settings.' });
    }
  }
  if (!apiKey) return res.status(400).json({ error: 'Enter or save an API key before testing this provider.' });

  try {
    const result = await verifyImageProviderKey(providerId, apiKey);
    if (usingSavedKey) {
      db.prepare(`
        UPDATE image_provider_settings SET last_error = '', updated_at = ?
        WHERE user_id = ? AND provider = ?
      `).run(new Date().toISOString(), req.user.id, providerId);
    }
    return res.json({ ...result, provider: IMAGE_PROVIDERS[providerId].name });
  } catch (error) {
    const message = error.message || `Could not test ${IMAGE_PROVIDERS[providerId].name}.`;
    if (usingSavedKey) {
      db.prepare(`
        UPDATE image_provider_settings SET last_error = ?, updated_at = ?
        WHERE user_id = ? AND provider = ?
      `).run(message.slice(0, 500), new Date().toISOString(), req.user.id, providerId);
    }
    return res.status(502).json({ error: message });
  }
});

router.delete('/:providerId', requireAuth, (req, res) => {
  const { providerId } = req.params;
  if (!isSupportedProvider(providerId)) {
    return res.status(404).json({ error: 'Image provider not found.' });
  }
  db.prepare('DELETE FROM image_provider_settings WHERE user_id = ? AND provider = ?').run(req.user.id, providerId);
  return res.json({ providers: formatImageProviderSettings(req.user.id) });
});

module.exports = router;
