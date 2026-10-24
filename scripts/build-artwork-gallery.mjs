#!/usr/bin/env node
/**
 * Build the offline artwork contact sheet: public/artwork-gallery.html
 *
 * A plain, dependency-free page that shows every bundled sample at thumbnail
 * size with a click-to-open full-resolution view. It is generated from the
 * catalogue, so it can never drift from what the app actually ships. Useful
 * for reviewing the library, and for checking an image at print size without
 * opening a book.
 *
 * Usage: node scripts/build-artwork-gallery.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'sampleArtwork.json'), 'utf8'));
const tag = encodeURIComponent(catalog.version || '1');

const CATEGORY_LABELS = {
  photobook: 'Photo books',
  cookbook: 'Cookbooks',
  magazine: 'Magazines',
  storybook: 'Picture books',
  informational: 'How-to guides',
  book: 'Chapter books',
  workbook: 'Workbooks'
};

const ORDER = ['photobook', 'cookbook', 'magazine', 'storybook', 'informational', 'book', 'workbook'];

const groups = ORDER
  .map((id) => ({ id, label: CATEGORY_LABELS[id] || id, items: catalog.items.filter((item) => item.category === id) }))
  .filter((group) => group.items.length);

function card(item) {
  const thumb = `/sample-artwork/thumbs/${item.file}?v=${tag}`;
  const full = `/sample-artwork/${item.file}?v=${tag}`;
  const inWidth = (item.width / 300).toFixed(1);
  const inHeight = (item.height / 300).toFixed(1);
  return `      <figure class="card" data-id="${item.id}">
        <a class="shot" href="${full}" target="_blank" rel="noreferrer" title="Open ${item.width} × ${item.height} at full size">
          <img src="${thumb}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async" width="480" height="${Math.round(480 * item.height / item.width)}">
        </a>
        <figcaption>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${item.width} × ${item.height} px · ${inWidth} × ${inHeight} in @ 300 dpi</span>
          <em>${item.tags.slice(0, 4).map((t) => `#${escapeHtml(t)}`).join(' ')}</em>
        </figcaption>
      </figure>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

const sections = groups.map((group) => `    <section id="${group.id}">
      <h2>${group.label} <span>${group.items.length} images</span></h2>
      <div class="grid">
${group.items.map(card).join('\n')}
      </div>
    </section>`).join('\n');

const nav = groups.map((group) => `<a href="#${group.id}">${group.label} <b>${group.items.length}</b></a>`).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Free sample artwork — ${catalog.items.length} images</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px clamp(16px, 4vw, 48px) 64px;
    background: #f7f3ea; color: #2c2723;
    font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  header { max-width: 1180px; margin: 0 auto 24px; }
  h1 { margin: 0 0 6px; font: 600 26px/1.2 Georgia, "Times New Roman", serif; letter-spacing: -0.01em; }
  .lede { margin: 0; max-width: 70ch; color: #6b6055; font-size: 13.5px; }
  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .stats span { background: #fff; border: 1px solid #e2d9c8; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: #6b5a3e; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; max-width: 1180px; margin: 0 auto 28px; }
  nav a { text-decoration: none; color: #4a3f34; background: #fff; border: 1px solid #e2d9c8; border-radius: 999px; padding: 6px 13px; font-size: 12.5px; font-weight: 600; }
  nav a:hover { border-color: #b08b4f; }
  nav b { color: #a8802f; }
  section { max-width: 1180px; margin: 0 auto 40px; scroll-margin-top: 16px; }
  h2 { display: flex; align-items: baseline; gap: 10px; margin: 0 0 14px; font: 600 18px/1.2 Georgia, "Times New Roman", serif; border-bottom: 1px solid #e2d9c8; padding-bottom: 8px; }
  h2 span { font: 500 11.5px/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #9a8b76; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; }
  .card { margin: 0; background: #fff; border: 1px solid #e7dfd0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(60,48,32,.05); }
  .shot { display: block; background: #efe9dd; aspect-ratio: 4 / 3; overflow: hidden; }
  .shot img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .35s ease; }
  .card:hover .shot img { transform: scale(1.03); }
  figcaption { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 3px; }
  figcaption strong { font-size: 13px; }
  figcaption span { font-size: 11px; color: #7a6c5b; }
  figcaption em { font-style: normal; font-size: 10.5px; color: #a8802f; }
  footer { max-width: 1180px; margin: 0 auto; color: #8a7b68; font-size: 11.5px; }
</style>
</head>
<body>
  <header>
    <h1>Free sample artwork</h1>
    <p class="lede">${catalog.items.length} images bundled with the app. Every one is prepared for full-page print use and can be added to a book with no internet connection and no licence credit. Click any image to open the full-resolution file.</p>
    <div class="stats">
      <span>${catalog.items.length} images</span>
      <span>2200 px long edge</span>
      <span>300 dpi</span>
      <span>Catalogue ${escapeHtml(catalog.version)}</span>
    </div>
  </header>
  <nav>${nav}</nav>
${sections}
  <footer>${escapeHtml(catalog.license.summary)}</footer>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'public', 'artwork-gallery.html'), html);
console.log(`wrote public/artwork-gallery.html (${catalog.items.length} images, ${(html.length / 1024).toFixed(0)} KB)`);
