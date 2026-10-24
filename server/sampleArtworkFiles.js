const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../src/data/sampleArtwork.json');

const ARTWORK_DIR = path.join(__dirname, '..', 'public', 'sample-artwork');
const BY_FILE = new Map(catalog.items.map((item) => [item.file, item]));
const BY_ID = new Map(catalog.items.map((item) => [item.id, item]));

/**
 * Resolve a public sample-artwork path to a file on disk.
 *
 * Sample filenames carry a content hash (family-picnic.9f3a1c7d.jpg) so a
 * regenerated image always gets a new URL. Books published before that change
 * still store the old, unhashed names (/sample-artwork/family-picnic.jpg), so
 * this resolver accepts both spellings and always ends up pointing at the
 * current file. It never accepts a path outside the artwork folder.
 */
function resolveSampleArtworkPath(urlPath) {
  let relative;
  try {
    relative = decodeURIComponent(String(urlPath || ''));
  } catch {
    return null;
  }

  relative = relative.replace(/^\/+/, '').replace(/^sample-artwork\/+/, '');
  if (!relative || relative.includes('\u0000') || relative.includes('..') || path.isAbsolute(relative)) return null;

  const direct = path.join(ARTWORK_DIR, relative);
  if (fs.existsSync(direct) && direct.startsWith(ARTWORK_DIR + path.sep) && fs.statSync(direct).isFile()) {
    return direct;
  }

  // Legacy name: <id>.jpg (or .jpeg/.png) without the content hash.
  const base = path.basename(relative);
  if (base.includes('/')) return null;
  const match = base.match(/^([a-z0-9-]+)\.(jpe?g|png)$/i);
  if (!match) return null;

  const item = BY_ID.get(match[1]);
  if (!item) return null;

  const isThumb = relative.split('/').length === 2 && relative.startsWith('thumbs/');
  const candidate = path.join(ARTWORK_DIR, isThumb ? 'thumbs' : '', item.file);
  if (candidate.startsWith(ARTWORK_DIR + path.sep) && fs.existsSync(candidate)) return candidate;

  return null;
}

/** Current public URL for a catalogue id, or '' when the id is unknown. */
function sampleArtworkPublicUrl(id) {
  const item = BY_ID.get(String(id || ''));
  return item ? `/sample-artwork/${item.file}` : '';
}

function isKnownSampleFile(file) {
  return BY_FILE.has(String(file || ''));
}

module.exports = {
  ARTWORK_DIR,
  resolveSampleArtworkPath,
  sampleArtworkPublicUrl,
  isKnownSampleFile
};
