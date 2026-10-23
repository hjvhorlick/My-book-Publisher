import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import JSZip from 'jszip';

const testDbPath = path.join(process.cwd(), 'data', `chapter-pages-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
const { createApp } = require('../server/index');

describe('chapter pages in persistence and publication exports', () => {
  let app;
  let token;
  let projectId;
  let chapterId;

  beforeAll(async () => {
    app = createApp();
    const registration = await request(app)
      .post('/api/auth/register')
      .send({ email: 'chapter-pages@example.com', password: 'StrongPassword123!', name: 'Page Author' });
    token = registration.body.token;

    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'A Book of Two Pages',
        templateId: 'blank-manuscript',
        bookType: 'book',
        publicationType: 'book',
        customChapters: [{
          stageKey: 'chapter-1',
          title: 'The First Chapter',
          sectionType: 'chapter',
          contentHtml: '<p>First page opening.</p>',
          structuredData: {
            pageStructure: 0,
            pages: [{
              id: 'page-1',
              contentHtml: '<p>First page opening.</p>',
              structuredData: { pageStructure: 0 }
            }]
          }
        }]
      });
    projectId = created.body.project.id;
    chapterId = created.body.chapters[0].id;
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

  it('persists rich formatting and carries emphasis, underline, color, and alignment into EPUB and DOCX', async () => {
    const chapter = (await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)).body.chapters[0];
    const styledHtml = '<p style="text-align:center;background:url(javascript:alert(1))" onclick="alert(2)"><span style="color:#C76A2F">A copper</span> <strong>bold</strong> and <u>underlined</u> line.<script>alert(3)</script></p>';
    const pages = chapter.structuredData.pages.map((page, index) => index === 0
      ? { ...page, contentHtml: styledHtml }
      : page);

    const rootSubtitle = '<p><em>First-page deck</em> with readable style.<script>alert(4)</script></p>';
    const save = await request(app)
      .put(`/api/projects/${projectId}/chapters/${chapterId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subtitle: rootSubtitle, contentHtml: styledHtml, structuredData: { ...chapter.structuredData, pages } });
    expect(save.status).toBe(200);
    expect(save.body.chapter.contentHtml).toContain('<p style="text-align:center">');
    expect(save.body.chapter.contentHtml).toContain('<u>underlined</u>');
    expect(save.body.chapter.contentHtml).not.toContain('onclick');
    expect(save.body.chapter.contentHtml).not.toContain('javascript:');
    expect(save.body.chapter.contentHtml).not.toContain('<script');
    expect(save.body.chapter.subtitle).toContain('<em>First-page deck</em>');
    expect(save.body.chapter.subtitle).not.toContain('<script');
    expect(save.body.chapter.wordCount).toBeGreaterThan(5);

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
    const chapterXhtml = await epubZip.file('OEBPS/chapter-1.xhtml').async('string');
    expect(chapterXhtml).toContain('<p style="text-align:center">');
    expect(chapterXhtml).toContain('<span style="color:#C76A2F">A copper</span>');
    expect(chapterXhtml).toContain('<strong>bold</strong>');
    expect(chapterXhtml).toContain('<u>underlined</u>');
    expect(chapterXhtml).toContain('<em>First-page deck</em>');
    expect(chapterXhtml).not.toContain('<script');

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
    expect(documentXml).toContain('<w:b/>');
    expect(documentXml).toContain('<w:u w:val="single"/>');
    expect(documentXml).toContain('<w:color w:val="C76A2F"/>');
    expect(documentXml).toContain('<w:jc w:val="center"/>');
    expect(documentXml).toContain('First-page deck');
    expect(documentXml).toContain('<w:i/>');

    const pdf = await request(app)
      .get(`/api/publishing/${projectId}/export/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(pdf.body.slice(0, 5).toString()).toBe('%PDF-');
    expect(pdf.body.length).toBeGreaterThan(1000);
  });

  it('persists a second page under its chapter and exports both pages under one chapter heading', async () => {
    const chapter = (await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)).body.chapters[0];
    const pages = [
      ...chapter.structuredData.pages.map((page, index) => index === 0
        ? { ...page, contentHtml: '<p>First page opening.</p>' }
        : page),
      {
        id: 'page-2',
        title: 'A Later Scene',
        subtitle: '<p><strong>Later-page deck</strong><script>alert(5)</script></p>',
        contentHtml: '<p>Second page content survives export.</p>',
        structuredData: { pageStructure: 4 }
      }
    ];

    const save = await request(app)
      .put(`/api/projects/${projectId}/chapters/${chapterId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ structuredData: { ...chapter.structuredData, pages } });
    expect(save.status).toBe(200);
    expect(save.body.chapter.title).toBe('The First Chapter');
    expect(save.body.chapter.structuredData.pages).toHaveLength(2);
    expect(save.body.chapter.wordCount).toBe(8);

    const reloaded = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(reloaded.body.chapters[0].structuredData.pages[1].contentHtml)
      .toContain('Second page content survives export.');
    expect(reloaded.body.chapters[0].structuredData.pages[1].subtitle)
      .toContain('<strong>Later-page deck</strong>');
    expect(reloaded.body.chapters[0].structuredData.pages[1].subtitle)
      .not.toContain('<script');

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
    const chapterXhtml = await epubZip.file('OEBPS/chapter-1.xhtml').async('string');
    const indexXhtml = await epubZip.file('OEBPS/index-toc.xhtml').async('string');
    expect(chapterXhtml).toContain('The First Chapter');
    expect(chapterXhtml).toContain('Later-page deck');
    expect(chapterXhtml).toContain('Second page content survives export.');
    expect(indexXhtml).toContain('Chapter 1: The First Chapter');
  });
});
