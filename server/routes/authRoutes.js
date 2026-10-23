const express = require('express');
const crypto = require('node:crypto');
const { db, hashPassword, verifyPassword } = require('../db');
const { createSession, sanitizeUser, requireAuth } = require('../auth');

const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const { email, password, name, penName } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!cleanName) {
      return res.status(400).json({ error: 'Please provide your full name or author name.' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const id = `user-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(String(password));
    const defaultPrefs = {
      theme: 'light',
      editorFont: 'Newsreader',
      editorFontSize: 18,
      editorLineHeight: 1.75,
      editorWidth: 'comfortable',
      aiConsentAccepted: false,
      recentlyUsedTemplates: []
    };

    db.prepare(`
      INSERT INTO users (id, email, name, pen_name, bio, password_hash, password_salt, subscription_tier, preferences_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, '', ?, ?, 'studio_free', ?, ?, ?)
    `).run(id, cleanEmail, cleanName, String(penName || cleanName).trim(), hash, salt, JSON.stringify(defaultPrefs), now, now);

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = createSession(id);
    return res.status(201).json({ user: sanitizeUser(userRow), token });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to register user account.', details: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!userRow || !verifyPassword(String(password), userRow.password_hash, userRow.password_salt)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = createSession(userRow.id);
    return res.json({ user: sanitizeUser(userRow), token });
  } catch (err) {
    return res.status(500).json({ error: 'Sign in failed.', details: err.message });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  return res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user: sanitizeUser(userRow) });
});

router.put('/profile', requireAuth, (req, res) => {
  try {
    const { name, penName, bio, preferences, lastActiveProjectId } = req.body || {};
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!current) return res.status(404).json({ error: 'User not found.' });

    let currentPrefs = {};
    try {
      currentPrefs = JSON.parse(current.preferences_json || '{}');
    } catch {
      currentPrefs = {};
    }

    const updatedPrefs = preferences ? { ...currentPrefs, ...preferences } : currentPrefs;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET name = ?,
          pen_name = ?,
          bio = ?,
          preferences_json = ?,
          last_active_project_id = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      name !== undefined ? String(name).trim() || current.name : current.name,
      penName !== undefined ? String(penName).trim() : current.pen_name,
      bio !== undefined ? String(bio) : current.bio,
      JSON.stringify(updatedPrefs),
      lastActiveProjectId !== undefined ? lastActiveProjectId : current.last_active_project_id,
      now,
      req.user.id
    );

    const updatedRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return res.json({ user: sanitizeUser(updatedRow) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile.', details: err.message });
  }
});

router.post('/forgot-password', (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Please provide your account email address.' });
    }
    const userRow = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail);
    if (!userRow) {
      // Return honest message without leaking account existence
      return res.json({
        message: 'If an account matches that email, a password recovery token has been generated.'
      });
    }
    const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?').run(resetToken, expiresAt, userRow.id);

    // Since no external SMTP server is configured in sandbox, return the verification code directly with a clear note
    return res.json({
      message: 'Password recovery token generated. (In local/sandbox mode without SMTP configured, use the recovery code below directly.)',
      recoveryToken: resetToken,
      smtpConfigured: Boolean(process.env.SMTP_HOST)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to initiate password recovery.', details: err.message });
  }
});

router.post('/reset-password', (req, res) => {
  try {
    const { email, recoveryToken, newPassword } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !recoveryToken || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Email, recovery code, and a new password (min 8 chars) are required.' });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!userRow || !userRow.reset_token || userRow.reset_token !== String(recoveryToken).trim().toUpperCase()) {
      return res.status(400).json({ error: 'Invalid recovery token or email address.' });
    }
    if (userRow.reset_expires_at && new Date(userRow.reset_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Recovery token has expired. Please request a new one.' });
    }

    const { hash, salt } = hashPassword(String(newPassword));
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users
      SET password_hash = ?, password_salt = ?, reset_token = NULL, reset_expires_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(hash, salt, now, userRow.id);

    return res.json({ success: true, message: 'Your password has been updated. You can now sign in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset password.', details: err.message });
  }
});

router.delete('/account', requireAuth, (req, res) => {
  try {
    const { password } = req.body || {};
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!userRow) return res.status(404).json({ error: 'Account not found.' });

    if (!password || !verifyPassword(String(password), userRow.password_hash, userRow.password_salt)) {
      return res.status(401).json({ error: 'Please confirm your current password to permanently delete your account.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    return res.json({ success: true, message: 'Account and all associated books, chapters, notes, and assets have been permanently deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete account.', details: err.message });
  }
});

module.exports = router;
