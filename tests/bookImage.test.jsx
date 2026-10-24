import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import BookImage from '../src/components/BookImage.jsx';
import TemplateVisualPreview from '../src/components/TemplateVisualPreview.jsx';
import { preloadImages, templatePreviewThumb } from '../src/utils/preloadImages.js';

describe('images load as finished pictures, not in layers', () => {
  it('hides the photo behind a shimmer until it has fully loaded', () => {
    const markup = renderToStaticMarkup(
      <BookImage src="/sample-artwork/nature-waterfall.jpg" alt="Waterfall" eager />
    );
    expect(markup).toContain('fq-img-skeleton');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('opacity-0');
    expect(markup).toContain('loading="eager"');
    expect(markup).toContain('decoding="async"');
  });

  it('template cards download light thumbnails with a responsive upgrade path', () => {
    expect(templatePreviewThumb('/template-previews/story-starlight-frame.jpg'))
      .toBe('/template-previews/thumbs/story-starlight-frame.jpg');
    const markup = renderToStaticMarkup(
      <TemplateVisualPreview template={{ name: 'Starlight', previewImage: '/template-previews/story-starlight-frame.jpg', accentColor: '#B45309', fontFamily: 'Lora' }} />
    );
    expect(markup).toContain('/template-previews/thumbs/story-starlight-frame.jpg 640w');
    expect(markup).toContain('/template-previews/story-starlight-frame.jpg 1376w');
    expect(markup).toContain('loading="lazy"');

    // Every full preview on disk must have a genuinely smaller thumbnail.
    const previewsDir = path.join(process.cwd(), 'public', 'template-previews');
    const originals = fs.readdirSync(previewsDir).filter((name) => name.endsWith('.jpg'));
    expect(originals.length).toBeGreaterThanOrEqual(48);
    for (const name of originals) {
      const thumbPath = path.join(previewsDir, 'thumbs', name);
      expect(fs.existsSync(thumbPath), `missing thumbnail for ${name}`).toBe(true);
      expect(fs.statSync(thumbPath).size, name).toBeLessThan(fs.statSync(path.join(previewsDir, name)).size);
    }
  });

  it('preloading is a safe no-op without a browser', () => {
    expect(() => preloadImages(['/sample-artwork/nature-ferns.jpg', 'data:image/png;base64,xx', ''])).not.toThrow();
  });
});
