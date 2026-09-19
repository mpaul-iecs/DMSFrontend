import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { PaginationPlus, PAGE_SIZES } from "tiptap-pagination-plus";

import { RichTextProvider } from "reactjs-tiptap-editor";
import {
  RichTextBubbleCallout,
  RichTextBubbleCodeBlock,
  RichTextBubbleColumns,
  RichTextBubbleDrawer,
  RichTextBubbleExcalidraw,
  RichTextBubbleIframe,
  RichTextBubbleImage,
  RichTextBubbleImageGif,
  RichTextBubbleKatex,
  RichTextBubbleLink,
  RichTextBubbleMenuDragHandle,
  RichTextBubbleMermaid,
  RichTextBubbleTable,
  RichTextBubbleText,
  RichTextBubbleTwitter,
  RichTextBubbleVideo,
} from "reactjs-tiptap-editor/bubble";
import { RichTextDrawer } from "reactjs-tiptap-editor/drawer";
import { RichTextEmoji } from "reactjs-tiptap-editor/emoji";
import { RichTextExcalidraw } from "reactjs-tiptap-editor/excalidraw";
import { RichTextExportPdf } from "reactjs-tiptap-editor/exportpdf";
import { RichTextExportWord } from "reactjs-tiptap-editor/exportword";
import { RichTextFormatPainter } from "reactjs-tiptap-editor/formatpainter";
import { RichTextImageGif } from "reactjs-tiptap-editor/imagegif";
import { RichTextImportWord } from "reactjs-tiptap-editor/importword";
import { RichTextKatex } from "reactjs-tiptap-editor/katex";
import { RichTextMermaid } from "reactjs-tiptap-editor/mermaid";
import { RichTextSearchAndReplace } from "reactjs-tiptap-editor/searchandreplace";
import { SlashCommandList } from "reactjs-tiptap-editor/slashcommand";
import { RichTextTwitter } from "reactjs-tiptap-editor/twitter";

import "reactjs-tiptap-editor/style.css";
import "katex/dist/katex.min.css";
import "easydrawer/styles.css";
import "@excalidraw/excalidraw/index.css";

import { X, Save } from "lucide-react";
import Button from "../components/ui/Button";
import { IBMPlexSans600, IBMPlexSans400 } from "../components/ui/Text";
import toast from "../utilities/toast";
import { buildFullExtensions } from "./core/fullExtensions";
import { SectionMarkerExtension } from "./SectionMarkerExtension";
import { composeSectionsToHtml, decomposeHtmlToSections } from "./composeSections";
import Toolbar from "./toolbar/Toolbar";
import HeaderFooterDialog from "./HeaderFooterDialog";
import type { EditorSectionChange, FullPageEditorProps } from "./core/types";
import "./editor.css";
import "./pagination.css";

/**
 * The full-page popup editor's engine: the whole DMSEditor feature set (see
 * DMSFrontend/CLAUDE.md's "Editor" section), paginated like Word, composing header + body
 * sections + footer into one continuous document while remaining decomposable back into
 * individual sections on Save (see composeSections.ts). Deliberately generic — never
 * imports template types/thunks/services, so a future document-editing page can reuse it
 * (see core/types.ts's FullPageEditorProps).
 *
 * Five (plus a few more — see the "advanced" toolbar row below) DMSEditor features keep
 * `reactjs-tiptap-editor`'s own non-Tailwind UI rather than being re-themed: Excalidraw,
 * KaTeX, the emoji picker, Twitter embeds, Giphy, ExportPdf/ImportWord/ExportWord,
 * search-and-replace, Mermaid, Drawer, and format painter. Rebuilding custom UI around
 * these libraries' own complex internal state (canvases, file parsing, search decorations)
 * was judged disproportionate scope — everything else in the toolbar is fully re-themed.
 */
export default function FullPageEditor({ initialSections, editable, onSave, fieldPanel, title }: FullPageEditorProps) {
  const headerSection = useMemo(() => initialSections.find((s) => s.kind === "header"), [initialSections]);
  const footerSection = useMemo(() => initialSections.find((s) => s.kind === "footer"), [initialSections]);

  // Lazy-initialized once, then left alone — the live editor instance is the source of
  // truth after mount (same philosophy as DMSEditor's DocumentEditor), so a save-triggered
  // refetch of the owning template elsewhere in the app can't yank content back out here.
  const [composedBodyHtml] = useState(() => composeSectionsToHtml(initialSections));
  const [headerHtml, setHeaderHtml] = useState(() => headerSection?.html ?? "");
  const [footerHtml, setFooterHtml] = useState(() => footerSection?.html ?? "");
  const [editingHF, setEditingHF] = useState<"header" | "footer" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Diff baselines — updated after each successful save so a second save only resubmits
  // what changed since THAT save, not since the initial page load.
  const originalBodyHtmlRef = useRef(new Map(initialSections.filter((s) => s.kind === "body").map((s) => [s.id, s.html])));
  const originalHeaderHtmlRef = useRef(headerSection?.html ?? "");
  const originalFooterHtmlRef = useRef(footerSection?.html ?? "");

  const editor = useEditor({
    editable,
    content: composedBodyHtml,
    extensions: [
      ...buildFullExtensions(),
      SectionMarkerExtension,
      PaginationPlus.configure({
        ...PAGE_SIZES.A4,
        marginTop: 54,
        marginBottom: 54,
        contentMarginTop: 8,
        contentMarginBottom: 8,
        pageGap: 28,
        // The library's own default for pageBreakBackground is white — it's meant to blend
        // with the page, not stand out (it fills BOTH the unused remainder of a short page
        // AND the actual inter-page gap in one element). Matching it exactly to the canvas's
        // own background (--color-surface-200, #dde3ec) makes that fill invisible against
        // the canvas instead of reading as a stray colored block on short documents — only
        // the thin 1px pageGapBorderColor hairline (slightly darker) marks the real seam
        // between pages.
        pageGapBorderColor: "#c7d0dc",
        pageBreakBackground: "#dde3ec",
        headerLeft: headerHtml || "",
        headerRight: "",
        footerLeft: footerHtml || "",
        footerRight: "",
        onHeaderClick: editable ? () => setEditingHF("header") : undefined,
        onFooterClick: editable ? () => setEditingHF("footer") : undefined,
      }),
    ],
  });

  // Push header/footer through the extension's own command after the editor exists —
  // .configure() alone sometimes renders the pages before the header content is applied
  // (same gotcha DMSEditor's DocumentEditor.jsx documents).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.updateHeaderContent(headerHtml || "", "");
    editor.commands.updateFooterContent(footerHtml || "", "");
  }, [editor, headerHtml, footerHtml]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  const handleHFSave = useCallback(
    (nextHtml: string) => {
      if (editingHF === "header") setHeaderHtml(nextHtml);
      else if (editingHF === "footer") setFooterHtml(nextHtml);
      setEditingHF(null);
    },
    [editingHF],
  );
  const handleHFCancel = useCallback(() => setEditingHF(null), []);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      const bodyChanges = decomposeHtmlToSections(editor.getHTML()).filter(
        (s) => s.html !== (originalBodyHtmlRef.current.get(s.id) ?? ""),
      );
      const changes: EditorSectionChange[] = [...bodyChanges];
      if (headerSection && headerHtml !== originalHeaderHtmlRef.current) {
        changes.push({ id: headerSection.id, html: headerHtml });
      }
      if (footerSection && footerHtml !== originalFooterHtmlRef.current) {
        changes.push({ id: footerSection.id, html: footerHtml });
      }
      if (changes.length === 0) {
        toast.info("No changes to save");
        return;
      }
      await onSave?.(changes);
      changes.forEach((c) => originalBodyHtmlRef.current.set(c.id, c.html));
      if (headerSection) originalHeaderHtmlRef.current = headerHtml;
      if (footerSection) originalFooterHtmlRef.current = footerHtml;
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [editor, headerHtml, footerHtml, headerSection, footerSection, onSave]);

  const handleClose = useCallback(() => window.close(), []);

  const handleInsertAtCursor = useCallback(
    (text: string) => {
      editor?.chain().focus().insertContent(text).run();
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <RichTextProvider editor={editor}>
      {/* overflow-hidden here is deliberate, not decorative: it guarantees this shell is
          clipped to exactly one viewport height no matter what happens inside (a
          flex-wrap toolbar row growing taller than expected, etc.) — without it, any
          overflow spills past this box and the BROWSER PAGE itself becomes scrollable
          instead of just the canvas below, which drags the header/toolbar/field-panel out
          of view together as one long page rather than staying pinned as app chrome. */}
      <div className="flex flex-col h-screen overflow-hidden bg-surface-200">
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-100 shadow-neu-header shrink-0">
          <IBMPlexSans600 as="h1" className="text-sm text-gray-800 truncate">
            {title || "Document editor"}
          </IBMPlexSans600>
          <div className="flex items-center gap-2 shrink-0">
            {!editable && (
              <IBMPlexSans400 as="span" className="text-xs text-gray-400">
                Read-only
              </IBMPlexSans400>
            )}
            {editable && (
              <Button size="sm" onClick={handleSave} loading={isSaving}>
                <Save className="w-4 h-4" />
                Save
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {editable && (
              <>
                <Toolbar editor={editor} scope="full" />
                <div className="flex flex-wrap items-center gap-1 bg-surface-100 px-2 py-1.5 border-b border-surface-200/70">
                  <RichTextFormatPainter />
                  <RichTextSearchAndReplace />
                  <RichTextEmoji />
                  <RichTextImageGif />
                  <RichTextKatex />
                  <RichTextExcalidraw />
                  <RichTextMermaid />
                  <RichTextDrawer />
                  <RichTextTwitter />
                  <RichTextExportPdf />
                  <RichTextImportWord />
                  <RichTextExportWord />
                </div>
              </>
            )}
            <div className="rm-canvas flex-1 overflow-auto bg-surface-200 py-10">
              <EditorContent editor={editor} />
            </div>
          </div>

          {fieldPanel && (
            <div className="w-80 shrink-0 overflow-y-auto p-4 space-y-4">{fieldPanel(handleInsertAtCursor)}</div>
          )}
        </div>

        {editingHF && (
          <HeaderFooterDialog
            kind={editingHF}
            html={editingHF === "header" ? headerHtml : footerHtml}
            onCancel={handleHFCancel}
            onSave={handleHFSave}
          />
        )}

        <RichTextBubbleColumns />
        <RichTextBubbleLink />
        <RichTextBubbleImage />
        <RichTextBubbleVideo />
        <RichTextBubbleImageGif />
        <RichTextBubbleMermaid />
        <RichTextBubbleTable />
        <RichTextBubbleText />
        <RichTextBubbleTwitter />
        <RichTextBubbleCodeBlock />
        <RichTextBubbleIframe />
        <RichTextBubbleKatex />
        <RichTextBubbleExcalidraw />
        <RichTextBubbleDrawer />
        <RichTextBubbleCallout />
        <RichTextBubbleMenuDragHandle />

        <SlashCommandList />
      </div>
    </RichTextProvider>
  );
}
