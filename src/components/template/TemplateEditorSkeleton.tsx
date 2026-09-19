import { memo } from "react";

/** Loading-state placeholder for the full-page popup editor (pages/TemplateEditorPage.tsx) —
 * mirrors editor/FullPageEditor.tsx's shell: top title/save bar, toolbar rows, a gray canvas
 * with an A4 sheet, and the field panel on the right. Also used as the Suspense fallback while
 * the lazily-loaded editor chunk downloads, so both loading phases look identical. Deliberately
 * separate from TemplateDetailSkeleton (different page, different layout). */
function TemplateEditorSkeleton() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-200 animate-pulse">
      {/* title / save bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-100 shadow-neu-header shrink-0">
        <div className="h-4 w-56 rounded-lg bg-surface-200" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 rounded-lg bg-surface-200" />
          <div className="h-8 w-8 rounded-lg bg-surface-200" />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {/* toolbar rows */}
          <div className="bg-surface-100 px-2 py-2 space-y-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: 14 }, (_, i) => (
                <div key={i} className={`h-7 rounded-lg bg-surface-200 ${i > 1 && i < 5 ? "w-24" : "w-7"}`} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="h-7 w-7 rounded-lg bg-surface-200" />
              ))}
            </div>
          </div>

          {/* canvas with one A4 sheet */}
          <div className="flex-1 overflow-hidden py-10">
            <div className="mx-auto w-198.5 max-w-[calc(100%-2rem)] h-full min-h-150 rounded-sm bg-surface-100 shadow-neu-raised px-16 py-14 space-y-4">
              <div className="h-4 w-1/3 rounded-lg bg-surface-200" />
              <div className="space-y-2.5 pt-2">
                <div className="h-3 w-full rounded-lg bg-surface-200" />
                <div className="h-3 w-11/12 rounded-lg bg-surface-200" />
                <div className="h-3 w-4/5 rounded-lg bg-surface-200" />
              </div>
              <div className="h-4 w-1/4 rounded-lg bg-surface-200 mt-6" />
              <div className="space-y-2.5 pt-2">
                <div className="h-3 w-full rounded-lg bg-surface-200" />
                <div className="h-3 w-3/4 rounded-lg bg-surface-200" />
              </div>
            </div>
          </div>
        </div>

        {/* field panel */}
        <div className="hidden lg:block w-80 shrink-0 p-4 space-y-4">
          <div className="rounded-2xl bg-surface-100 shadow-neu-raised p-6 space-y-3">
            <div className="h-4 w-16 rounded-lg bg-surface-200" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-12 w-full rounded-xl bg-surface-200" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(TemplateEditorSkeleton);
