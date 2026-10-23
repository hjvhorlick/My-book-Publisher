import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import JSZip from 'jszip';

const testDbPath = path.join(process.cwd(), 'data', `clean-export-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
const { createApp } = require('../server/index');
const { collectChapterImages, getImageDimensions, isPngReadable } = require('../server/exportEngine');

// A genuinely valid 8×8 RGB PNG.
const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4UaGBFTEMLQkAUtVaAV8W4QQAAAAASUVORK5CYII=';
// Same shape, corrupted IDAT — must be skipped, never crash an export.
const BROKEN_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=';

const parseBuffer = (response, callback) => {
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('published exports: clean documents with words, images, page numbers, Index links', () => {
  let app;
  let token;
  let projectId;

  beforeAll(async () => {
    app = createApp();
    const registration = await request(app)
      .post('/api/auth/register')
      .send({ email: 'clean-export@example.com', password: 'StrongPassword123!', name: 'Clean Author' });
    token = registration.body.token;

    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Harbour Lights',
        templateId: 'blank-manuscript',
        bookType: 'storybook',
        publicationType: 'storybook',
        customChapters: [{
          stageKey: 'chapter-1',
          title: 'The Little Lighthouse',
          sectionType: 'storybook_spread',
          contentHtml: '<p>Lina the lighthouse blinked awake.</p>',
          structuredData: {
            pageStructure: 0,
            pages: [{
              id: 'page-1',
              contentHtml: '<p>Lina the lighthouse blinked awake.</p>',
              structuredData: {
                pageStructure: 0,
                storyText: '<p>Lina the lighthouse blinked awake.</p>',
                illustrationPrompt: 'SECRET_PRODUCTION_NOTE paint a purple lighthouse',
                captions: [
                  { imageUrl: VALID_PNG, title: '<p>Lina waves at dawn</p>', location: 'Lantern Bay' },
                  { imageUrl: BROKEN_PNG, title: 'Broken plate' }
                ]
              }
            }]
          }
        }]
      });
    expect(created.status).toBeLessThan(300);
    projectId = created.body.project.id;
  });

  afterAll(() => {
    for (const suffix of ['', '-wal', '-shm']) {
      try { if (fs.existsSync(`${testDbPath}${suffix}`)) fs.unlinkSync(`${testDbPath}${suffix}`); } catch { /* ignore */ }
    }
  });

  it('collects only placed page photos and can measure and validate them', async () => {
    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    const chapter = detail.body.chapters[0];
    const images = collectChapterImages(chapter);
    expect(images).toHaveLength(2);
    expect(images[0].caption).toBe('Lina waves at dawn');
    expect(images[0].location).toBe('Lantern Bay');

    const pngBuffer = Buffer.from(VALID_PNG.split(',')[1], 'base64');
    expect(getImageDimensions(pngBuffer)).toEqual({ width: 8, height: 8 });
    expect(isPngReadable(pngBuffer)).toBe(true);
    expect(isPngReadable(Buffer.from(BROKEN_PNG.split(',')[1], 'base64'))).toBe(false);
  });

  it('DOCX embeds photos, links Contents entries to chapters, numbers pages, and carries no studio text', async () => {
    const res = await request(app)
      .get(`/api/publishing/${projectId}/export/docx`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(parseBuffer);
    expect(res.status).toBe(200);
    const zip = await JSZip.loadAsync(res.body);
    const documentXml = await zip.file('word/document.xml').async('string');
    const media = Object.keys(zip.files).filter((name) => name.startsWith('word/media/') && !name.endsWith('/'));
    expect(media).toHaveLength(1); // the broken PNG is skipped, not embedded
    expect(documentXml).toContain('w:anchor="chapter-1"');
    expect(documentXml).toContain('w:bookmarkStart');
    expect(documentXml).toContain('chapter-1');
    expect(documentXml).toContain('Lina waves at dawn');
    expect(documentXml).toContain('lighthouse blinked awake');
    expect(documentXml).not.toContain('SECRET_PRODUCTION_NOTE');
    expect(documentXml).not.toContain('Illustration Plate');
    expect(documentXml).not.toContain('Write with AI');
    expect(documentXml).not.toContain('Trim to fit');
    expect(documentXml).not.toContain('Tap Edit');

    const footerName = Object.keys(zip.files).find((name) => /word\/footer\d+\.xml$/.test(name));
    const footerXml = await zip.file(footerName).async('string');
    expect(footerXml).toContain('>PAGE<');
  });

  it('EPUB embeds the photo in the chapter with its caption and links the Index', async () => {
    const res = await request(app)
      .get(`/api/publishing/${projectId}/export/epub`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(parseBuffer);
    expect(res.status).toBe(200);
    const zip = await JSZip.loadAsync(res.body);
    const chapterXhtml = await zip.file('OEBPS/chapter-1.xhtml').async('string');
    const indexXhtml = await zip.file('OEBPS/index-toc.xhtml').async('string');
    expect(chapterXhtml).toContain('<img src="images/page-photo-1.png"');
    expect(chapterXhtml).toContain('<figcaption>Lina waves at dawn — Lantern Bay</figcaption>');
    expect(chapterXhtml).toContain('lighthouse blinked awake');
    expect(chapterXhtml).not.toContain('SECRET_PRODUCTION_NOTE');
    expect(indexXhtml).toContain('href="chapter-1.xhtml#start-chapter-1"');
    expect(indexXhtml).toContain('Chapter 1: The Little Lighthouse');
  });

  it('PDF publishes with an embedded image and Index destinations, surviving the broken PNG', async () => {
    const res = await request(app)
      .get(`/api/publishing/${projectId}/export/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(parseBuffer);
    expect(res.status).toBe(200);
    const pdfText = res.body.toString('latin1');
    expect(pdfText.startsWith('%PDF-')).toBe(true);
    expect(/\/Subtype\s*\/Image/.test(pdfText)).toBe(true);
    expect(pdfText).toContain('chapter-dest-1');
    expect(pdfText).not.toContain('SECRET_PRODUCTION_NOTE');
  });
});
