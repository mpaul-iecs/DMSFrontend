import { memo, Suspense, useMemo, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import Card from "../ui/Card";
import { IBMPlexSans400, IBMPlexSans600 } from "../ui/Text";
import LazyDocumentPreview from "./LazyDocumentPreview";
import { PREVIEW_MAX_HEIGHT, PREVIEW_MAX_SCALE } from "./previewSize";
import type { EditorSectionInput } from "../../editor";

interface TemplateDocumentPreviewCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  sections: EditorSectionInput[];
}

/**
 * The template module's read-only, zoomable, multi-page document preview as a ready-made card —
 * used by TemplateFormPage ("Live preview") and TemplateDetailPage ("Document preview") so both
 * get identical size, padding, loading state and zoom/pan behavior from one place. The
 * paginated engine itself is `editor/DocumentPreview` (lazy — it drags in the full Tiptap
 * extension set); this wraps it in a Card + Suspense and feeds it the shared compact size from
 * `previewSize.ts`. The title sits in the zoom-controls row to keep the card short.
 */
function TemplateDocumentPreviewCard({ title, subtitle, icon, sections }: TemplateDocumentPreviewCardProps) {
  const header = useMemo(
    () => (
      <div className="flex items-center gap-2 min-w-0 px-0.5">
        {icon}
        <IBMPlexSans600 as="h2" className="text-sm text-gray-700 truncate">
          {title}
        </IBMPlexSans600>
        {subtitle && (
          <IBMPlexSans400 as="span" className="text-xs text-gray-400 truncate">
            {subtitle}
          </IBMPlexSans400>
        )}
      </div>
    ),
    [icon, title, subtitle],
  );

  return (
    <Card noPadding>
      <div className="p-2.5">
        <Suspense
          fallback={
            <div>
              <div className="pb-1.5">{header}</div>
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          }
        >
          <LazyDocumentPreview
            sections={sections}
            header={header}
            maxHeight={PREVIEW_MAX_HEIGHT}
            maxScale={PREVIEW_MAX_SCALE}
          />
        </Suspense>
      </div>
    </Card>
  );
}

export default memo(TemplateDocumentPreviewCard);
