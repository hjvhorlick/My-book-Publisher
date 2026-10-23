import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function ReviewQualityView({
  project,
  onNavigate,
  onOpenChapterInStudio
}) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);

  const runReview = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/api/publishing/${project.id}/review`);
      setReview(data.review);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReview();
  }, [project?.id]);

  const stats = review?.statistics || {};
  const issues = review?.issues || [];
  const recommendations = review?.recommendations || [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-8 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-400">
            Pre-Publication Diagnostic &amp; Editorial Audit
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
            Manuscript Quality &amp; Review
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Inspect structural checks, heading consistency, placeholder markers, asset rights, and manuscript telemetry. This audit never alters your manuscript automatically.
          </p>
        </div>

        <button
          onClick={runReview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Scanning Manuscript...' : 'Re-Run Quality Audit'}</span>
        </button>
      </div>

      {/* Telemetry & Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <span className="text-stone-400 block">Readiness Score</span>
          <strong className="font-serif text-2xl text-amber-900 dark:text-amber-400">
            {review?.summary?.publicationReadinessScore ?? 100}%
          </strong>
        </div>
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <span className="text-stone-400 block">Total Word Count</span>
          <strong className="font-serif text-2xl text-stone-900 dark:text-stone-100">
            {(stats.totalWords || 0).toLocaleString()}
          </strong>
        </div>
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <span className="text-stone-400 block">Estimated Print Pages</span>
          <strong className="font-serif text-2xl text-stone-900 dark:text-stone-100">
            ~{stats.estimatedPages || 1}
          </strong>
        </div>
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <span className="text-stone-400 block">Reading Time</span>
          <strong className="font-serif text-2xl text-stone-900 dark:text-stone-100">
            ~{stats.readingTimeMinutes || 1} min
          </strong>
        </div>
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <span className="text-stone-400 block">Avg Sentence Length</span>
          <strong className="font-serif text-2xl text-stone-900 dark:text-stone-100">
            {stats.avgSentenceLength || 0} wds
          </strong>
        </div>
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <span className="text-stone-400 block">Chapters Complete</span>
          <strong className="font-serif text-2xl text-stone-900 dark:text-stone-100">
            {stats.completedChapters || 0} / {stats.totalChapters || 0}
          </strong>
        </div>
      </div>

      {/* Two-Column Findings: Actual Issues vs Optional Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Actual Problems */}
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
              Issues Requiring Attention ({issues.length})
            </h2>
            <span className="text-[11px] text-stone-400">Empty required chapters, placeholders, duplicate headings</span>
          </div>

          {issues.length === 0 ? (
            <div className="p-6 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-semibold">No structural or editorial errors found!</div>
                <div className="text-[11px] opacity-80">Your manuscript chapters, headings, and assets passed all core checks.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200 text-[10px] font-bold uppercase">
                      {item.category}
                    </span>
                    <div className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 mt-1">
                      {item.title}
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (item.chapterId) {
                        onOpenChapterInStudio(item.chapterId);
                      } else if (item.targetView) {
                        onNavigate(item.targetView);
                      }
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-900 text-white font-medium flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional Recommendations */}
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              Optional Recommendations ({recommendations.length})
            </h2>
            <span className="text-[11px] text-stone-400">Non-blocking suggestions</span>
          </div>

          {recommendations.length === 0 ? (
            <div className="p-6 rounded-xl bg-stone-50 dark:bg-stone-900 text-stone-500">
              No additional recommendations at this time.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map(rec => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/50 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold uppercase">
                      {rec.category} • Optional
                    </span>
                    <div className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 mt-1">
                      {rec.title}
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (rec.chapterId) {
                        onOpenChapterInStudio(rec.chapterId);
                      } else if (rec.targetView) {
                        onNavigate(rec.targetView);
                      }
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chapter Pacing & Length Distribution */}
      {stats.chapterStats && stats.chapterStats.length > 0 && (
        <div className="bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
          <div className="flex items-center gap-2 font-serif font-bold text-lg">
            <BarChart3 className="w-5 h-5 text-amber-800" />
            Chapter Length &amp; Pacing Balance
          </div>
          <div className="space-y-2.5">
            {stats.chapterStats.map(cs => {
              const pct = Math.min(100, Math.round((cs.wordCount / Math.max(1, cs.targetWords)) * 100));
              return (
                <div key={cs.id} className="flex items-center gap-4">
                  <button
                    onClick={() => onOpenChapterInStudio(cs.id)}
                    className="w-64 truncate text-left font-medium text-stone-800 dark:text-stone-200 hover:text-amber-800"
                  >
                    {cs.orderIndex}. {cs.title}
                  </button>
                  <div className="flex-1 h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-800 dark:bg-amber-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-32 text-right text-stone-500">
                    {cs.wordCount.toLocaleString()} / {cs.targetWords.toLocaleString()} wds
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
