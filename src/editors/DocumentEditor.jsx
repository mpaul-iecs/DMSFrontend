import React, { useEffect, useRef } from "react";
import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { ListItem } from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { Dropcursor, Gapcursor, Placeholder, TrailingNode } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";

import { RichTextProvider } from "reactjs-tiptap-editor";
import { Blockquote, RichTextBlockquote } from "reactjs-tiptap-editor/blockquote";
import { Bold, RichTextBold } from "reactjs-tiptap-editor/bold";
import {
  RichTextBubbleColumns,
  RichTextBubbleImage,
  RichTextBubbleLink,
  RichTextBubbleMenuDragHandle,
  RichTextBubbleTable,
  RichTextBubbleText,
} from "reactjs-tiptap-editor/bubble";
import { BulletList, RichTextBulletList } from "reactjs-tiptap-editor/bulletlist";
import { Callout, RichTextCallout } from "reactjs-tiptap-editor/callout";
import { Clear, RichTextClear } from "reactjs-tiptap-editor/clear";
import { Code, RichTextCode } from "reactjs-tiptap-editor/code";
import { CodeBlock, RichTextCodeBlock } from "reactjs-tiptap-editor/codeblock";
import { Color, RichTextColor } from "reactjs-tiptap-editor/color";
import { Column, ColumnNode, MultipleColumnNode, RichTextColumn } from "reactjs-tiptap-editor/column";
import { ExportPdf, RichTextExportPdf } from "reactjs-tiptap-editor/exportpdf";
import { ExportWord, RichTextExportWord } from "reactjs-tiptap-editor/exportword";
import { FontFamily, RichTextFontFamily } from "reactjs-tiptap-editor/fontfamily";
import { FontSize, RichTextFontSize } from "reactjs-tiptap-editor/fontsize";
import { FormatPainter, RichTextFormatPainter } from "reactjs-tiptap-editor/formatpainter";
import { Heading, RichTextHeading } from "reactjs-tiptap-editor/heading";
import { Highlight, RichTextHighlight } from "reactjs-tiptap-editor/highlight";
import { History, RichTextRedo, RichTextUndo } from "reactjs-tiptap-editor/history";
import { HorizontalRule, RichTextHorizontalRule } from "reactjs-tiptap-editor/horizontalrule";
import { Image, RichTextImage } from "reactjs-tiptap-editor/image";
import { ImportWord, RichTextImportWord } from "reactjs-tiptap-editor/importword";
import { Indent, RichTextIndent } from "reactjs-tiptap-editor/indent";
import { Italic, RichTextItalic } from "reactjs-tiptap-editor/italic";
import { LineHeight, RichTextLineHeight } from "reactjs-tiptap-editor/lineheight";
import { Link, RichTextLink } from "reactjs-tiptap-editor/link";
import { MarkdownPaste } from "reactjs-tiptap-editor/markdownpaste";
import { MoreMark, RichTextMoreMark } from "reactjs-tiptap-editor/moremark";
import { OrderedList, RichTextOrderedList } from "reactjs-tiptap-editor/orderedlist";
import { SearchAndReplace, RichTextSearchAndReplace } from "reactjs-tiptap-editor/searchandreplace";
import { SlashCommand, SlashCommandList } from "reactjs-tiptap-editor/slashcommand";
import { Strike, RichTextStrike } from "reactjs-tiptap-editor/strike";
import { Table, RichTextTable } from "reactjs-tiptap-editor/table";
import { TextAlign, RichTextAlign } from "reactjs-tiptap-editor/textalign";
import { TextDirection, RichTextTextDirection } from "reactjs-tiptap-editor/textdirection";
import { TextUnderline, RichTextUnderline } from "reactjs-tiptap-editor/textunderline";

import { PageBreak } from "./pageBreak";

import "reactjs-tiptap-editor/style.css";

/* One full-document editor, powered by reactjs-tiptap-editor (its own toolbar, bubble
   menus and slash command — no hand-rolled Ribbon any more). Feature set is the Word-like
   core of the library's playground; left out deliberately: Video/ImageGif (need a Giphy
   key), Iframe/Twitter (embed surface we don't want in a DMS), Attachment/Mention/Emoji/
   Katex/Excalidraw/Mermaid/Drawer/CodeView (niche, heavy bundles, not needed for business
   documents). Add any of them later by importing the extension + its RichText* button and
   dropping both into the arrays below — every extension here follows that same shape. */

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const BaseKit = [
  Document,
  Text,
  Dropcursor.configure({ width: 2 }),
  Gapcursor,
  HardBreak,
  Paragraph,
  TrailingNode,
  ListItem,
  TextStyle,
  Placeholder.configure({ placeholder: "Write your document…" }),
];

const extensions = [
  ...BaseKit,
  History,
  SearchAndReplace,
  Clear,
  FormatPainter,
  FontFamily,
  Heading,
  FontSize,
  Bold,
  Italic,
  TextUnderline,
  Strike,
  MoreMark,
  Color,
  Highlight,
  BulletList,
  OrderedList,
  TextAlign,
  Indent,
  LineHeight,
  Link,
  /* Images are inlined as base64 so a saved draft is self-contained — the backend
     sanitizer already allow-lists the data: scheme for <img src>. */
  Image.configure({ upload: fileToDataUrl }),
  Blockquote,
  HorizontalRule,
  PageBreak,
  Code,
  CodeBlock,
  Column,
  ColumnNode,
  MultipleColumnNode,
  Table,
  ExportPdf,
  ImportWord,
  ExportWord,
  TextDirection,
  Callout,
  SlashCommand,
  MarkdownPaste,
];

function Toolbar({ editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      <RichTextUndo />
      <RichTextRedo />
      <RichTextSearchAndReplace />
      <RichTextClear />
      <RichTextFormatPainter />
      <RichTextFontFamily />
      <RichTextHeading />
      <RichTextFontSize />
      <RichTextBold />
      <RichTextItalic />
      <RichTextUnderline />
      <RichTextStrike />
      <RichTextMoreMark />
      <RichTextColor />
      <RichTextHighlight />
      <RichTextBulletList />
      <RichTextOrderedList />
      <RichTextAlign />
      <RichTextIndent />
      <RichTextLineHeight />
      <RichTextLink />
      <RichTextImage />
      <RichTextBlockquote />
      <RichTextHorizontalRule />
      <button
        type="button"
        title="Insert page break — starts a new page here"
        onClick={() => editor.chain().focus().insertPageBreak().run()}
        className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
      >
        ⊞ Add page
      </button>
      <RichTextCode />
      <RichTextCodeBlock />
      <RichTextColumn />
      <RichTextTable />
      <RichTextExportPdf />
      <RichTextImportWord />
      <RichTextExportWord />
      <RichTextTextDirection />
      <RichTextCallout />
    </div>
  );
}

export default function DocumentEditor({ content, onChange, editable = true, onReady }) {
  const lastEmitted = useRef(content || "");

  const editor = useEditor({
    textDirection: "auto",
    editable,
    content: content || "<p></p>",
    extensions,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmitted.current = html;
      onChange?.(html);
    },
  });

  useEffect(() => { onReady?.(editor); }, [editor, onReady]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  /* Re-hydrate from the `content` prop only into an editor with nothing in it yet (a
     fresh load, or a remount) — never clobber content the user can already see. Same
     guard as the old per-block editor used, now against one whole document. */
  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return;
    const incoming = content || "";
    if (incoming === lastEmitted.current || incoming === editor.getHTML()) return;
    if (!editor.isEmpty) return;
    lastEmitted.current = incoming;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, content]);

  if (!editor) return null;

  return (
    <RichTextProvider editor={editor}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {editable && (
          <div className="rounded-t-lg border border-b-0 border-slate-200 bg-white shadow-sm">
            <Toolbar editor={editor} />
          </div>
        )}
        {/* The grey canvas the A4 sheet sits on, like Word's page view. The sheet's
            size/margins live on .tiptap in index.css so Author/Review/Viewer share the
            exact same page look from one rule. */}
        <div className="flex-1 overflow-auto bg-slate-500 py-10">
          <EditorContent editor={editor} />
        </div>

        <RichTextBubbleColumns />
        <RichTextBubbleLink />
        <RichTextBubbleImage />
        <RichTextBubbleTable />
        <RichTextBubbleText />
        <RichTextBubbleMenuDragHandle />

        <SlashCommandList />
      </div>
    </RichTextProvider>
  );
}
