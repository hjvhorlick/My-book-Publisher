import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WizardView from '../src/views/WizardView.jsx';

describe('chapter Index exploration and saving', () => {
  it('lets users explore/select a starting chapter without creating a saved book until the explicit save action', () => {
    const markup = renderToStaticMarkup(
      React.createElement(WizardView, {
        preselectedCategory: 'photobook',
        user: { name: 'Test Author' },
        wizardStep: 3,
        editingProject: null,
        onUpdateProject: async () => {},
        onCreateProject: async () => {}
      })
    );

    expect(markup).toContain('Add a title first; selecting a Chapter saves the book so you can return to finish it.');
    expect(markup).toContain('aria-label="Save the titled book and open Chapter 1 in Step 4"');
    expect((markup.match(/aria-label="Save the titled book and open Chapter/g) || []).length).toBe(5);
    expect(markup).toContain('id="new-book-title"');
    // Empty title box flashes for attention until the book is named.
    expect(markup).toMatch(/<input[^>]*id="new-book-title"[^>]*title-attention/);
    expect(markup).toContain('Start here — name your book');
    expect(markup).toContain('required=""');
    expect(markup).not.toContain('Save Book &amp; Open Chapter');
    expect(markup).not.toContain('Choose Chapter 1 as the starting chapter');
  });
});
