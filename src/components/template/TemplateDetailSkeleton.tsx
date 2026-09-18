import { memo } from "react";
import Card from "../ui/Card";

/** Loading-state placeholder for TemplateDetailPage.tsx, matching its real layout's card
 * positions/proportions (header, status stepper, document preview, sidebar cards) closely
 * enough that the loading→loaded transition doesn't visibly jump. Replaces the old plain
 * Loader2-spinner full-page branch — a skeleton this close to the loaded shape reads as
 * "content is arriving here" rather than a generic blocking spinner. */
function TemplateDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-16 rounded-lg bg-surface-200" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="h-6 w-64 rounded-lg bg-surface-200" />
          <div className="h-4 w-40 rounded-lg bg-surface-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-24 rounded-full bg-surface-200" />
          <div className="h-9 w-9 rounded-lg bg-surface-200" />
          <div className="h-9 w-9 rounded-lg bg-surface-200" />
          <div className="h-9 w-20 rounded-lg bg-surface-200" />
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="h-8 w-8 rounded-full bg-surface-200" />
          <div className="h-0.5 flex-1 max-w-20 bg-surface-200" />
          <div className="h-8 w-8 rounded-full bg-surface-200" />
          <div className="h-0.5 flex-1 max-w-20 bg-surface-200" />
          <div className="h-8 w-8 rounded-full bg-surface-200" />
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="lg:w-fit space-y-4">
          <Card className="max-w-fit mx-auto lg:mx-0">
            <div className="h-4 w-40 rounded-lg bg-surface-200 mb-3" />
            <div className="bg-surface-200/60 rounded-xl p-3">
              <div className="w-125 max-w-full h-125 rounded-sm bg-surface-200" />
            </div>
          </Card>
          <div className="flex gap-2">
            <div className="h-8 w-32 rounded-lg bg-surface-200" />
            <div className="h-8 w-24 rounded-lg bg-surface-200" />
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full space-y-4">
          <Card>
            <div className="h-4 w-24 rounded-lg bg-surface-200 mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded-lg bg-surface-200" />
              <div className="h-3 w-1/2 rounded-lg bg-surface-200" />
              <div className="h-3 w-2/3 rounded-lg bg-surface-200" />
            </div>
          </Card>
          <Card>
            <div className="h-4 w-32 rounded-lg bg-surface-200 mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded-lg bg-surface-200" />
              <div className="h-3 w-2/3 rounded-lg bg-surface-200" />
            </div>
          </Card>
          <Card>
            <div className="h-4 w-28 rounded-lg bg-surface-200 mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded-lg bg-surface-200" />
              <div className="h-3 w-3/5 rounded-lg bg-surface-200" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default memo(TemplateDetailSkeleton);
