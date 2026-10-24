#!/usr/bin/env node
/**
 * PREPARE SAMPLE ARTWORK FOR FULL-PAGE USE
 *
 * The bundled sample images are shown full page inside book templates and are
 * exported into PDF/EPUB files. A 240 × 125 thumbnail looks fine in a card but
 * turns to mush at page size, so every file in public/sample-artwork is
 * normalised to a print-worthy long edge here.
 *
 * What it does, per file:
 *   1. Upscales with Lanczos in one pass to the target long edge (default
 *      2200 px — 7.3 inches at 300 dpi, enough for a full page).
 *   2. Applies an unsharp mask sized to the amount of enlargement, so edges
 *      stay crisp instead of turning waxy.
 *   3. Tags the file 300 dpi, strips metadata, and writes a progressive JPEG
 *      with a byte budget so one detailed photo cannot bloat the bundle.
 *
 * The catalogue (src/data/sampleArtwork.json) is updated with the new pixel
 * dimensions and file sizes so the picker can report honest print sizes.
 *
 * Usage:
 *   node scripts/prepare-sample-artwork.mjs
 *   SAMPLE_ARTWORK_LONG_EDGE=3000 node scripts/prepare-sample-artwork.mjs
 *
 * Requires ImageMagick 6+ (`convert`, `identify`) on the machine running it.
 * It is a design-time tool: the prepared files are committed, so the app and
 * its exports never depend on ImageMagick being installed.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTWORK_DIR = path.join(ROOT, 'public', 'sample-artwork');
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'sampleArtwork.json');
const THUMB_DIR = path.join(ARTWORK_DIR, 'thumbs');

const LONG_EDGE = Number(process.env.SAMPLE_ARTWORK_LONG_EDGE || 2200);
const QUALITY = Number(process.env.SAMPLE_ARTWORK_QUALITY || 82);
const MAX_BYTES = Number(process.env.SAMPLE_ARTWORK_MAX_KB || 560) * 1024;
const DPI = 300;
const THUMB_LONG_EDGE = 480;

function identify(file, format) {
  return execFileSync('identify', ['-format', format, file], { encoding: 'utf8' }).trim();
}

function prepareFile(file) {
  const [width, height] = identify(file, '%w %h').split(' ').map(Number);
  const currentLongEdge = Math.max(width, height);
  if (currentLongEdge >= LONG_EDGE) {
    return { skipped: true, width, height, bytes: fs.statSync(file).size, thumbBytes: writeThumb(file) };
  }

  const scale = LONG_EDGE / currentLongEdge;
  const args = [
    file,
    '-background', 'white', '-alpha', 'remove', '-alpha', 'off',
    '-colorspace', 'sRGB',
    '-filter', 'Lanczos',
    '-resize', `${LONG_EDGE}x${LONG_EDGE}<`
  ];

  // Heavier enlargements need a firmer unsharp mask, otherwise they look soft.
  args.push('-unsharp', scale >= 3 ? '0x1.1+1.0+0.02' : scale >= 1.8 ? '0x1.0+0.85+0.02' : '0x0.8+0.6+0.01');

  args.push(
    '-density', String(DPI), '-units', 'PixelsPerInch',
    '-quality', String(QUALITY), '-sampling-factor', '4:2:0',
    // Keep the worst-case file size predictable; ImageMagick lowers quality
    // only for the few images that would otherwise blow the budget.
    `-define`, `jpeg:extent=${MAX_BYTES}`,
    '-interlace', 'JPEG', '-strip',
    file
  );

  execFileSync('convert', args);
  const [nextWidth, nextHeight] = identify(file, '%w %h').split(' ').map(Number);
  return {
    skipped: false,
    from: { width, height },
    width: nextWidth,
    height: nextHeight,
    bytes: fs.statSync(file).size,
    thumbBytes: writeThumb(file)
  };
}

/**
 * Grid cards, template miniatures and the cover quick-pick show the artwork
 * small. They load these thumbnails instead of the full-page file so opening
 * the picker does not download tens of megabytes.
 */
function writeThumb(file) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
  const thumb = path.join(THUMB_DIR, path.basename(file));
  execFileSync('convert', [
    file,
    '-filter', 'Lanczos',
    '-resize', `${THUMB_LONG_EDGE}x${THUMB_LONG_EDGE}>`,
    '-unsharp', '0x0.7+0.5+0.01',
    '-quality', '80', '-sampling-factor', '4:2:0',
    '-interlace', 'JPEG', '-strip',
    thumb
  ]);
  return fs.statSync(thumb).size;
}

function syncCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) return { updated: 0 };
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  let updated = 0;
  for (const item of catalog.items) {
    const file = path.join(ARTWORK_DIR, item.file);
    if (!fs.existsSync(file)) continue;
    const [width, height] = identify(file, '%w %h').split(' ').map(Number);
    const sizeBytes = fs.statSync(file).size;
    if (item.width !== width || item.height !== height || item.sizeBytes !== sizeBytes) {
      item.width = width;
      item.height = height;
      item.sizeBytes = sizeBytes;
      updated += 1;
    }
  }
  if (updated) fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  return { updated };
}

const files = fs.readdirSync(ARTWORK_DIR).filter((name) => /\.jpe?g$/i.test(name)).sort();
let totalBytes = 0;
let totalThumbBytes = 0;
for (const name of files) {
  const result = prepareFile(path.join(ARTWORK_DIR, name));
  totalBytes += result.bytes;
  totalThumbBytes += result.thumbBytes;
  const size = `${(result.bytes / 1024).toFixed(0)} KB`;
  if (result.skipped) {
    console.log(`  ok       ${name.padEnd(26)} ${result.width}×${result.height} ${size}`);
  } else {
    console.log(`  prepared ${name.padEnd(26)} ${result.from.width}×${result.from.height} → ${result.width}×${result.height} ${size}`);
  }
}

const catalogResult = syncCatalog();
console.log(`\n${files.length} files, ${(totalBytes / (1024 * 1024)).toFixed(1)} MB total, long edge ${LONG_EDGE}px @ ${DPI} dpi`);
console.log(`thumbnails, ${(totalThumbBytes / (1024 * 1024)).toFixed(1)} MB total, long edge ${THUMB_LONG_EDGE}px`);
console.log(`catalogue updated: ${catalogResult.updated} entr${catalogResult.updated === 1 ? 'y' : 'ies'}`);
