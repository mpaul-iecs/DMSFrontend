import React, { useCallback, useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  ListItemNode, ListNode,
  INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { HeadingNode, QuoteNode, $createHeadingNode } from "@lexical/rich-text";
import { TableNode, TableCellNode, TableRowNode, INSERT_TABLE_COMMAND } from "@lexical/table";
import * as LexTable from "@lexical/table";   // row/column helpers are renamed between versions
import { $findMatchingParent } from "@lexical/utils";
import { $setBlocksType, $patchStyleText } from "@lexical/selection";
import {
  $getRoot, $getSelection, $isRangeSelection, $insertNodes, $createParagraphNode,
  FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND,
  INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND,
} from "lexical";
import { useEditorRegistry } from "../lib/editorRegistry";
import TableResizer, { useSelectedTable } from "./TableResizer";

/* Same contract as TiptapSlot: HTML in, HTML out, and the same command adapter,
   so one ribbon drives either engine. Note the placeholder lives on ContentEditable —
   Lexical moved it off RichTextPlugin after 0.21. */

const theme = {
  paragraph: "l-p",
  heading: { h3: "l-h3", h4: "l-h4" },
  list: { ul: "l-ul", ol: "l-ol", listitem: "l-li" },
  text: { bold: "l-b", italic: "l-i", underline: "l-u" },
};

class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    return this.state.err
      ? <div style={{ color: "#96233f", fontSize: 12 }}>Editor error: {String(this.state.err)}</div>
      : this.props.children;
  }
}

export default function LexicalSlot({ block, html, onChange, editable = true }) {
  const initialConfig = {
    namespace: `slot-${block.key}`,
    theme,
    editable,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, TableNode, TableCellNode, TableRowNode],
    onError: (e) => console.error("[lexical]", e),
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <SlotShell block={block} html={html} onChange={onChange} />
    </LexicalComposer>
  );
}

function SlotShell({ block, html, onChange }) {
  const [editor] = useLexicalComposerContext();
  const regionRef = useRef(null);
  const tableBox = useSelectedTable(regionRef, [editor]);

  /* TableCellNode.setWidth / TableRowNode.setHeight are the Lexical equivalents of
     Tiptap's colwidth attribute, so the same overlay drives both engines. */
  const onResize = useCallback(({ widths, heights }) => {
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      const table = $findMatchingParent(sel.anchor.getNode(), (n) => !!LexTable.$isTableNode?.(n));
      if (!table) return;
      table.getChildren().forEach((row, r) => {
        if (heights && heights[r] != null && typeof row.setHeight === "function") row.setHeight(heights[r]);
        if (!widths || typeof row.getChildren !== "function") return;
        row.getChildren().forEach((cell, c) => {
          if (widths[c] != null && typeof cell.setWidth === "function") cell.setWidth(widths[c]);
        });
      });
    });
  }, [editor]);

  return (
    <div ref={regionRef}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative" }}>
      <span className="slot-tag">lexical · {block.key}</span>
      <TableResizer box={tableBox} onResize={onResize} />

      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="region"
            aria-placeholder={`Write ${block.label}…`}
            placeholder={<div className="ph">Write {block.label}…</div>}
          />
        }
        ErrorBoundary={Boundary}
      />
      <HistoryPlugin />
      <ListPlugin />
      <TablePlugin />
      <LoadHtml html={html} />
      <RegisterApi blockKey={block.key} />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState, editor) =>
          editorState.read(() => onChange($generateHtmlFromNodes(editor, null)))
        }
      />
    </div>
  );
}

/* Parse stored HTML in once. root.clear() first keeps this idempotent under
   React StrictMode's double-invoked effects. */
function LoadHtml({ html }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!html) return;
    editor.update(() => {
      const dom = new DOMParser().parseFromString(html, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.select();
      $insertNodes(nodes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function RegisterApi({ blockKey }) {
  const [editor] = useLexicalComposerContext();
  const registry = useEditorRegistry();

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;
    const onFocus = () =>
      registry?.register({ key: blockKey, engine: "lexical", api: makeApi(editor) });
    root.addEventListener("focus", onFocus);
    return () => root.removeEventListener("focus", onFocus);
  }, [editor, blockKey, registry]);

  return null;
}

function makeApi(editor) {
  const withSelection = (fn) => {
    editor.focus();
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) fn(sel);
    });
  };
  const cmd = (command, payload) => { editor.focus(); editor.dispatchCommand(command, payload); };

  return {
    isActive: () => false,               // Lexical has no cheap isActive; ribbon shows no state
    bold: () => cmd(FORMAT_TEXT_COMMAND, "bold"),
    italic: () => cmd(FORMAT_TEXT_COMMAND, "italic"),
    underline: () => cmd(FORMAT_TEXT_COMMAND, "underline"),
    heading: () => withSelection((sel) => $setBlocksType(sel, () => $createHeadingNode("h3"))),
    paragraph: () => withSelection((sel) => $setBlocksType(sel, () => $createParagraphNode())),
    bullet: () => cmd(INSERT_UNORDERED_LIST_COMMAND, undefined),
    ordered: () => cmd(INSERT_ORDERED_LIST_COMMAND, undefined),
    align: (a) => cmd(FORMAT_ELEMENT_COMMAND, a),
    color: (c) => withSelection((sel) => $patchStyleText(sel, { color: c })),
    highlight: (c) => withSelection((sel) => $patchStyleText(sel, { "background-color": c || null })),
    fontFamily: (f) => withSelection((sel) => $patchStyleText(sel, { "font-family": f })),
    fontSize: (px) => withSelection((sel) => $patchStyleText(sel, { "font-size": `${px}px` })),
    indent: (dir) => cmd(dir > 0 ? INDENT_CONTENT_COMMAND : OUTDENT_CONTENT_COMMAND, undefined),
    border: (css) => withSelection((sel) => {
      sel.getNodes().forEach((n) => {
        const el = n.getTopLevelElement?.();
        if (el && typeof el.setStyle === "function") {
          el.setStyle(css ? `${css};padding:3px 6px` : "");
        }
      });
    }),
    currentBorder: () => null,
    /* Lexical has no isActive(); read the current editor state synchronously instead,
       which is what makes the table controls light up in this engine too. */
    inTable: () => {
      let found = false;
      try {
        editor.getEditorState().read(() => {
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) return;
          found = !!$findMatchingParent(sel.anchor.getNode(), (n) => !!LexTable.$isTableCellNode?.(n));
        });
      } catch { /* editor not mounted yet */ }
      return found;
    },
    table: (rows = 3, cols = 3, header = true) =>
      cmd(INSERT_TABLE_COMMAND, { columns: String(cols), rows: String(rows), includeHeaders: header }),
    /* @lexical/table renamed these between versions (the __EXPERIMENTAL suffix comes and
       goes), so resolve by name at call time rather than importing a fixed symbol. */
    tableOp: (op) => {
      const names = {
        rowBefore: ["$insertTableRow__EXPERIMENTAL", "$insertTableRow"],
        rowAfter: ["$insertTableRow__EXPERIMENTAL", "$insertTableRow"],
        delRow: ["$deleteTableRow__EXPERIMENTAL", "$deleteTableRow"],
        colBefore: ["$insertTableColumn__EXPERIMENTAL", "$insertTableColumn"],
        colAfter: ["$insertTableColumn__EXPERIMENTAL", "$insertTableColumn"],
        delCol: ["$deleteTableColumn__EXPERIMENTAL", "$deleteTableColumn"],
      };
      editor.focus();

      if (op === "delTable") {
        editor.update(() => {
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) return;
          const table = $findMatchingParent(sel.anchor.getNode(), (n) => !!LexTable.$isTableNode?.(n));
          table?.remove();
        });
        return;
      }

      if (op === "merge" || op === "headerRow") {
        console.warn(`[lexical] "${op}" has no stable public API in @lexical/table — Tiptap only.`);
        return;
      }

      const fn = (names[op] || []).map((n) => LexTable[n]).find(Boolean);
      if (!fn) { console.warn(`[lexical] no helper found for "${op}"`); return; }
      const after = op === "rowAfter" || op === "colAfter";
      editor.update(() => { try { fn(after); } catch (e) { console.warn("[lexical table]", e); } });
    },
    /* Move the whole top-level block up or down — much simpler here than in
       ProseMirror, because Lexical nodes expose sibling insertion directly. */
    moveBlock: (dir) => {
      editor.focus();
      editor.update(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;
        const top = sel.anchor.getNode().getTopLevelElement();
        if (!top) return;
        const sib = dir < 0 ? top.getPreviousSibling() : top.getNextSibling();
        if (!sib) return;
        dir < 0 ? sib.insertBefore(top) : sib.insertAfter(top);
      });
    },
    clear: () => withSelection((sel) =>
      $patchStyleText(sel, { color: null, "background-color": null, "font-size": null, "font-family": null })),
    undo: () => cmd(UNDO_COMMAND, undefined),
    redo: () => cmd(REDO_COMMAND, undefined),
  };
}