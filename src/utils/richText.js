const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'strong', 'b', 'em', 'i', 'u', 'span', 'ul', 'ol', 'li',
  'blockquote', 'h1', 'h2', 'h3', 'h4'
]);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeStyle(styleText) {
  const accepted = [];
  for (const declaration of String(styleText || '').split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (property === 'text-align' && /^(left|center|right|justify)$/i.test(value)) {
      accepted.push(`text-align:${value.toLowerCase()}`);
    } else if (property === 'color' && /^(#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\))$/i.test(value)) {
      accepted.push(`color:${value}`);
    } else if (property === 'font-weight' && /^(bold|[1-9]00)$/i.test(value)) {
      accepted.push(`font-weight:${value}`);
    } else if (property === 'font-style' && /^(italic|normal)$/i.test(value)) {
      accepted.push(`font-style:${value}`);
    } else if (property === 'text-decoration' && /^(underline|line-through|none)$/i.test(value)) {
      accepted.push(`text-decoration:${value}`);
    }
  }
  return accepted.join(';');
}

export function sanitizeRichHtml(value = '') {
  let html = String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*\/?\s*>/gi, '');

  html = html.replace(/<\/?([a-z0-9]+)\b([^>]*)>/gi, (tag, rawName, rawAttributes) => {
    const name = String(rawName).toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return '';
    const closing = /^<\//.test(tag);
    if (closing) return name === 'br' ? '' : `</${name}>`;
    if (name === 'br') return '<br />';
    const styleMatch = String(rawAttributes || '').match(/\bstyle\s*=\s*(["'])(.*?)\1/i);
    const safeStyle = styleMatch ? sanitizeStyle(styleMatch[2]) : '';
    return `<${name}${safeStyle ? ` style="${escapeHtml(safeStyle)}"` : ''}>`;
  });

  return html;
}

export function plainTextToRichHtml(value = '') {
  const text = String(value || '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export function normalizeRichHtml(value = '') {
  const input = String(value || '');
  if (/<\/?(p|br|div|strong|b|em|i|u|span|ul|ol|li|blockquote|h[1-4])\b/i.test(input)) {
    return sanitizeRichHtml(input);
  }
  return plainTextToRichHtml(input);
}

export function richHtmlToPlainText(value = '') {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|blockquote)\s*>/gi, '\n\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function countRichTextWords(value = '') {
  return richHtmlToPlainText(value).split(/\s+/).filter(Boolean).length;
}

/**
 * Shorten rich HTML to at most `maxWords` words, keeping the allowed
 * formatting tags balanced. Used by the block editor's "Trim to fit"
 * action and when a long paste would overflow a template space, so the
 * page always receives only the amount of text its design can hold.
 */
export function trimRichHtmlToWordLimit(value = '', maxWords = 100) {
  const limit = Math.max(1, Math.floor(Number(maxWords) || 100));
  const html = normalizeRichHtml(value);
  if (countRichTextWords(html) <= limit) return html;

  const tokens = html.split(/(<[^>]+>)/g);
  const openTags = [];
  let wordsLeft = limit;
  let output = '';

  for (const token of tokens) {
    if (wordsLeft <= 0) break;
    if (!token) continue;
    if (token.startsWith('<')) {
      const closing = /^<\//.test(token);
      const nameMatch = token.match(/^<\/?([a-z0-9]+)/i);
      const name = nameMatch ? nameMatch[1].toLowerCase() : '';
      output += token;
      if (name && name !== 'br') {
        if (closing) {
          const index = openTags.lastIndexOf(name);
          if (index >= 0) openTags.splice(index, 1);
        } else if (!/\/>$/.test(token)) {
          openTags.push(name);
        }
      }
      continue;
    }
    const words = token.match(/\S+\s*/g) || [];
    if (words.length <= wordsLeft) {
      output += token;
      wordsLeft -= words.length;
    } else {
      // Keep one separating space when the cut lands between two words
      // that were spaced apart, including across a closing inline tag.
      const separator = /^\s/.test(token) && !/\s$/.test(output) ? ' ' : '';
      output += separator + words.slice(0, wordsLeft).join('').trimEnd();
      wordsLeft = 0;
    }
  }

  output = output.replace(/(<br\s*\/?>\s*)+$/i, '');
  while (openTags.length) output += `</${openTags.pop()}>`;
  return sanitizeRichHtml(output);
}

/**
 * Sentence-aware plain-text trimmer: prefers ending at the last complete
 * sentence inside the word budget so a trimmed block still reads finished.
 */
export function trimPlainTextToWordLimit(value = '', maxWords = 100) {
  const limit = Math.max(1, Math.floor(Number(maxWords) || 100));
  const text = String(value || '').replace(/\r\n?/g, '\n').trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= limit) return text;
  const head = words.slice(0, limit);
  for (let index = head.length - 1; index >= Math.floor(limit * 0.6); index -= 1) {
    if (/[.!?]["”’)]?$/.test(head[index])) return head.slice(0, index + 1).join(' ');
  }
  return head.join(' ');
}

/** Writing stats shown in the block editor footer. */
export function getRichTextStats(value = '') {
  const text = richHtmlToPlainText(value);
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length;
  return {
    words,
    characters: text.length,
    sentences,
    readingSeconds: Math.max(0, Math.round((words / 200) * 60))
  };
}
