import React, { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as UnderlinePkg from "@tiptap/extension-underline";
import * as TextAlignPkg from "@tiptap/extension-text-align";
import * as TextStylePkg from "@tiptap/extension-text-style";
import * as ColorPkg from "@tiptap/extension-color";
import * as HighlightPkg from "@tiptap/extension-highlight";
import * as PlaceholderPkg from "@tiptap/extension-placeholder";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import {
  FontSize, FontFamily, BlockAttributes, TableRowHeight, LineHeight,
  ResizableImage, TextBox, SearchHighlight, getSearchInfo,
} from "./tiptapExtensions";
import TableResizer, { useSelectedTable } from "./TableResizer";
import { useEditorRegistry } from "../lib/editorRegistry";

/* Tiptap moved several extensions between default and named exports in v3, and
   folded Underline/Link into StarterKit. Resolving both shapes keeps this file
   working on v2 and v3 alike. */
const pick = (pkg, name) => pkg[name] ?? pkg.default ?? pkg;

const Underline   = pick(UnderlinePkg, "Underline");
const TextAlign   = pick(TextAlignPkg, "TextAlign");
const TextStyle   = pick(TextStylePkg, "TextStyle");
const Color       = pick(ColorPkg, "Color");
const Highlight   = pick(HighlightPkg, "Highlight");
const Placeholder = pick(PlaceholderPkg, "Placeholder");

export default function TiptapSlot({ block, html, onChange, editable = true }) {
  const registry = useEditorRegistry();
  const regionRef = useRef(null);
  /* The last HTML this slot emitted upward. Lets the resync effect below tell an
     external content change (a fresh document load, a slot remount) apart from the
     echo of our own edit coming back through the `html` prop after a draft flush. */
  const lastEmitted = useRef(html || "");
  const emit = useCallback((next) => { lastEmitted.current = next; onChange(next); }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,          // React 19 / StrictMode friendly (ignored on v2)
    editable,
    extensions: [
      // StarterKit.configure({ heading: { levels: [3, 4] }, underline: false, link: false }),
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] }, underline: false, link: false }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      BlockAttributes,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell, TableRowHeight,
      LineHeight,
      ResizableImage,
      TextBox,
      SearchHighlight,
      Placeholder.configure({ placeholder: `Write ${block.label}…` }),
    ],
    content: html || "",
    onUpdate: ({ editor }) => emit(editor.getHTML()),
    /* Register on create too, not just focus — otherwise the shared ribbon has no editor
       to drive until the user happens to click into this exact section, which reads as
       "none of the buttons work". Focus/selection just keep the ribbon pointed at the
       section the caret is actually in. */
    onCreate: ({ editor }) => registry?.register({ key: block.key, engine: "tiptap", api: makeApi(editor) }),
    onFocus: ({ editor }) => registry?.register({ key: block.key, engine: "tiptap", api: makeApi(editor) }),
    /* Buffer the newest HTML the instant focus leaves, so a remount or a mode switch
       that happens before the 1.2s idle flush can't drop edits made since the last one. */
    onBlur: ({ editor }) => emit(editor.getHTML()),
  });

  useEffect(() => () => registry?.clear?.(block.key), [block.key]); // eslint-disable-line

  /* Re-hydrate from the `html` prop ONLY into an editor that has nothing in it — i.e. a
     slot that just remounted and whose useEditor init missed the content. Once the editor
     holds anything the user can see (their text, an image, a shape) we never replace it
     from the prop: a draft-flush round-trip that the server normalises would otherwise
     yank freshly-inserted content back out from under them. */
  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return;
    const incoming = html || "";
    if (incoming === lastEmitted.current || incoming === editor.getHTML()) return;
    if (!editor.isEmpty) return;
    lastEmitted.current = incoming;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, html]);

  const tableBox = useSelectedTable(regionRef, [editor, editable]);
  const onResize = useCallback((dims) => {
    if (editor && editable) resizeTable(editor, dims);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <>
      <span className="slot-tag">tiptap · {block.key}</span>
      <div className="region-wrap" ref={regionRef}>
        <EditorContent editor={editor} className="region" />
        {editable && <TableResizer box={tableBox} onResize={onResize} />}
      </div>
    </>
  );
}

/* Writes absolute column widths and row heights into the table node. One transaction
   per animation frame while dragging — enough for a prototype, though it does fill the
   undo stack; a production build would coalesce these into a single step on mouseup. */
function resizeTable(editor, { widths, heights }) {
  const { state, view } = editor;
  const { $from } = state.selection;

  let tableNode = null, tablePos = null;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "table") {
      tableNode = $from.node(d);
      tablePos = $from.before(d);
      break;
    }
  }
  if (!tableNode) return;

  const tr = state.tr;
  tableNode.forEach((row, rowOffset, rowIndex) => {
    const rowPos = tablePos + 1 + rowOffset;
    if (heights && heights[rowIndex] != null) {
      tr.setNodeMarkup(rowPos, undefined, { ...row.attrs, rowHeight: heights[rowIndex] });
    }
    if (widths) {
      row.forEach((cell, cellOffset, cellIndex) => {
        const w = widths[cellIndex];
        if (w == null) return;
        tr.setNodeMarkup(rowPos + 1 + cellOffset, undefined, { ...cell.attrs, colwidth: [w] });
      });
    }
  });

  if (tr.docChanged) view.dispatch(tr.setMeta("addToHistory", false));
}

/* The command surface the shared ribbon talks to. Every call re-focuses first so
   the ribbon can be clicked without losing the selection. */
function makeApi(editor) {
  const chain = () => editor.chain().focus();
  const blockType = () => (editor.isActive("heading") ? "heading" : "paragraph");

  return {
    isActive: (name, attrs) => editor.isActive(name, attrs),
    bold: () => chain().toggleBold().run(),
    italic: () => chain().toggleItalic().run(),
    underline: () => chain().toggleUnderline().run(),
    heading: () => chain().toggleHeading({ level: 3 }).run(),
    bullet: () => chain().toggleBulletList().run(),
    ordered: () => chain().toggleOrderedList().run(),
    align: (a) => chain().setTextAlign(a).run(),
    color: (c) => chain().setColor(c).run(),
    highlight: (c) => (c ? chain().setHighlight({ color: c }).run() : chain().unsetHighlight().run()),
    fontFamily: (f) => chain().setMark("textStyle", { fontFamily: f }).run(),
    fontSize: (px) => chain().setMark("textStyle", { fontSize: `${px}px` }).run(),
    indent: (dir) => {
      const type = blockType();
      const cur = editor.getAttributes(type).indent || 0;
      chain().updateAttributes(type, { indent: Math.max(0, Math.min(6, cur + dir)) }).run();
    },
    border: (css) => {
      const type = blockType();
      chain().updateAttributes(type, { borderCss: css || null }).run();
    },
    currentBorder: () => editor.getAttributes(blockType()).borderCss || null,
    lineSpacing: (v) => {
      const type = blockType();
      chain().updateAttributes(type, { lineHeight: v || null }).run();
    },
    currentLineSpacing: () => editor.getAttributes(blockType()).lineHeight || "",
    hr: () => chain().setHorizontalRule().run(),
    /* text box / shape */
    shape: (kind) => chain().insertTextBox(kind || "rect").run(),
    inShape: () => editor.isActive("textBox"),
    shapeWidth: (w) => chain().setTextBoxWidth(w || null).run(),
    shapeKind: (s) => chain().setTextBoxShape(s).run(),
    /* find & replace — operate on this editor (the one the ribbon is driving) */
    /* no .focus() here — typing in the ribbon's Find box must not yank the caret back */
    search: (q, opts) => editor.chain().setSearch(q || "", opts || {}).run(),
    searchClear: () => editor.chain().setSearch("", {}).run(),
    searchNext: () => editor.chain().focus().searchGo(1).run(),
    searchPrev: () => editor.chain().focus().searchGo(-1).run(),
    searchInfo: () => getSearchInfo(editor),
    replaceOne: (r) => editor.chain().focus().replaceCurrent(r).searchGo(1).run(),
    replaceAll: (r) => editor.chain().focus().replaceAllMatches(r).run(),
    /* Image: src is either a real URL or a data: URI from an uploaded file. */
    image: (src, alt = "") => { if (src) chain().setImage({ src, alt }).run(); },
    inImage: () => editor.isActive("image"),
    imageWidth: (w) => chain().updateAttributes("image", { width: w || null }).run(),
    inTable: () => editor.isActive("table"),
    table: (rows = 3, cols = 3, header = true) =>
      chain().insertTable({ rows, cols, withHeaderRow: header }).run(),
    tableOp: (op) => {
      const map = {
        rowBefore: (c) => c.addRowBefore(), rowAfter: (c) => c.addRowAfter(),
        delRow: (c) => c.deleteRow(),
        colBefore: (c) => c.addColumnBefore(), colAfter: (c) => c.addColumnAfter(),
        delCol: (c) => c.deleteColumn(),
        headerRow: (c) => c.toggleHeaderRow(), merge: (c) => c.mergeOrSplit(),
        delTable: (c) => c.deleteTable(),
      };
      if (map[op]) map[op](chain()).run();
    },
    clear: () => chain().unsetAllMarks().clearNodes().run(),
    /* Move the whole top-level block (a table, or a bordered paragraph) up or down.
       ProseMirror has no built-in for this, so it is a delete + re-insert in one tr. */
    moveBlock: (dir) => editor.commands.command(({ tr, state, dispatch }) => {
      const { $from } = state.selection;
      const doc = state.doc;
      const index = $from.index(0);
      const start = $from.before(1);
      const node = doc.nodeAt(start);
      if (!node) return false;

      if (dir < 0) {
        if (index === 0) return false;
        const prevStart = start - doc.child(index - 1).nodeSize;
        if (dispatch) dispatch(tr.delete(start, start + node.nodeSize).insert(prevStart, node));
      } else {
        if (index >= doc.childCount - 1) return false;
        const nextSize = doc.child(index + 1).nodeSize;
        if (dispatch) dispatch(tr.delete(start, start + node.nodeSize).insert(start + nextSize, node));
      }
      return true;
    }),
    undo: () => chain().undo().run(),
    redo: () => chain().redo().run(),
  };
}