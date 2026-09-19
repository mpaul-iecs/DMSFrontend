import { memo } from "react";
import Card from "../ui/Card";

/** Loading-state placeholder for TemplateFormPage.tsx in EDIT mode (`/templates/:id/edit`),
 * shown while the template is being fetched — mirrors the loaded layout: back button, title
 * row (name, page count, version, status, Add page, editor button), a collapsible page panel
 * with header + section editors on the left, and the field panel + live preview on the right.
 * Separate from TemplateDetailSkeleton/TemplateEditorSkeleton (different page layouts). */
function TemplateBuilderSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-16 rounded-lg bg-surface-200" />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-6 w-64 rounded-lg bg-surface-200" />
          <div className="h-4 w-14 rounded-lg bg-surface-200" />
          <div className="h-4 w-8 rounded-lg bg-surface-200" />
          <div className="h-6 w-16 rounded-full bg-surface-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-lg bg-surface-200" />
          <div className="h-9 w-9 rounded-lg bg-surface-200" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* left: one page panel with two section editors */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          <div className="rounded-xl bg-surface-100 shadow-neu-raised-sm p-3 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-4 w-4 rounded bg-surface-200" />
              <div className="h-4 w-16 rounded-lg bg-surface-200" />
              <div className="h-3 w-20 rounded-lg bg-surface-200" />
            </div>
            {[0, 1].map((i) => (
              <div key={i} className="rounded-xl shadow-neu-pressed-sm p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-48 rounded-xl bg-surface-200" />
                  <div className="h-4 w-14 rounded-lg bg-surface-200" />
                  <div className="ml-auto flex gap-3">
                    <div className="h-5 w-20 rounded-lg bg-surface-200" />
                    <div className="h-5 w-20 rounded-lg bg-surface-200" />
                  </div>
                </div>
                <div className="rounded-xl bg-surface-100 shadow-neu-pressed p-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 12 }, (_, j) => (
                      <div key={j} className={`h-7 rounded-lg bg-surface-200 ${j > 1 && j < 5 ? "w-24" : "w-7"}`} />
                    ))}
                  </div>
                  <div className="h-20 w-full rounded-lg bg-surface-200" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-28 rounded-lg bg-surface-200" />
                  <div className="h-8 w-32 rounded-lg bg-surface-200" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right: fields + live preview */}
        <div className="w-full lg:w-96 shrink-0 space-y-4">
          <Card>
            <div className="h-4 w-16 rounded-lg bg-surface-200 mb-3" />
            <div className="space-y-2.5">
              <div className="h-12 w-full rounded-xl bg-surface-200" />
              <div className="h-12 w-full rounded-xl bg-surface-200" />
            </div>
          </Card>
          <Card noPadding>
            <div className="px-4 pt-4 pb-2">
              <div className="h-4 w-32 rounded-lg bg-surface-200" />
            </div>
            <div className="px-2 pb-2">
              <div className="rounded-lg bg-surface-200/60 px-1.5 py-3 flex justify-center">
                <div className="w-[270px] h-[382px] rounded-sm bg-surface-200" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default memo(TemplateBuilderSkeleton);
