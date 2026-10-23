import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';

const testDbPath = path.join(__dirname, '..', 'data', `test-image-providers-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
process.env.AI_CREDENTIAL_ENCRYPTION_KEY = 'vitest-image-provider-credential-key';

const { createApp } = require('../server/index');
const { db } = require('../server/db');
const { validateProviderImageUrl } = require('../server/imageProviders');

describe('Pexels and Pixabay image-provider integration', () => {
  let app;
  let token = '';
  let projectId = '';
  const pexelsKey = 'pexels-test-api-key-123456';
  const pixabayKey = 'pixabay-test-api-key-123456';

  beforeAll(async () => {
    app = createApp();
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: 'stock-images@example.com', password: 'SecurePassword123!', name: 'Stock Image Author' });
    expect(register.status).toBe(201);
    token = register.body.token;

    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'The Forest Almanac', templateId: 'blank-manuscript' });
    expect(project.status).toBe(201);
    projectId = project.body.project.id;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {
      // Ignore test database cleanup errors.
    }
  });

  it('stores Pexels and Pixabay keys encrypted and never returns the secret', async () => {
    const initial = await request(app)
      .get('/api/image-providers')
      .set('Authorization', `Bearer ${token}`);
    expect(initial.status).toBe(200);
    expect(initial.body.providers.map((provider) => provider.id)).toEqual(['pexels', 'pixabay']);
    expect(initial.body.providers.every((provider) => !provider.configured)).toBe(true);

    const searchBeforeKeys = await request(app)
      .get(`/api/projects/${projectId}/assets/search?q=forest&provider=all`)
      .set('Authorization', `Bearer ${token}`);
    expect(searchBeforeKeys.status).toBe(200);
    expect(searchBeforeKeys.body.images).toEqual([]);
    expect(searchBeforeKeys.body.message).toContain('API key');

    const savedPexels = await request(app)
      .put('/api/image-providers/pexels')
      .set('Authorization', `Bearer ${token}`)
      .send({ apiKey: pexelsKey });
    const savedPixabay = await request(app)
      .put('/api/image-providers/pixabay')
      .set('Authorization', `Bearer ${token}`)
      .send({ apiKey: pixabayKey });

    expect(savedPexels.status).toBe(200);
    expect(savedPixabay.status).toBe(200);
    expect(JSON.stringify(savedPexels.body)).not.toContain(pexelsKey);
    expect(JSON.stringify(savedPixabay.body)).not.toContain(pixabayKey);

    const owner = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
    const encryptedPexels = db.prepare('SELECT encrypted_api_key FROM image_provider_settings WHERE user_id = ? AND provider = ?').get(owner.user_id, 'pexels');
    const encryptedPixabay = db.prepare('SELECT encrypted_api_key FROM image_provider_settings WHERE user_id = ? AND provider = ?').get(owner.user_id, 'pixabay');
    expect(encryptedPexels.encrypted_api_key).not.toBe(pexelsKey);
    expect(encryptedPexels.encrypted_api_key.split('.')).toHaveLength(3);
    expect(encryptedPixabay.encrypted_api_key).not.toBe(pixabayKey);

    const configured = await request(app)
      .get('/api/image-providers')
      .set('Authorization', `Bearer ${token}`);
    expect(configured.body.providers.map((provider) => [provider.id, provider.configured, provider.keyLastFour])).toEqual([
      ['pexels', true, '3456'],
      ['pixabay', true, '3456']
    ]);
    expect(JSON.stringify(configured.body)).not.toContain(pexelsKey);
    expect(JSON.stringify(configured.body)).not.toContain(pixabayKey);

    const keyCheckFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ photos: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', keyCheckFetch);
    try {
      const tested = await request(app)
        .post('/api/image-providers/pexels/test')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(tested.status).toBe(200);
      expect(tested.body.success).toBe(true);
      expect(tested.body.message).toContain('Pexels API key accepted');
      expect(keyCheckFetch.mock.calls[0][1].headers.Authorization).toBe(pexelsKey);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('searches both sources on the server and imports a result with creator, source, and license metadata', async () => {
    const mockFetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.startsWith('https://api.pexels.com/v1/search')) {
        return new Response(JSON.stringify({
          photos: [{
            id: 501,
            width: 2400,
            height: 1600,
            url: 'https://www.pexels.com/photo/winding-forest-501/',
            photographer: 'A. Photographer',
            alt: 'Sunlight in a green forest',
            src: {
              original: 'https://images.pexels.com/photos/501/forest.jpg',
              large: 'https://images.pexels.com/photos/501/forest-large.jpg',
              medium: 'https://images.pexels.com/photos/501/forest-medium.jpg'
            }
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.startsWith('https://pixabay.com/api/')) {
        return new Response(JSON.stringify({
          hits: [{
            id: 812,
            pageURL: 'https://pixabay.com/photos/fern-forest-812/',
            user: 'GreenFrame',
            tags: 'fern, forest, green',
            imageWidth: 2000,
            imageHeight: 1300,
            previewURL: 'https://cdn.pixabay.com/photo/812/preview.jpg',
            largeImageURL: 'https://cdn.pixabay.com/photo/812/large.jpg'
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url === 'https://images.pexels.com/photos/501/forest.jpg') {
        return new Response('expired source image', { status: 404 });
      }
      if (url === 'https://images.pexels.com/photos/501/forest-large.jpg') {
        return new Response(Buffer.from('test jpeg bytes'), { status: 200, headers: { 'content-type': 'image/jpeg' } });
      }
      return new Response('unexpected upstream request', { status: 404 });
    });
    vi.stubGlobal('fetch', mockFetch);

    const search = await request(app)
      .get(`/api/projects/${projectId}/assets/search?q=misty%20forest&provider=all`)
      .set('Authorization', `Bearer ${token}`);
    expect(search.status).toBe(200);
    expect(search.body.images.map((image) => image.provider)).toEqual(['pexels', 'pixabay']);
    expect(search.body.images[0]).toMatchObject({
      creatorAttribution: 'A. Photographer (Pexels)',
      sourceUrl: 'https://www.pexels.com/photo/winding-forest-501/',
      altText: 'Sunlight in a green forest'
    });
    expect(search.body.images[1]).toMatchObject({
      creatorAttribution: 'GreenFrame (Pixabay)',
      sourceUrl: 'https://pixabay.com/photos/fern-forest-812/'
    });
    expect(JSON.stringify(search.body)).not.toContain(pexelsKey);
    expect(JSON.stringify(search.body)).not.toContain(pixabayKey);

    const pexelsRequest = mockFetch.mock.calls.find(([url]) => String(url).startsWith('https://api.pexels.com/v1/search'));
    expect(pexelsRequest[1].headers.Authorization).toBe(pexelsKey);
    const pixabayRequest = mockFetch.mock.calls.find(([url]) => String(url).startsWith('https://pixabay.com/api/'));
    expect(new URL(String(pixabayRequest[0])).searchParams.get('key')).toBe(pixabayKey);

    const image = search.body.images[0];
    const imported = await request(app)
      .post(`/api/projects/${projectId}/assets/import-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send(image);
    expect(imported.status).toBe(201);
    expect(imported.body.asset).toMatchObject({
      originalName: 'pexels-501.jpg',
      sourceUrl: 'https://www.pexels.com/photo/winding-forest-501/',
      creatorAttribution: 'A. Photographer (Pexels)',
      licenseUrl: 'https://www.pexels.com/license/',
      licenseType: 'stock_provider_license',
      altText: 'Sunlight in a green forest',
      hasCommercialWarning: true
    });
    expect(imported.body.asset.dataUrl).toBe(`data:image/jpeg;base64,${Buffer.from('test jpeg bytes').toString('base64')}`);
    expect(imported.body.asset.placementNotes).toContain('Pexels');

    const assets = await request(app)
      .get(`/api/projects/${projectId}/assets`)
      .set('Authorization', `Bearer ${token}`);
    expect(assets.body.assets[0].sourceUrl).toBe('https://www.pexels.com/photo/winding-forest-501/');
    expect(assets.body.assets[0].licenseUrl).toBe('https://www.pexels.com/license/');

    const review = await request(app)
      .get(`/api/projects/${projectId}/review`)
      .set('Authorization', `Bearer ${token}`);
    expect(review.status).toBe(200);
    expect(review.body.review.recommendations.some((item) => item.id === `asset-stock-license-${imported.body.asset.id}`)).toBe(true);
  });

  it('returns a clear network error for provider tests without echoing the API key', async () => {
    const networkKey = 'pexels-network-test-key-987654';
    const unavailableFetch = vi.fn().mockRejectedValue(new Error('fetch failed'));
    vi.stubGlobal('fetch', unavailableFetch);
    try {
      const tested = await request(app)
        .post('/api/image-providers/pexels/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ apiKey: networkKey });
      expect(tested.status).toBe(502);
      expect(tested.body.error).toContain('Could not reach Pexels from this server');
      expect(JSON.stringify(tested.body)).not.toContain(networkKey);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('allows only image paths on the actual Pexels and Pixabay image hosts', () => {
    expect(validateProviderImageUrl('pixabay', 'https://pixabay.com/get/forest_1280.jpg').hostname).toBe('pixabay.com');
    expect(validateProviderImageUrl('pixabay', 'https://cdn.pixabay.com/photo/123/fern.jpg').hostname).toBe('cdn.pixabay.com');
    expect(() => validateProviderImageUrl('pixabay', 'https://pixabay.com/api/?key=not-an-image')).toThrow('trusted image CDN');
    expect(() => validateProviderImageUrl('pexels', 'https://images.pexels.com/')).toThrow('trusted image CDN');
  });

  it('rejects imports outside trusted image CDNs and enforces project ownership', async () => {
    const anonymous = await request(app).get(`/api/projects/${projectId}/assets/search?q=forest`);
    expect(anonymous.status).toBe(403);

    const maliciousImport = await request(app)
      .post(`/api/projects/${projectId}/assets/import-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider: 'pexels',
        imageUrl: 'https://attacker.example/image.jpg',
        sourceUrl: 'https://www.pexels.com/photo/forest-123/'
      });
    expect(maliciousImport.status).toBe(400);
    expect(maliciousImport.body.error).toContain('trusted image CDN');

    const forbidden = await request(app)
      .get('/api/projects/nonexistent-project/assets/search?q=forest')
      .set('Authorization', `Bearer ${token}`);
    expect(forbidden.status).toBe(404);
  });
});
