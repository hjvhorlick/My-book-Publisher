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
