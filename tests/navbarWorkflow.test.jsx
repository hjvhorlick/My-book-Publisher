import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Navbar from '../src/components/Navbar.jsx';

describe('global workflow stepper', () => {
  it('renders all five short step buttons and highlights the active step', () => {
    const markup = renderToStaticMarkup(
      React.createElement(Navbar, {
        user: null,
        activeProject: { id: 'book-1', title: 'Sample Book', publicationType: 'book' },
        currentView: 'writing',
        wizardStep: 2,
        wizardMode: 'edit',
        onNavigateStep: () => {}
      })
    );

    expect(markup).toContain('aria-label="Book workflow steps"');
    expect(markup).toContain('Start');
    expect(markup).toContain('Style');
    expect(markup).toContain('Index');
    expect(markup).toContain('Pages');
    expect(markup).toContain('Export');
    expect((markup.match(/aria-current="step"/g) || []).length).toBe(1);
    expect(markup).toContain('aria-label="Step 4: Pages. Write &amp; add"');
  });

  it('lets the wizard switch between template and chapter planning without lower duplicate step cards', () => {
    const markup = renderToStaticMarkup(
      React.createElement(Navbar, {
        user: null,
        activeProject: null,
        currentView: 'wizard',
        wizardStep: 3,
        wizardMode: 'create',
        onNavigateStep: () => {}
      })
    );

    expect(markup).toContain('aria-current="step"');
    expect((markup.match(/aria-current="step"/g) || []).length).toBe(1);
    expect(markup).toContain('aria-label="Step 3: Index. Chapters"');
  });
});
