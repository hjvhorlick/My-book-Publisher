const mammoth = require('mammoth');
const { countWordsFromHtml } = require('./db');

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseMarkdownToHtml(md = '') {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const htmlLines = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { htmlLines.push('</ul>'); inUl = false; }
    if (inOl) { htmlLines.push('</ol>'); inOl = false; }
  };

  const inlineFormat = (text) => {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeLists();
      continue;
    }

    if (line.startsWith('# ')) {
      closeLists();
      htmlLines.push(`<h1>${inlineFormat(line.slice(2).trim())}</h1>`);
    } else if (line.startsWith('## ')) {
      closeLists();
      htmlLines.push(`<h2>${inlineFormat(line.slice(3).trim())}</h2>`);
    } else if (line.startsWith('### ')) {
      closeLists();
      htmlLines.push(`<h3>${inlineFormat(line.slice(4).trim())}</h3>`);
    } else if (line.startsWith('> ')) {
      closeLists();
      htmlLines.push(`<blockquote>${inlineFormat(line.slice(2).trim())}</blockquote>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (inOl) { htmlLines.push('</ol>'); inOl = false; }
      if (!inUl) { htmlLines.push('<ul>'); inUl = true; }
      htmlLines.push(`<li>${inlineFormat(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (inUl) { htmlLines.push('</ul>'); inUl = false; }
      if (!inOl) { htmlLines.push('<ol>'); inOl = true; }
      htmlLines.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ''))}</li>`);
    } else {
      closeLists();
      htmlLines.push(`<p>${inlineFormat(line)}</p>`);
    }
  }
  closeLists();
  return htmlLines.join('\n');
}

function parsePlainTextToHtml(txt = '') {
  const blocks = String(txt).replace(/\r\n/g, '\n').split(/\n{2,}/);
  const out = [];
  for (const b of blocks) {
    const clean = b.trim();
    if (!clean) continue;
    if (/^(chapter|part|prologue|epilogue|introduction)\b/i.test(clean) && clean.length < 90 && !clean.includes('\n')) {
      out.push(`<h1>${escapeHtml(clean)}</h1>`);
    } else {
      out.push(`<p>${escapeHtml(clean).replace(/\n/g, '<br/>')}</p>`);
    }
  }
  return out.join('\n');
}

function splitHtmlIntoChapters(html = '', fallbackTitle = 'Imported Manuscript') {
  const cleanHtml = String(html || '').trim();
  if (!cleanHtml) {
    return [{
      title: fallbackTitle,
      contentHtml: '<p></p>',
      wordCount: 0
    }];
  }

  // Split on <h1> tags if present
  const parts = cleanHtml.split(/(?=<h1[^>]*>)/i).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1 || /^<h1[^>]*>/i.test(parts[0])) {
    return parts.map((part, idx) => {
      const h1Match = part.match(/^<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const rawTitle = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : `Chapter ${idx + 1}`;
      const body = h1Match ? part.slice(h1Match[0].length).trim() : part;
      const contentHtml = body || `<p></p>`;
      return {
        title: rawTitle || `Chapter ${idx + 1}`,
        contentHtml,
        wordCount: countWordsFromHtml(contentHtml)
      };
    });
  }

  return [{
    title: fallbackTitle,
    contentHtml: cleanHtml,
    wordCount: countWordsFromHtml(cleanHtml)
  }];
}

async function parseImportedFile({ buffer, filename = 'manuscript.txt', rawText = '' }) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const baseName = filename.replace(/\.[^.]+$/, '') || 'Imported Manuscript';
  const transferNotes = [];
  let html = '';
  let formatType = 'txt';

  if (rawText && !buffer) {
    formatType = 'paste';
    const looksLikeMarkdown = /^#{1,3}\s|\*\*.+\*\*/m.test(rawText);
    html = looksLikeMarkdown ? parseMarkdownToHtml(rawText) : parsePlainTextToHtml(rawText);
    transferNotes.push('Pasted text was parsed into structured headings and paragraphs.');
    transferNotes.push('Complex external page layouts, custom fonts, and floating text boxes do not transfer from clipboard paste and will use your Book Design settings.');
  } else if (ext === 'docx') {
    formatType = 'docx';
    const result = await mammoth.convertToHtml({ buffer });
    html = result.value || '';
    transferNotes.push('Preserved headings (H1–H3), paragraphs, bold/italic styling, lists, blockquotes, and inline images from DOCX.');
    transferNotes.push('Page margins, running headers/footers, and floating Word shapes are governed by your Book Design Studio settings rather than static Word page geometry.');
    if (result.messages && result.messages.length > 0) {
      result.messages.slice(0, 4).forEach(m => {
        if (m.message) transferNotes.push(`DOCX Conversion Note: ${m.message}`);
      });
    }
  } else if (ext === 'md' || ext === 'markdown') {
    formatType = 'markdown';
    const text = buffer.toString('utf8');
    html = parseMarkdownToHtml(text);
    transferNotes.push('Preserved Markdown headings (#, ##, ###), emphasis, blockquotes, links, and lists.');
    transferNotes.push('Top-level (#) headings were automatically segmented into individual book chapters.');
  } else if (ext === 'txt') {
    formatType = 'txt';
    const text = buffer.toString('utf8');
    html = parsePlainTextToHtml(text);
    transferNotes.push('Converted plain-text double line breaks into paragraphs and detected "Chapter / Part" lines as chapter headings.');
  } else {
    throw new Error(`Unsupported file format ".${ext}". Supported formats are DOCX (.docx), Markdown (.md), and Plain Text (.txt).`);
  }

  const chapters = splitHtmlIntoChapters(html, baseName);
  const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);

  return {
    suggestedTitle: baseName.replace(/[-_]/g, ' '),
    formatType,
    totalWords,
    chapterCount: chapters.length,
    chapters,
    transferNotes
  };
}

module.exports = {
  parseImportedFile,
  parseMarkdownToHtml,
  parsePlainTextToHtml
};
