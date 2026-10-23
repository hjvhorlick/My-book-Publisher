import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RichTextField from '../src/components/RichTextField.jsx';
import {
  countRichTextWords,
  normalizeRichHtml,
  plainTextToRichHtml,
  richHtmlToPlainText,
  sanitizeRichHtml
} from '../src/utils/richText.js';

describe('rich-text field and clipboard-safe HTML utilities', () => {
  it('round-trips paragraphs and counts words from formatted HTML', () => {
    const html = plainTextToRichHtml('A bold idea.\n\nA second line.');
    expect(html).toBe('<p>A bold idea.</p><p>A second line.</p>');
    expect(richHtmlToPlainText(html)).toBe('A bold idea.\n\nA second line.');
    expect(countRichTextWords('<p><strong>Three clear</strong> words.</p>')).toBe(3);
  });

  it('preserves supported text styles while stripping unsafe tags, attributes, and CSS', () => {
    const safe = sanitizeRichHtml('<p onclick="steal()" style="text-align:center;color:#ff0000;background:url(javascript:alert(1))"><strong>Safe</strong><script>alert(1)</script><img src=x onerror=alert(2)></p>');
    expect(safe).toContain('<p style="text-align:center;color:#ff0000">');
    expect(safe).toContain('<strong>Safe</strong>');
    expect(safe).not.toContain('onclick');
    expect(safe).not.toContain('javascript');
    expect(safe).not.toContain('<script');
    expect(safe).not.toContain('<img');
    expect(normalizeRichHtml('plain <text>')).toBe('<p>plain &lt;text&gt;</p>');
  });

  it('offers the formatting toolbar and keeps field prompts hidden until AI is opened', () => {
    const context = {
      categoryId: 'book',
      fieldKey: 'chapterText',
      fieldLabel: 'Chapter manuscript',
      bookTitle: 'A Quiet Harbor',
      maxWords: 80
    };
    const withoutProvider = renderToStaticMarkup(
      <RichTextField value="Sample copy" aiConfigured={false} aiContext={context} />
    );
    expect(withoutProvider).toContain('Bold');
    expect(withoutProvider).toContain('Italic');
    expect(withoutProvider).toContain('Underline');
    expect(withoutProvider).toContain('Align text left');
    expect(withoutProvider).toContain('Align text center');
    expect(withoutProvider).toContain('Align text right');
    expect(withoutProvider).toContain('Text color');
    expect(withoutProvider).not.toContain('Generate Chapter manuscript with AI');

    const withProvider = renderToStaticMarkup(
      <RichTextField value="Sample copy" aiConfigured aiContext={context} />
    );
    expect(withProvider).toContain('Generate Chapter manuscript with AI');
    expect(withProvider).not.toContain('Generated prompt');
    expect(withProvider).not.toContain('Book: A Quiet Harbor');
  });
});
