import React from 'react';
import BookIndexPageRenderer from '../components/BookIndexPageRenderer';

export default function IndexStepView({ project, chapters = [], onSelectChapter }) {
  if (!project) return null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <BookIndexPageRenderer
        project={project}
        pages={chapters}
        editable={false}
        onSelectPage={(chapterIndex) => {
          const chapter = chapters[chapterIndex];
          if (chapter) onSelectChapter?.(chapter.id);
        }}
      />
    </main>
  );
}
