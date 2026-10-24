import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import JSZip from 'jszip';

const testDbPath = path.join(process.cwd(), 'data', `introduction-cover-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
const { createApp } = require('../server/index');

describe('Introduction page and book cover design', () => {
  let app;
  let token;
  let projectId;

  beforeAll(async () => {
    app = createApp();
    const registration = await request(app)
      .post('/api/auth/register')
      .send({ email: 'intro-cover@example.com', password: 'StrongPassword123!', name: 'Cover Author' });
    token = registration.body.token;

    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Lanterns at Dawn',
        authorName: 'Mira Solberg',
        templateId: 'blank-manuscript',
        bookType: 'book',
        publicationType: 'book',
        customChapters: [{
          stageKey: 'chapter-1',
          title: 'The First Chapter',
          sectionType: 'chapter',
          contentHtml: '<p>Body of the first chapter.</p>',
          structuredData: {
            pageStructure: 0,
            pages: [{ id: 'page-1', contentHtml: '<p>Body of the first chapter.</p>', structuredData: { pageStructure: 0 } }]
          }
        }]
      });
    projectId = created.body.project.id;
  });

  afterAll(() => {
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {
      // ignore cleanup error
    }
  });

  it('saves, sanitizes and returns the Introduction page via project PUT/GET', async () => {
    const put = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        introduction: {
          title: '  Words Before the Story  ',
          contentHtml: '<p style="text-align:center"><em>For those who waited up.</em><script>alert(1)</script></p>'
        }
      });
    expect(put.status).toBe(200);
    expect(put.body.project.introduction.title).toBe('Words Before the Story');
    expect(put.body.project.introduction.contentHtml).toContain('For those who waited up.');
    expect(put.body.project.introduction.contentHtml).not.toContain('script');

    const fetched = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetched.body.project.introduction.title).toBe('Words Before the Story');
    expect(fetched.body.project.introduction.contentHtml).toContain('For those who waited up.');

    // A partial update must not wipe the saved introduction.
    const merge = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subtitle: 'A quiet novel' });
    expect(merge.status).toBe(200);
    expect(merge.body.project.introduction.title).toBe('Words Before the Story');
    expect(merge.body.project.subtitle).toBe('A quiet novel');
  });

  it('exports the Introduction as the first front section in EPUB and DOCX, without shifting chapter numbering', async () => {
    const epub = await request(app)
      .get(`/api/publishing/${projectId}/export/epub`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(epub.status).toBe(200);
    const epubZip = await JSZip.loadAsync(epub.body);

    const introXhtml = await epubZip.file('OEBPS/front-1.xhtml').async('string');
    expect(introXhtml).toContain('Words Before the Story');
    expect(introXhtml).toContain('For those who waited up.');

    const indexXhtml = await epubZip.file('OEBPS/index-toc.xhtml').async('string');
    // Introduction listed by title only; the real chapter keeps "Chapter 1".
    expect(indexXhtml).toContain('>Words Before the Story</a>');
    expect(indexXhtml).toContain('Chapter 1: The First Chapter');
    expect(indexXhtml).not.toContain('Chapter 1: Words Before the Story');

    const docx = await request(app)
      .get(`/api/publishing/${projectId}/export/docx`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(docx.status).toBe(200);
    const docxZip = await JSZip.loadAsync(docx.body);
    const documentXml = await docxZip.file('word/document.xml').async('string');
    expect(documentXml).toContain('Words Before the Story');
    expect(documentXml).toContain('For those who waited up.');
    // Introduction appears before the first chapter's body text.
    expect(documentXml.indexOf('For those who waited up.'))
      .toBeLessThan(documentXml.indexOf('Body of the first chapter.'));
  });

  it('merges cover design keys and keeps word art / author photo settings across saves', async () => {
    const first = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        coverConfig: {
          coverImage: '/sample-artwork/nature-waterfall.jpg',
          coverOverlay: 0.35,
          wordArt: { text: 'Lanterns at Dawn', fillMode: 'none', strokeColor: '#FDE08D', strokeWidth: 1.5 },
          coverBlurb: 'Some lights only arrive at dawn.',
          showAuthorPhoto: true,
          authorPhotoUrl: 'data:image/jpeg;base64,QUJD',
          coverAuthorName: 'Mira Solberg'
        }
      });
    expect(first.status).toBe(200);
    const saved = first.body.project.coverConfig;
    expect(saved.coverImage).toBe('/sample-artwork/nature-waterfall.jpg');
    expect(saved.wordArt.fillMode).toBe('none');
    expect(saved.showAuthorPhoto).toBe(true);
    expect(saved.coverAuthorName).toBe('Mira Solberg');

    // A follow-up save that only touches the blurb must retain every sibling key.
    const second = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ coverConfig: { coverBlurb: 'Revised line.' } });
    expect(second.status).toBe(200);
    const merged = second.body.project.coverConfig;
    expect(merged.coverBlurb).toBe('Revised line.');
    expect(merged.coverImage).toBe('/sample-artwork/nature-waterfall.jpg');
    expect(merged.wordArt).toEqual({ text: 'Lanterns at Dawn', fillMode: 'none', strokeColor: '#FDE08D', strokeWidth: 1.5 });
    expect(merged.showAuthorPhoto).toBe(true);
    expect(merged.authorPhotoUrl).toBe('data:image/jpeg;base64,QUJD');
    // Original creation-time keys must survive too.
    expect(merged.layout).toBe('editorial_frame');

    // JSON backup (hydrateProjectSummary) exposes both features for round-trips.
    const jsonExport = await request(app)
      .get(`/api/publishing/${projectId}/export/json`)
      .set('Authorization', `Bearer ${token}`);
    expect(jsonExport.status).toBe(200);
    const payload = jsonExport.body.project || jsonExport.body;
    expect(payload.introduction.title).toBe('Words Before the Story');
    expect(payload.coverConfig.wordArt.fillMode).toBe('none');
    expect(payload.coverConfig.showAuthorPhoto).toBe(true);
  });

  it('embeds the cover image in the EPUB with cover-image manifest entry and a leading cover page', async () => {
    const epub = await request(app)
      .get(`/api/publishing/${projectId}/export/epub`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(epub.status).toBe(200);
    const zip = await JSZip.loadAsync(epub.body);

    // Sample artwork from public/ must be embedded as a real image file.
    const coverImg = zip.file('OEBPS/images/cover.jpg');
    expect(coverImg).toBeTruthy();

    const opf = await zip.file('OEBPS/content.opf').async('string');
    expect(opf).toContain('properties="cover-image"');
    expect(opf).toContain('<meta name="cover" content="cover-image"/>');
    // Cover page is the first spine entry, ahead of the title page.
    expect(opf.indexOf('idref="cover-page"')).toBeLessThan(opf.indexOf('idref="title-page"'));

    const nav = await zip.file('OEBPS/nav.xhtml').async('string');
    expect(nav).toContain('Front Cover');
    const coverXhtml = await zip.file('OEBPS/cover.xhtml').async('string');
    expect(coverXhtml).toContain('Lanterns at Dawn');
    expect(coverXhtml).toContain('Revised line.');
    expect(coverXhtml).toContain('cover-word-art outline-only');
    expect(coverXhtml).toContain('cover-author-photo');

    const toc = await zip.file('OEBPS/toc.ncx').async('string');
    expect(toc).toContain('Front Cover');
  });
});
