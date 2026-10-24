import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RichTextField from '../src/components/RichTextField.jsx';
import BlockTextEditor from '../src/components/BlockTextEditor.jsx';
import { getTextSlotRule } from '../src/data/slotRules.js';
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

  it('shows only a small Edit button on the page — tools live in the editor', () => {
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
    // The designed block itself: words + one Edit button with its fit counter.
    expect(withoutProvider).toContain('aria-label="Edit Chapter manuscript"');
    expect(withoutProvider).toContain('2/80');
    expect(withoutProvider).toContain('<p>Sample copy</p>');
    // No editor chrome on the page any more.
    expect(withoutProvider).not.toContain('aria-label="Bold"');
    expect(withoutProvider).not.toContain('contentEditable');
    expect(withoutProvider).not.toContain('Generate Chapter manuscript with AI');
    expect(withoutProvider).not.toContain('Write with AI');

    const withProvider = renderToStaticMarkup(
      <RichTextField value="Sample copy" aiConfigured aiContext={context} />
    );
    expect(withProvider).toContain('aria-label="Edit Chapter manuscript"');
    expect(withProvider).not.toContain('Generated prompt');
    expect(withProvider).not.toContain('Book: A Quiet Harbor');
  });

  it('read-only (published) fields render only the book’s words', () => {
    const published = renderToStaticMarkup(
      <RichTextField value="<p>Printed text only.</p>" readOnly aiConfigured aiContext={{ categoryId: 'book', fieldKey: 'chapterText' }} />
    );
    expect(published).toContain('Printed text only.');
    expect(published).not.toContain('Edit');
    expect(published).not.toContain('contentEditable');
    expect(published).not.toContain('Tap Edit');
    expect(published).not.toMatch(/\d+\/\d+ words|\d+\/\d+</);

    const empty = renderToStaticMarkup(
      <RichTextField value="" readOnly aiContext={{ categoryId: 'book', fieldKey: 'epigraph' }} />
    );
    expect(empty).toBe('');
  });

  it('the block editor carries the professional tools, fit metre, and AI desk', () => {
    const rule = getTextSlotRule({ categoryId: 'book', fieldKey: 'chapterText', rows: 6, maxWords: 80 });
    const noAi = renderToStaticMarkup(
      <BlockTextEditor
        open
        value="<p>Some draft words.</p>"
        rule={rule}
        fieldLabel="Chapter manuscript"
        contextLine="A Quiet Harbor · Page 1"
        aiConfigured={false}
        aiContext={{ categoryId: 'book', fieldKey: 'chapterText', bookTitle: 'A Quiet Harbor' }}
        onCancel={() => {}}
        onDone={() => {}}
      />
    );
    expect(noAi).toContain('aria-label="Bold"');
    expect(noAi).toContain('aria-label="Italic"');
    expect(noAi).toContain('aria-label="Underline"');
    expect(noAi).toContain('aria-label="Align text left"');
    expect(noAi).toContain('aria-label="Align text center"');
    expect(noAi).toContain('aria-label="Align text right"');
    expect(noAi).toContain('Text color');
    expect(noAi).toContain('Fits best:');
    expect(noAi).toContain('Maximum 80 words');
    expect(noAi).toContain('Done — put on page');
    expect(noAi).toContain('AI is not connected yet');
    expect(noAi).not.toContain('Write with AI');

    const withAi = renderToStaticMarkup(
      <BlockTextEditor
        open
        value="<p>Some draft words.</p>"
        rule={rule}
        fieldLabel="Chapter manuscript"
        aiConfigured
        aiContext={{ categoryId: 'book', fieldKey: 'chapterText', bookTitle: 'A Quiet Harbor' }}
        onCancel={() => {}}
        onDone={() => {}}
      />
    );
    expect(withAi).toContain('Write with AI');
    expect(withAi).toContain('Improve my wording');
    expect(withAi).toContain('Make it fit');
    expect(withAi).toContain('Fix spelling &amp; grammar');
  });
});