import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DashboardView from '../src/views/DashboardView.jsx';

describe('Step 1 touch-friendly book type cards', () => {
  it('uses each large tablet image as the only visible category action', () => {
    const markup = renderToStaticMarkup(
      React.createElement(DashboardView, {
        projects: [],
        activeProject: null,
        onSelectProject: () => {},
        onStartNewWizard: () => {},
        onDeleteProject: () => {}
      })
    );

    expect((markup.match(/aria-label="Choose /g) || []).length).toBe(6);
    expect(markup).not.toContain('See 8 Styles');
    expect(markup).not.toContain('Font:');
    expect(markup).not.toContain('Choose Photo Book &amp; See 8 Styles');
  });

  it('lists titled saved books only and explains how to make the first one', () => {
    const render = (projects) => renderToStaticMarkup(
      React.createElement(DashboardView, {
        projects,
        activeProject: null,
        onSelectProject: () => {},
        onStartNewWizard: () => {},
        onDeleteProject: () => {}
      })
    );

    const markup = render([
      { id: 'titled', title: 'The Blue Orchard', publicationType: 'photobook' },
      { id: 'untitled', title: 'Untitled Publication', publicationType: 'photobook' },
      { id: 'generated', title: 'My Photo Book', publicationType: 'photobook' },
      { id: 'blank', title: '   ', publicationType: 'photobook' }
    ]);

    expect(markup).toContain('Saved Books');
    expect(markup).toContain('The Blue Orchard');
    expect(markup).not.toContain('Untitled Publication');
    expect(markup).not.toContain('My Photo Book');
    expect(markup).toContain('1 saved');

    const emptyMarkup = render([]);
    expect(emptyMarkup).toContain('No titled books yet.');
    expect(emptyMarkup).toContain('tap a Chapter button');
  });
});
