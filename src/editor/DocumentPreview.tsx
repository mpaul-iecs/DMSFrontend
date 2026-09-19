import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { PaginationPlus } from "tiptap-pagination-plus";
import "katex/dist/katex.min.css";
import { buildFullExtensions } from "./core/fullExtensions";
import { A4_PAGINATION_OPTIONS, A4_PAGE_WIDTH } from "./core/pagination";
import type { EditorSectionInput } from "./core/types";
import { IBMPlexSans400, IBMPlexSans600 } from "../components/ui/Text";
import Tooltip from "../components/ui/Tooltip";
import { sectionTitleHtml } from "./composeSections";
import "./editor.css";
import "./pagination.css";

interface DocumentPreviewProps {
  sections: EditorSectionInput[];
  /** Max height of the scrollable viewport (any CSS length). Defaults to 60vh. */
  maxHeight?: string;
  /** Upper bound for the fit-to-width scale (1 = real A4 size). Lower it to keep the page at a
   * fixed, smaller size inside a wide container (the page is then centered). Defaults to 1. */
  maxScale?: number;
  /** Rendered at the left of the zoom-controls row (e.g. the card title), so the title and the
   * zoom buttons share one row instead of costing two rows of height. */
  header?: ReactNode;
}

const RENDER_DEBOUNCE_MS = 250;

// User zoom, as a multiplier on top of the fit-to-width base scale (1 = as fitted).
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

interface PageGroup {
  page: number;
  html: string;
}

/**
 * Read-only, paginated A4 rendering of header + body sections + footer — the exact engine
 * `FullPageEditor` uses (same extensions, same `A4_PAGINATION_OPTIONS`), so page breaks and
 * header/footer placement match what the full editor shows. Scaled down with CSS `zoom` to
 * fit whatever width it's given (a page is 794px wide; the builder's side column is not).
 *
 * Multi-page: body sections are grouped by `EditorSectionInput.page` and each group gets its
 * OWN paginated editor, stacked vertically — an explicit page always starts on a fresh sheet
 * (matching the backend export's hard page break between pages) while a page whose content is
 * too long still flows onto extra sheets on its own. Header/footer repeat on every sheet.
 *
 * Like `FullPageEditor`, this pulls in `fullExtensions` (Excalidraw/Mermaid/KaTeX…), so it
 * must only be imported lazily — see `components/template/LazyDocumentPreview.tsx`. Domain-
 * agnostic on purpose: takes `EditorSectionInput[]`, never a template type.
 */
function DocumentPreview({ sections, maxHeight = "60vh", maxScale = 1, header }: DocumentPreviewProps) {
  const { headerHtml, footerHtml, pages } = useMemo(() => {
    const header = sections.find((s) => s.kind === "header")?.html ?? "";
    const footer = sections.find((s) => s.kind === "footer")?.html ?? "";
    const byPage = new Map<number, EditorSectionInput[]>();
    for (const s of sections.filter((x) => x.kind === "body")) {
      const key = s.page ?? 1;
      byPage.set(key, [...(byPage.get(key) ?? []), s]);
    }
    const groups: PageGroup[] = [...byPage.entries()]
      .sort(([a], [b]) => a - b)
      .map(([page, list]) => ({
        page,
        html: list
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s) => sectionTitleHtml(s.title) + (s.html || "<p></p>"))
          .join(""),
      }));
    return {
      headerHtml: header,
      footerHtml: footer,
      pages: groups.length ? groups : [{ page: 1, html: "<p></p>" }],
    };
  }, [sections]);

  // Fit the fixed-width A4 page into the available width (excluding the viewport's own
  // padding — ResizeObserver's contentRect is the content box). Never scales UP past `maxScale`.
  const viewportRef = useRef<HTMLDivElement>(null);
  const [baseScale, setScale] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(ZOOM_STEPS.indexOf(1));
  const scale = baseScale * ZOOM_STEPS[zoomIndex];
  const handleZoomOut = useCallback(() => setZoomIndex((i) => Math.max(0, i - 1)), []);
  const handleZoomIn = useCallback(() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1)), []);
  const handleZoomReset = useCallback(() => setZoomIndex(ZOOM_STEPS.indexOf(1)), []);

  // Drag-to-pan: press and drag on the page to scroll it in both directions (mainly for the
  // horizontal overflow once zoomed in). Mouse/pen only — touch already pans natively. The drag
  // state lives in a ref (no re-render per move); the grab/grabbing cursor is pure CSS
  // (`cursor-grab active:cursor-grabbing`).
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    const el = e.currentTarget;
    dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  }, []);
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.currentTarget.scrollLeft = drag.left - (e.clientX - drag.x);
    e.currentTarget.scrollTop = drag.top - (e.clientY - drag.y);
  }, []);
  const handlePointerEnd = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(maxScale, entry.contentRect.width / A4_PAGE_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxScale]);

  return (
    <div>
      {/* Zoom: steps the page size within the viewport (which scrolls both ways once the page is
          larger than it). The percentage is relative to a real A4 sheet; clicking it resets. */}
      <div className="flex items-center justify-between gap-2 pb-1.5">
        {header ?? <span />}
        <div className="flex items-center gap-1">
        <Tooltip content="Zoom out" placement="top">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomIndex === 0}
            aria-label="Zoom out"
            className="p-1 rounded-md text-gray-500 shadow-neu-raised-sm hover:shadow-neu-pressed-sm disabled:opacity-40 disabled:shadow-neu-raised-sm transition-shadow cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Reset zoom" placement="top">
          <button
            type="button"
            onClick={handleZoomReset}
            aria-label="Reset zoom"
            className="min-w-11 px-1.5 py-0.5 rounded-md text-gray-600 hover:shadow-neu-pressed-sm transition-shadow cursor-pointer"
          >
            <IBMPlexSans400 as="span" className="text-[11px]">
              {Math.round(scale * 100)}%
            </IBMPlexSans400>
          </button>
        </Tooltip>
        <Tooltip content="Zoom in" placement="top">
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            aria-label="Zoom in"
            className="p-1 rounded-md text-gray-500 shadow-neu-raised-sm hover:shadow-neu-pressed-sm disabled:opacity-40 disabled:shadow-neu-raised-sm transition-shadow cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="rm-canvas rm-preview overflow-auto overscroll-contain rounded-lg bg-surface-200 px-1.5 py-2 space-y-3 cursor-grab active:cursor-grabbing select-none"
        style={{ maxHeight }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {pages.map((p, i) => (
          <div key={p.page}>
            {pages.length > 1 && (
              <IBMPlexSans600 as="p" className="text-[11px] text-gray-500 mb-1.5">
                Page {i + 1} of {pages.length}
              </IBMPlexSans600>
            )}
            <PagePreview bodyHtml={p.html} headerHtml={headerHtml} footerHtml={footerHtml} scale={scale} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PagePreviewProps {
  bodyHtml: string;
  headerHtml: string;
  footerHtml: string;
  scale: number;
}

/** One explicit page: its own read-only paginated editor. Content updates are debounced —
 * the builder feeds this on every keystroke, and re-running pagination per keystroke would be
 * wasteful. */
const PagePreview = memo(function PagePreview({ bodyHtml, headerHtml, footerHtml, scale }: PagePreviewProps) {
  const editor = useEditor({
    editable: false,
    content: bodyHtml,
    extensions: [
      ...buildFullExtensions("Nothing to preview yet"),
      PaginationPlus.configure({
        ...A4_PAGINATION_OPTIONS,
        headerLeft: headerHtml,
        headerRight: "",
        footerLeft: footerHtml,
        footerRight: "",
      }),
    ],
  });

  // What's currently applied to the editor, so an unchanged value never re-renders pages.
  const appliedRef = useRef({ body: bodyHtml, header: headerHtml, footer: footerHtml });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const timer = setTimeout(() => {
      if (editor.isDestroyed) return;
      const applied = appliedRef.current;
      if (applied.body !== bodyHtml) editor.commands.setContent(bodyHtml, { emitUpdate: false });
      // Header/footer go through the extension's own command — .configure() alone doesn't
      // re-render them (same gotcha FullPageEditor documents).
      if (applied.header !== headerHtml || applied.footer !== footerHtml) {
        editor.commands.updateHeaderContent(headerHtml, "");
        editor.commands.updateFooterContent(footerHtml, "");
      }
      appliedRef.current = { body: bodyHtml, header: headerHtml, footer: footerHtml };
    }, RENDER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [editor, bodyHtml, headerHtml, footerHtml]);

  return (
    <div style={{ zoom: scale }}>
      <EditorContent editor={editor} />
    </div>
  );
});

export default memo(DocumentPreview);
