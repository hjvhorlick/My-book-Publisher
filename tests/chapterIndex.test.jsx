import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IndexStepView from '../src/views/IndexStepView.jsx';

const project = {
  id: 'project-index-test',
  title: 'Collected Stories',
  publicationType: 'book',
  coverConfig: {}
};

const chapters = [
  { id: 'ch-1', title: 'Chapter 1' },
  { id: 'ch-2', title: 'The Quiet Harbor' }
];

describe('Step 3 Chapter Index', () => {
  it('shows chapter placeholders and saved chapter titles, without page rows', () => {
    const markup = renderToStaticMarkup(
      React.createElement(IndexStepView, { project, chapters, onSelectChapter: () => {} })
    );

    expect(markup).toContain('Chapter Index');
    expect(markup).toContain('Chapter 1');
    expect(markup).toContain('The Quiet Harbor');
    expect(markup).toContain('2 CHAPTERS');
    expect(markup).not.toContain('Page 1');
  });
});
