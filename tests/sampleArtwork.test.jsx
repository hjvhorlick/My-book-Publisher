import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  SAMPLE_ARTWORK,
  SAMPLE_CATEGORIES,
  COVER_SAMPLE_URLS,
  SAMPLE_PRINT_DPI,
  formatPrintSize,
  sampleArtworkThumbUrl,
  sampleArtworkUrl,
  samplePickerResults,
  searchSampleArtwork
} from '../src/data/sampleArtwork';
import designData from '../src/data/designData.json';
import StockImageSearchModal from '../src/components/StockImageSearchModal.jsx';

const ARTWORK_DIR = path.join(process.cwd(), 'public', 'sample-artwork');

/** Public URLs carry a version query; the filesystem does not. */
function stripQuery(url) {
  return String(url || '').split('?')[0];
}

function jpegSize(buffer) {
  let offset = 2;
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    if (marker === 0xda) break;
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('no JPEG frame header found');
}

describe('bundled free sample artwork', () => {
  it('covers every book category the app offers', () => {
    // 27 original placeholders + 50 newly commissioned images.
    expect(SAMPLE_ARTWORK.length).toBeGreaterThanOrEqual(77);

    const categoryIds = Object.keys(designData.categoryDefaults);
    for (const categoryId of categoryIds) {
      const owned = SAMPLE_ARTWORK.filter((item) => item.category === categoryId);
      expect(owned.length, `no free artwork for the ${categoryId} category`).toBeGreaterThanOrEqual(4);
    }

    // Every designed template belongs to one of those categories, so the
    // template previews always have on-theme art to show.
    for (const [templateId, categoryId] of Object.entries(designData.templateCategory)) {
      expect(categoryIds, `${templateId} points at an unknown category`).toContain(categoryId);
    }

    expect(SAMPLE_CATEGORIES.map((category) => category.id)).toEqual(['all', ...categoryIds]);
  });

  it('lists only real files, with honest dimensions and unique ids', () => {
    const ids = new Set();
    const files = new Set();

    for (const item of SAMPLE_ARTWORK) {
      expect(ids.has(item.id), `duplicate sample id ${item.id}`).toBe(false);
      ids.add(item.id);
      expect(files.has(item.file), `duplicate sample file ${item.file}`).toBe(false);
      files.add(item.file);

      expect(item.file.startsWith(`${item.id}.`), `${item.id} must own a file named after it`).toBe(true);
      expect(item.title.trim().length, `${item.id} needs a title`).toBeGreaterThan(2);
      expect(item.alt.trim().length, `${item.id} needs alt text`).toBeGreaterThan(20);
      expect(item.tags.length, `${item.id} needs search tags`).toBeGreaterThanOrEqual(3);
      // File names are content-hashed, so a changed image is always a new URL
      // and the immutable cache can never serve a stale copy.
      expect(item.file).toMatch(new RegExp(`^${item.id}\\.[0-9a-f]{8}\\.jpg$`));
      expect(sampleArtworkUrl(item)).toBe(`/sample-artwork/${item.file}`);

      const filePath = path.join(ARTWORK_DIR, item.file);
      expect(fs.existsSync(filePath), `missing artwork file ${item.file}`).toBe(true);
      const buffer = fs.readFileSync(filePath);
      expect(buffer.length, `${item.file} size changed`).toBe(item.sizeBytes);
      expect(jpegSize(buffer), `${item.file} dimensions`).toEqual({ width: item.width, height: item.height });
    }
  });

  it('ships every sample at full-page resolution with a lightweight thumbnail', () => {
    for (const item of SAMPLE_ARTWORK) {
      const longEdge = Math.max(item.width, item.height);
      expect(longEdge, `${item.id} is too small for a full page`).toBeGreaterThanOrEqual(2200);

      const thumbPath = path.join(process.cwd(), 'public', stripQuery(sampleArtworkThumbUrl(item)));
      expect(fs.existsSync(thumbPath), `missing thumbnail for ${item.id}`).toBe(true);
      const thumb = fs.readFileSync(thumbPath);
      const thumbSize = jpegSize(thumb);
      expect(Math.max(thumbSize.width, thumbSize.height)).toBeLessThanOrEqual(480);
      expect(thumb.length).toBeLessThan(item.sizeBytes);
      // Grids load dozens of these at once; keep them small.
      expect(thumb.length).toBeLessThan(120 * 1024);
    }

    const picnic = SAMPLE_ARTWORK.find((item) => item.id === 'family-picnic');
    expect(formatPrintSize(picnic)).toBe(`${(picnic.width / SAMPLE_PRINT_DPI).toFixed(1)} × ${(picnic.height / SAMPLE_PRINT_DPI).toFixed(1)} in`);
  });

  it('does not hide artwork on disk that the catalogue forgot', () => {
    const onDisk = fs.readdirSync(ARTWORK_DIR).filter((name) => /\.(jpe?g|png)$/i.test(name)).sort();
    const catalogued = SAMPLE_ARTWORK.map((item) => item.file).sort();
    expect(catalogued).toEqual(onDisk);
  });

  it('searches by word, category and frame shape', () => {
    const bread = searchSampleArtwork({ query: 'bread' }).map((item) => item.id);
    expect(bread.length).toBeGreaterThan(0);
    expect(bread).toContain('dish-bakehouse');
    expect(bread).toContain('dish-market');

    const cookbook = searchSampleArtwork({ category: 'cookbook' });
    expect(cookbook.length).toBeGreaterThanOrEqual(2);
    expect(cookbook.every((item) => item.category === 'cookbook')).toBe(true);

    // Multi-word filters are forgiving: any matching word keeps the image, and
    // the images matching more words come first. A filter box that empties the
    // grid reads as a broken library.
    const mixed = searchSampleArtwork({ query: 'bread wedding' });
    expect(mixed.length).toBeGreaterThan(0);
    expect(mixed.some((item) => item.collection === 'wedding')).toBe(true);
    expect(mixed.some((item) => item.category === 'cookbook')).toBe(true);

    const twoWords = searchSampleArtwork({ query: 'forest mushrooms' });
    expect(twoWords[0].id).toBe('nature-mushrooms');

    const portrait = searchSampleArtwork({ slotRule: { aspectRatio: 0.75 } });
    expect(portrait.length).toBe(SAMPLE_ARTWORK.length);
    const firstRatio = portrait[0].width / portrait[0].height;
    expect(firstRatio).toBeGreaterThanOrEqual(0.6);
    expect(firstRatio).toBeLessThanOrEqual(0.94);
  });

  it('serves old unhashed artwork URLs so existing books keep their pictures', () => {
    const { resolveSampleArtworkPath } = require('../server/sampleArtworkFiles');
    for (const item of SAMPLE_ARTWORK) {
      const hashed = resolveSampleArtworkPath(`/sample-artwork/${item.file}`);
      const legacy = resolveSampleArtworkPath(`/sample-artwork/${item.id}.jpg`);
      const legacyThumb = resolveSampleArtworkPath(`/sample-artwork/thumbs/${item.id}.jpg`);
      expect(hashed, item.id).toBeTruthy();
      expect(legacy, `${item.id} legacy URL no longer resolves`).toBe(hashed);
      expect(legacyThumb, `${item.id} legacy thumbnail no longer resolves`).toBeTruthy();
    }
    expect(resolveSampleArtworkPath('/sample-artwork/../server/index.js')).toBeNull();
    expect(resolveSampleArtworkPath('/sample-artwork/not-a-sample.jpg')).toBeNull();
  });

  it('publishes a browsable gallery that lists every sample', () => {
    const galleryPath = path.join(process.cwd(), 'public', 'artwork-gallery.html');
    expect(fs.existsSync(galleryPath), 'run npm run artwork:gallery').toBe(true);
    const gallery = fs.readFileSync(galleryPath, 'utf8');

    for (const item of SAMPLE_ARTWORK) {
      expect(gallery, `${item.id} missing from the gallery`).toContain(`data-id="${item.id}"`);
      expect(gallery).toContain(sampleArtworkThumbUrl(item));
    }
    // Rebuild and compare, so a stale gallery fails loudly instead of drifting.
    const regenerated = execFileSync(process.execPath, ['scripts/build-artwork-gallery.mjs'], { encoding: 'utf8' });
    expect(regenerated).toContain(`${SAMPLE_ARTWORK.length} images`);
    expect(fs.readFileSync(galleryPath, 'utf8')).toBe(gallery);
  });

  it('never hands the picker an empty list', () => {
    // Exactly the case that made the picker look broken: a filter that matches
    // nothing must fall back to the library, with a flag so the UI can explain.
    const miss = samplePickerResults({ query: 'zzzz nothing here' });
    expect(miss.usedFallback).toBe(true);
    expect(miss.items).toHaveLength(SAMPLE_ARTWORK.length);

    const categoryMiss = samplePickerResults({ category: 'workbook', query: 'wedding' });
    expect(categoryMiss.usedFallback).toBe(true);
    expect(categoryMiss.items.length).toBeGreaterThan(0);

    const plain = samplePickerResults({});
    expect(plain.usedFallback).toBe(false);
    expect(plain.items).toHaveLength(SAMPLE_ARTWORK.length);

    const hit = samplePickerResults({ query: 'bread' });
    expect(hit.usedFallback).toBe(false);
    expect(hit.items.length).toBeGreaterThan(0);
    expect(hit.items.length).toBeLessThan(SAMPLE_ARTWORK.length);
  });

  it('keeps the cover quick-pick list pointing at real samples', () => {
    expect(COVER_SAMPLE_URLS.length).toBeGreaterThanOrEqual(10);
    for (const url of COVER_SAMPLE_URLS) {
      expect(SAMPLE_ARTWORK.map(sampleArtworkUrl)).toContain(url);
      expect(fs.existsSync(path.join(process.cwd(), 'public', stripQuery(url)))).toBe(true);
    }
  });
});

describe('free samples in the image picker', () => {
  it('offers the two upload options with the free samples as the fallback', () => {
    const markup = renderToStaticMarkup(
      <StockImageSearchModal
        open
        projectId="project-1"
        onClose={() => {}}
        onRequestUpload={() => {}}
      />
    );

    // The upload section is the single entry point…
    expect(markup).toContain('Upload an image');
    // …with exactly two ways in…
    expect(markup).toContain('Find from photo sites');
    expect(markup).toContain('Pexels and Pixabay');
    expect(markup).toContain('Upload your own');
    // …and the bundled library underneath as the fallback.
    expect(markup).toContain('Free samples');
    expect(markup).toContain('No credit needed');
    expect(markup).toContain('Use this image');

    const thumbnails = markup.match(/\/sample-artwork\/thumbs\/[a-z0-9.-]+\.jpg/g) || [];
    expect(new Set(thumbnails).size).toBeGreaterThanOrEqual(20);
    expect(markup).toMatch(/sample-artwork\/thumbs\/nature-ferns\.[0-9a-f]{8}\.jpg/);
  });

  it('hides the own-upload option when the page has no file picker', () => {
    const markup = renderToStaticMarkup(
      <StockImageSearchModal open projectId="project-1" onClose={() => {}} />
    );
    expect(markup).toContain('Find from photo sites');
    expect(markup).not.toContain('Upload your own');
    // The library is still there, so the dialog is never a dead end.
    expect(markup).toContain('Free samples');
  });

  it('never opens on an empty grid, even when the page supplies a long search', () => {
    // Template pages pass the chapter title, synopsis and central idea as the
    // stock query. Those words match no sample, so the samples tab must ignore
    // them — this is the bug that made the picker look empty.
    const markup = renderToStaticMarkup(
      <StockImageSearchModal
        open
        projectId="project-1"
        onClose={() => {}}
        initialQuery="The Winter Conservatory A Novel of Memory Exploring how a family reconciles after decades of silence"
      />
    );

    const thumbnails = markup.match(/\/sample-artwork\/thumbs\/[a-z0-9.-]+\.jpg/g) || [];
    expect(new Set(thumbnails).size).toBeGreaterThanOrEqual(20);
    expect(markup).not.toContain('Nothing matches');
    // The inherited text is not silently applied to the sample filter.
    expect(markup).not.toContain('value="The Winter Conservatory');
  });

  it('shows the frame-fit badge and a Pexels/Pixabay tab when a slot is known', () => {
    const markup = renderToStaticMarkup(
      <StockImageSearchModal
        open
        projectId="project-1"
        onClose={() => {}}
        slotRule={{ aspectRatio: 4 / 3, orientation: 'landscape', aspectLabel: '4:3', recommendedWidth: 1600, recommendedHeight: 1200 }}
      />
    );
    expect(markup).toContain('upload-image-title');
    expect(markup).toContain('Fits this frame');
    expect(markup).toContain('best 1600 × 1200 px');
  });
});

describe('importing a free sample with the network switched off', () => {
  const testDbPath = path.join(process.cwd(), 'data', `test-samples-${Date.now()}.db`);
  process.env.DB_PATH = testDbPath;
  process.env.AI_CREDENTIAL_ENCRYPTION_KEY = 'vitest-sample-artwork-encryption-key';

  const { createApp } = require('../server/index');
  const { db } = require('../server/db');

  let app;
  let token;
  let projectId;

  beforeAll(async () => {
    app = createApp();

    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: 'samples@example.com', password: 'SecurePassword123!', name: 'Sample Author' });
    token = register.body.token;

    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Offline Sample Book', templateId: 'fine-art-photobook', publicationType: 'photobook' });
    projectId = project.body.project.id;
  });

  afterAll(() => {
    for (const suffix of ['', '-wal', '-shm']) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it('stores the bundled JPEG as a normal, licence-cleared book asset', async () => {
    const sample = SAMPLE_ARTWORK.find((item) => item.id === 'family-picnic');
    const network = vi.stubGlobal('fetch', () => { throw new Error('network disabled'); });

    try {
      const response = await request(app)
        .post(`/api/projects/${projectId}/assets/import-stock`)
        .set('Authorization', `Bearer ${token}`)
        .send({ id: sample.id, provider: 'sample', altText: sample.alt, caption: sample.title });

      expect(response.status).toBe(201);
      const asset = response.body.asset;
      expect(asset.mimeType).toBe('image/jpeg');
      expect(asset.originalName).toBe('family-picnic.jpg');
      expect(asset.filename.endsWith('.jpg')).toBe(true);
      expect(asset.dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
      expect(asset.dataUrl.length).toBeGreaterThan(1000);
      expect(asset.altText).toBe(sample.alt);
      expect(asset.caption).toBe(sample.title);
      expect(asset.licenseType).toBe('public_domain');
      expect(asset.hasCommercialWarning).toBe(false);
      expect(asset.creatorAttribution).toContain('sample library');
      expect(asset.placementNotes).toContain('free for personal and commercial use');
    } finally {
      network.unstub ? network.unstub() : vi.unstubAllGlobals();
    }

    const list = await request(app)
      .get(`/api/projects/${projectId}/assets`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.assets.some((asset) => asset.originalName === 'family-picnic.jpg')).toBe(true);
  });

  it('can be used more than once and by any book', async () => {
    const first = await request(app)
      .post(`/api/projects/${projectId}/assets/import-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'work-journal', provider: 'sample' });
    const second = await request(app)
      .post(`/api/projects/${projectId}/assets/import-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'work-journal', provider: 'sample' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.asset.id).not.toBe(second.body.asset.id);
    // Default alt text and caption come from the catalogue when the client omits them.
    expect(first.body.asset.altText).toBe(SAMPLE_ARTWORK.find((item) => item.id === 'work-journal').alt);
    expect(first.body.asset.caption).toBe('Indigo journal');
  });

  it('rejects unknown samples and provider ids instead of guessing', async () => {
    const unknownSample = await request(app)
      .post(`/api/projects/${projectId}/assets/import-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'not-a-sample', provider: 'sample' });
    expect(unknownSample.status).toBe(400);
    expect(unknownSample.body.error).toContain('bundled library');

    const unknownProvider = await request(app)
      .post(`/api/projects/${projectId}/assets/import-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'family-picnic', provider: 'flickr' });
    expect(unknownProvider.status).toBe(400);

    const traversal = await request(app)
      .post(`/api/projects/${projectId}/assets/import-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: '../../server/index.js', provider: 'sample' });
    expect(traversal.status).toBe(400);

    // One picnic photo plus two journal imports: rejections must not create rows.
    expect(db.prepare('SELECT COUNT(*) AS count FROM assets WHERE project_id = ?').get(projectId).count).toBe(3);
  });
});
