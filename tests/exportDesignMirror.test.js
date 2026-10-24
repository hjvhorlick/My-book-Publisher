import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import JSZip from 'jszip';
import {
  PAGE_BORDER_STYLES,
  BLOCK_BORDER_STYLES,
  HEADING_STYLES,
  PAGE_NUMBER_FORMATS as STUDIO_PAGE_NUMBER_FORMATS,
  toRoman
} from '../src/data/designSystem.js';

process.env.DB_PATH = path.join(process.cwd(), 'data', `export-design-${Date.now()}.db`);

const {
  PAGE_BORDER_IDS,
  BLOCK_BORDER_IDS,
  HEADING_STYLE_IDS,
  PAGE_NUMBER_FORMATS,
  resolveExportDesign,
  pageNumberLabel,
  epubDesignCss,
  getPageBorderLayers,
  contrastRatio
} = require('../server/designMirror');
const { createApp } = require('../server/index');

const parseBuffer = (response, callback) => {
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
};

const DESIGN = {
  pageBg: '#FFF7E8',
  pageText: '#2A1B0E',
  borderColor: '#8B1A1A',
  accentColor: '#B45309',
  fontFamily: 'Lora',
  design: {
    pageBorderId: 'crest-corners',
    blockBorderId: 'parchment',
    headingStyleId: 'kicker-overline',
    borderColor: '#8B1A1A',
    pageNumbers: 'roman',
    pageNumberWord: 'Page',
    dropCap: true,
    dropCapStyle: 'boxed'
  }
};

describe('export design mirror stays in step with the studio design system', () => {
  it('offers exactly the same page borders, blocks and heading styles', () => {
    expect([...PAGE_BORDER_IDS].sort()).toEqual(PAGE_BORDER_STYLES.map((style) => style.id).sort());
    expect([...BLOCK_BORDER_IDS].sort()).toEqual(BLOCK_BORDER_STYLES.map((style) => style.id).sort());
    expect([...HEADING_STYLE_IDS].sort()).toEqual(HEADING_STYLES.map((style) => style.id).sort());
    expect([...PAGE_NUMBER_FORMATS]).toEqual(STUDIO_PAGE_NUMBER_FORMATS.map((format) => format.id));
  });

  it('draws the same layers for every page border', () => {
    PAGE_BORDER_STYLES.forEach((style) => {
      expect(getPageBorderLayers(style.id)).toEqual(style.layers);
    });
  });

  it('numbers pages in the same roman numerals as the studio', () => {
    [1, 4, 9, 14, 40, 1999].forEach((value) => {
      expect(pageNumberLabel(value - 1, { pageNumbers: 'roman' })).toBe(toRoman(value));
      expect(pageNumberLabel(value - 1, { pageNumbers: 'arabic' })).toBe(String(value));
      expect(pageNumberLabel(value - 1, { pageNumbers: 'none' })).toBe('');
    });
  });
});

describe('exported pages carry the page the author designed', () => {
  it('resolves border ink, page numbers and furniture from the saved design', () => {
    const design = resolveExportDesign(DESIGN);
    expect(design.pageBorderId).toBe('crest-corners');
    expect(design.pageBorderLayers).toHaveLength(3);
    expect(design.pageNumbers).toBe('roman');
    expect(design.blockBorderId).toBe('parchment');
    expect(design.dropCap).toBe(true);
    expect(contrastRatio(design.borderInk, design.pageBg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(design.bodyText, design.pageBg)).toBeGreaterThanOrEqual(4.5);
    expect(design.serif).toBe(true);
  });

  it('writes the chosen border, tint and drop cap into the reader stylesheet', () => {
    const css = epubDesignCss(resolveExportDesign(DESIGN));
    expect(css).toContain('background-color: #FFF7E8');
    expect(css).toContain('.template-page-frame');
    expect(css).toContain('border:');
    expect(css).toMatch(/double|solid/);
    expect(css).toContain('box-shadow: inset');
    expect(css).toContain('::first-letter');
    expect(css).not.toContain('undefined');
    // "— Page I —" wording survives the export too.
    expect(pageNumberLabel(0, resolveExportDesign(DESIGN))).toBe('Page I');
    // The illuminated initial is a filled plate, not a coloured letter.
    expect(css).toMatch(/::first-letter \{[^}]*background-color/s);
  });

  it('falls back to a plain hairline page for unknown stored values', () => {
    const design = resolveExportDesign({ design: { pageBorderId: 'not-a-border', pageNumbers: 'klingon' } });
    expect(design.pageBorderId).toBe('hairline');
    expect(design.pageNumbers).toBe('arabic');
    expect(design.pageBorderLayers.length).toBeGreaterThan(0);
  });
});

describe('published files keep the design after a reload', () => {
  let app;
  let token;
  let projectId;

  beforeAll(async () => {
    app = createApp();
    const registration = await request(app)
      .post('/api/auth/register')
      .send({ email: 'export-design@example.com', password: 'StrongPassword123!', name: 'Design Author' });
    token = registration.body.token;

    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'The Crimson Archive',
        templateId: 'blank-manuscript',
        bookType: 'book',
        publicationType: 'book',
        coverConfig: DESIGN,
        customChapters: [{
          stageKey: 'chapter-1',
          title: 'The First Ledger',
          sectionType: 'book_chapter',
          contentHtml: '<p>The archive smelled of dust and lamp oil.</p>',
          structuredData: { pageStructure: 0 }
        }]
      });
    expect(created.status).toBeLessThan(300);
    projectId = created.body.project.id;
  });

  afterAll(() => {
    const dbPath = process.env.DB_PATH;
    for (const suffix of ['', '-wal', '-shm']) {
      try { if (fs.existsSync(`${dbPath}${suffix}`)) fs.unlinkSync(`${dbPath}${suffix}`); } catch { /* ignore */ }
    }
  });

  it('merges a single design change without wiping the rest of the page design', async () => {
    const updated = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ coverConfig: { design: { borderColor: '#1E3A5F' } } });
    expect(updated.status).toBe(200);

    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    const saved = detail.body.project.coverConfig;
    expect(saved.design.borderColor).toBe('#1E3A5F');
    expect(saved.design.pageBorderId).toBe('crest-corners');
    expect(saved.design.blockBorderId).toBe('parchment');
    expect(saved.design.pageNumbers).toBe('roman');
    expect(saved.pageBg).toBe('#FFF7E8');
  });

  it('publishes an EPUB whose stylesheet uses the page design', async () => {
    const res = await request(app)
      .get(`/api/publishing/${projectId}/export/epub`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(parseBuffer);
    expect(res.status).toBe(200);

    const zip = await JSZip.loadAsync(res.body);
    const css = await zip.file('OEBPS/styles.css').async('string');
    expect(css).toContain('#FFF7E8');
    expect(css).toContain('.template-page-frame');
    expect(css).toMatch(/border:\s*\d+px/);
    const chapter = await zip.file('OEBPS/chapter-1.xhtml').async('string');
    expect(chapter).toContain('class="template-page-frame"');
  });

  it('publishes a PDF with the decorated page and a surviving Index', async () => {
    const res = await request(app)
      .get(`/api/publishing/${projectId}/export/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(parseBuffer);
    expect(res.status).toBe(200);
    const pdfText = res.body.toString('latin1');
    expect(pdfText.startsWith('%PDF-')).toBe(true);
    expect(pdfText).toContain('chapter-dest-1');
  });
});
