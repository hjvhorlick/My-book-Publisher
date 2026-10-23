const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

let cachedKey = null;

function getMasterKey() {
  if (cachedKey) return cachedKey;

  const configuredSecret = process.env.AI_CREDENTIAL_ENCRYPTION_KEY;
  if (configuredSecret) {
    cachedKey = crypto.createHash('sha256').update(configuredSecret, 'utf8').digest();
    return cachedKey;
  }

  // Local installs get a private, persistent machine key. Production deployments should
  // set AI_CREDENTIAL_ENCRYPTION_KEY so multiple instances share the same encryption key.
  const keyPath = process.env.AI_CREDENTIAL_KEY_FILE ||
    path.join(__dirname, '..', 'data', 'ai-provider-master.key');
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });

  try {
    cachedKey = fs.readFileSync(keyPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const generated = crypto.randomBytes(32);
    try {
      fs.writeFileSync(keyPath, generated, { mode: 0o600, flag: 'wx' });
      cachedKey = generated;
    } catch (writeError) {
      if (writeError.code !== 'EEXIST') throw writeError;
      cachedKey = fs.readFileSync(keyPath);
    }
  }

  if (cachedKey.length !== 32) {
    throw new Error('AI credential encryption key must be 32 bytes.');
  }
  return cachedKey;
}

function encryptCredential(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decryptCredential(envelope) {
  const [encodedIv, encodedTag, encodedCiphertext] = String(envelope || '').split('.');
  if (!encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error('Stored AI credential is malformed.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getMasterKey(),
    Buffer.from(encodedIv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = { encryptCredential, decryptCredential };
