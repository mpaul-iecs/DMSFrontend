import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { PaginationPlus } from "tiptap-pagination-plus";

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
import { SlashCommandList } from "reactjs-tiptap-editor/slashcommand";

import "reactjs-tiptap-editor/style.css";
import "katex/dist/katex.min.css";
import "easydrawer/styles.css";
import "@excalidraw/excalidraw/index.css";

import toast from "../utilities/toast";
import { buildFullExtensions } from "./core/fullExtensions";
import { A4_PAGINATION_OPTIONS } from "./core/pagination";
import { SectionMarkerExtension } from "./SectionMarkerExtension";
import { composeSectionsToHtml, decomposeHtmlToSections } from "./composeSections";
import NativeToolbar from "./NativeToolbar";
import EditorTopBar from "./EditorTopBar";
import EditorSideRail from "./EditorSideRail";
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
 * Toolbar = the library's native controls (see NativeToolbar.tsx); chrome = EditorTopBar + EditorSideRail.
 */
export default function FullPageEditor({ initialSections, editable, onSave, fieldPanel, title, onReady }: FullPageEditorProps) {
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
        ...A4_PAGINATION_OPTIONS, // page geometry + gap colors — see core/pagination.ts
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

  // Report readiness one frame after the first commit so the caller's skeleton only comes
  // down once the editor is actually on screen, not merely constructed.
  useEffect(() => {
    if (!editor || !onReady) return;
    const frame = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(frame);
  }, [editor, onReady]);

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
      {/* App-shell layout, Google-Docs style: the app bar, toolbar and right rail are fixed pieces
          of a viewport-height column; ONLY the canvas below scrolls. overflow-hidden here is
          deliberate — it clips the shell to exactly one viewport so nothing (a wrapping toolbar
          row, a tall panel) can ever make the browser page itself scroll and drag the chrome away. */}
      <div className="flex flex-col h-screen overflow-hidden bg-surface-200">
        <EditorTopBar
          title={title}
          editable={editable}
          saving={isSaving}
          onSave={handleSave}
          onClose={handleClose}
        />

        {editable && (
          <div className="shrink-0 px-3 py-2 z-10">
            <div className="rounded-2xl bg-surface-100 shadow-neu-raised-sm px-2 py-1.5">
              <NativeToolbar />
            </div>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* `reactjs-tiptap-editor` is the class the library's own stylesheet scopes its
              content styling under (tables with resize handles/selected-cell state, images, task
              lists, hr…). Without it those rules never apply and e.g. tables render unstyled.
              pagination.css re-overrides the few rules that would fight the A4 page geometry. */}
          <div className="rm-canvas reactjs-tiptap-editor flex-1 min-w-0 overflow-auto py-6">
            <EditorContent editor={editor} />
          </div>

          {fieldPanel && <EditorSideRail fieldsPanel={fieldPanel(handleInsertAtCursor)} />}
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
