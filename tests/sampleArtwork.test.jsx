import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
  searchSampleArtwork
} from '../src/data/sampleArtwork';
import designData from '../src/data/designData.json';
import StockImageSearchModal from '../src/components/StockImageSearchModal.jsx';

const ARTWORK_DIR = path.join(process.cwd(), 'public', 'sample-artwork');

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

      const thumbPath = path.join(process.cwd(), 'public', sampleArtworkThumbUrl(item));
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

    // Two words must both match, so a bad query returns nothing instead of everything.
    expect(searchSampleArtwork({ query: 'bread wedding' })).toHaveLength(0);

    const portrait = searchSampleArtwork({ slotRule: { aspectRatio: 0.75 } });
    expect(portrait.length).toBe(SAMPLE_ARTWORK.length);
    const firstRatio = portrait[0].width / portrait[0].height;
    expect(firstRatio).toBeGreaterThanOrEqual(0.6);
    expect(firstRatio).toBeLessThanOrEqual(0.94);
  });

  it('keeps the cover quick-pick list pointing at real samples', () => {
    expect(COVER_SAMPLE_URLS.length).toBeGreaterThanOrEqual(10);
    for (const url of COVER_SAMPLE_URLS) {
      expect(SAMPLE_ARTWORK.map(sampleArtworkUrl)).toContain(url);
      expect(fs.existsSync(path.join(process.cwd(), 'public', url))).toBe(true);
    }
  });
});

describe('free samples in the image picker', () => {
  it('opens on the offline samples with one-tap buttons', () => {
    const markup = renderToStaticMarkup(
      <StockImageSearchModal open projectId="project-1" onClose={() => {}} />
    );

    expect(markup).toContain('Free samples');
    expect(markup).toContain('Bundled · works offline');
    expect(markup).toContain('No credit needed');
    expect(markup).toContain('Use this image');
    expect(markup).toContain('image-source-panel-samples');

    // The grid loads the small thumbnails, never the full-page files.
    const thumbnails = markup.match(/\/sample-artwork\/thumbs\/[a-z0-9-]+\.jpg/g) || [];
    expect(new Set(thumbnails).size).toBeGreaterThanOrEqual(20);
    expect(markup).toContain('/sample-artwork/thumbs/nature-ferns.jpg');
    expect(markup).not.toMatch(/src="\/sample-artwork\/[a-z0-9-]+\.jpg"/);
    expect(markup).toContain('prints to');
    expect(markup).toContain('300 dpi');
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
    expect(markup).toContain('Pexels + Pixabay');
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
