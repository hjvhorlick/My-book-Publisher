import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BOOK_CATEGORIES } from '../src/data/visualTemplatesCatalog.js';
import WizardView from '../src/views/WizardView.jsx';

describe('Step 2 template preview touch targets', () => {
  it('shows eight working template images for every book category', () => {
    const allPreviewSources = new Set();

    for (const category of BOOK_CATEGORIES) {
      const markup = renderToStaticMarkup(
        React.createElement(WizardView, {
          preselectedCategory: category.id,
          user: null,
          onCancel: () => {},
          onCreateProject: () => {}
        })
      );
      const imageSources = Array.from(
        markup.matchAll(/<img[^>]+src="([^"]+)"/g),
        (match) => match[1]
      );

      expect((markup.match(/aria-label="Choose /g) || []).length).toBe(8);
      expect((markup.match(/aria-label="Choose [^"]+ and continue to the chapter Index"/g) || []).length).toBe(8);
      expect(markup).not.toContain('Continue to Step 3');
      expect(imageSources).toHaveLength(8);
      expect(markup).not.toContain('Font:');
      expect(markup).not.toContain('Choose “');
      expect(markup).not.toContain('Includes 3 Matching Page Structures');

      for (const src of imageSources) {
        const assetPath = path.join(process.cwd(), 'public', src.replace(/^\//, ''));
        expect(fs.existsSync(assetPath), `${category.id}: ${src}`).toBe(true);
        allPreviewSources.add(src);
      }
    }

    expect(allPreviewSources.size).toBe(48);
  });
});
