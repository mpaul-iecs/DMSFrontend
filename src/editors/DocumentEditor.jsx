import React, { useEffect, useRef, useState } from "react";
import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { ListItem } from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { Dropcursor, Gapcursor, Placeholder, TrailingNode } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";

import { RichTextProvider } from "reactjs-tiptap-editor";
import { Attachment, RichTextAttachment } from "reactjs-tiptap-editor/attachment";
import { Blockquote, RichTextBlockquote } from "reactjs-tiptap-editor/blockquote";
import { Bold, RichTextBold } from "reactjs-tiptap-editor/bold";
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
import { BulletList, RichTextBulletList } from "reactjs-tiptap-editor/bulletlist";
import { Callout, RichTextCallout } from "reactjs-tiptap-editor/callout";
import { Clear, RichTextClear } from "reactjs-tiptap-editor/clear";
import { Code, RichTextCode } from "reactjs-tiptap-editor/code";
import { CodeBlock, RichTextCodeBlock } from "reactjs-tiptap-editor/codeblock";
import { CodeView, RichTextCodeView } from "reactjs-tiptap-editor/codeview";
import { Color, RichTextColor } from "reactjs-tiptap-editor/color";
import { Column, ColumnNode, MultipleColumnNode, RichTextColumn } from "reactjs-tiptap-editor/column";
import { Drawer, RichTextDrawer } from "reactjs-tiptap-editor/drawer";
import { Emoji, RichTextEmoji } from "reactjs-tiptap-editor/emoji";
import { Excalidraw, RichTextExcalidraw } from "reactjs-tiptap-editor/excalidraw";
import { ExportPdf, RichTextExportPdf } from "reactjs-tiptap-editor/exportpdf";
import { ExportWord, RichTextExportWord } from "reactjs-tiptap-editor/exportword";
import { FontFamily, RichTextFontFamily } from "reactjs-tiptap-editor/fontfamily";
import { FontSize, RichTextFontSize } from "reactjs-tiptap-editor/fontsize";
import { FormatPainter, RichTextFormatPainter } from "reactjs-tiptap-editor/formatpainter";
import { Heading, RichTextHeading } from "reactjs-tiptap-editor/heading";
import { Highlight, RichTextHighlight } from "reactjs-tiptap-editor/highlight";
import { History, RichTextRedo, RichTextUndo } from "reactjs-tiptap-editor/history";
import { HorizontalRule, RichTextHorizontalRule } from "reactjs-tiptap-editor/horizontalrule";
import { Iframe, RichTextIframe } from "reactjs-tiptap-editor/iframe";
import { Image, RichTextImage } from "reactjs-tiptap-editor/image";
import { ImageGif, RichTextImageGif } from "reactjs-tiptap-editor/imagegif";
import { ImportWord, RichTextImportWord } from "reactjs-tiptap-editor/importword";
import { Indent, RichTextIndent } from "reactjs-tiptap-editor/indent";
import { Italic, RichTextItalic } from "reactjs-tiptap-editor/italic";
import { Katex, RichTextKatex } from "reactjs-tiptap-editor/katex";
import { LineHeight, RichTextLineHeight } from "reactjs-tiptap-editor/lineheight";
import { Link, RichTextLink } from "reactjs-tiptap-editor/link";
import { MarkdownPaste } from "reactjs-tiptap-editor/markdownpaste";
import { Mention } from "reactjs-tiptap-editor/mention";
import { Mermaid, RichTextMermaid } from "reactjs-tiptap-editor/mermaid";
import { MoreMark, RichTextMoreMark } from "reactjs-tiptap-editor/moremark";
import { OrderedList, RichTextOrderedList } from "reactjs-tiptap-editor/orderedlist";
import { SearchAndReplace, RichTextSearchAndReplace } from "reactjs-tiptap-editor/searchandreplace";
import { SlashCommand, SlashCommandList } from "reactjs-tiptap-editor/slashcommand";
import { Strike, RichTextStrike } from "reactjs-tiptap-editor/strike";
import { Table, RichTextTable } from "reactjs-tiptap-editor/table";
import { TaskList, RichTextTaskList } from "reactjs-tiptap-editor/tasklist";
import { TextAlign, RichTextAlign } from "reactjs-tiptap-editor/textalign";
import { TextDirection, RichTextTextDirection } from "reactjs-tiptap-editor/textdirection";
import { TextUnderline, RichTextUnderline } from "reactjs-tiptap-editor/textunderline";
import { Twitter, RichTextTwitter } from "reactjs-tiptap-editor/twitter";
import { Video, RichTextVideo } from "reactjs-tiptap-editor/video";

import { PaginationPlus, PAGE_SIZES } from "tiptap-pagination-plus";

import { Lockable } from "./lockable";
import { CommentHighlight } from "./commentHighlight";
import HeaderFooterEditor from "./HeaderFooterEditor";
import { EMOJI_LIST } from "./emojiList";

import "reactjs-tiptap-editor/style.css";
import "katex/dist/katex.min.css";
import "easydrawer/styles.css";
import "@excalidraw/excalidraw/index.css";

/* One full-document editor, powered by reactjs-tiptap-editor (its own toolbar, bubble
   menus and slash command — no hand-rolled Ribbon any more). Every extension the
   library's own playground ships is wired in below, same shape each time: the Tiptap
   extension plus its matching RichText* toolbar button. Collaboration/Yjs is the one
   thing deliberately left out — there's no realtime sync server behind this app. */

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
  Emoji.configure({
    suggestion: {
      items: ({ query }) => {
        const q = (query || "").toLowerCase();
        return EMOJI_LIST.filter((e) => e.name.includes(q) || e.tags.some((t) => t.includes(q)));
      },
    },
  }),
  Color,
  Highlight,
  BulletList,
  OrderedList,
  TextAlign,
  Indent,
  LineHeight,
  TaskList,
  Link,
  /* Images/video/attachments/diagrams are inlined as base64 so a saved draft is
     self-contained — the backend sanitizer already allow-lists the data: scheme. */
  Image.configure({ upload: fileToDataUrl }),
  Video.configure({ upload: fileToDataUrl }),
  ImageGif.configure({ provider: "giphy", API_KEY: import.meta.env.VITE_GIPHY_API_KEY || "" }),
  Blockquote,
  HorizontalRule,
  Code,
  CodeBlock,
  Column,
  ColumnNode,
  MultipleColumnNode,
  Table,
  Iframe,
  ExportPdf,
  ImportWord,
  ExportWord,
  TextDirection,
  Attachment.configure({ upload: fileToDataUrl }),
  Katex,
  Excalidraw,
  Mermaid.configure({ upload: fileToDataUrl }),
  Drawer.configure({ upload: fileToDataUrl }),
  Twitter,
  Mention.configure({ suggestion: { char: "@", items: () => [] } }),
  SlashCommand,
  CodeView,
  Callout,
  MarkdownPaste,
];

const pbtn = "rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200";
const stop = (e) => e.preventDefault();

/* Everyone who can edit gets the full toolbar. The only role difference is the 🔒 Lock
   button (admin only) — authors keep every writing tool, they just can't change blocks
   the admin has locked (enforced by lockable.js, not by hiding buttons). */
function Toolbar({ editor, showLock }) {
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
      <RichTextEmoji />
      <RichTextColor />
      <RichTextHighlight />
      <RichTextBulletList />
      <RichTextOrderedList />
      <RichTextAlign />
      <RichTextIndent />
      <RichTextLineHeight />
      <RichTextTaskList />
      <RichTextLink />
      <RichTextImage />
      <RichTextVideo />
      <RichTextImageGif />
      <RichTextBlockquote />
      <RichTextHorizontalRule />
      {showLock && (
        <button type="button" onMouseDown={stop}
          title="Lock / unlock the selected block(s) — authors can't edit locked blocks"
          onClick={() => editor.chain().focus().toggleLock().run()} className={pbtn}>
          🔒 Lock
        </button>
      )}
      <RichTextCode />
      <RichTextCodeBlock />
      <RichTextColumn />
      <RichTextTable />
      <RichTextIframe />
      <RichTextExportPdf />
      <RichTextImportWord />
      <RichTextExportWord />
      <RichTextTextDirection />
      <RichTextAttachment />
      <RichTextKatex />
      <RichTextExcalidraw />
      <RichTextMermaid />
      <RichTextDrawer />
      <RichTextTwitter />
      <RichTextCodeView />
      <RichTextCallout />
    </div>
  );
}

export default function DocumentEditor({
  content, headerHtml = "", footerHtml = "", bodyCss = "", comments,
  editable = true, role = "admin", onReady, onDirty, onHeaderFooterChange,
}) {
  const hfEditable = editable && role === "admin";
  const [editingHF, setEditingHF] = useState(null); // "header" | "footer" | null
  const hfRef = useRef({ header: headerHtml, footer: footerHtml });
  hfRef.current = { header: headerHtml, footer: footerHtml };

  const editor = useEditor({
    textDirection: "auto",
    editable,
    content: content || "<p></p>",
    extensions: [
      ...extensions,
      Lockable.configure({ restricted: role === "author" }),
      CommentHighlight.configure({ comments: comments || [] }),
      /* Real Word-style pagination: content flows onto new A4 pages automatically as it
         overflows, and the docx's header/footer repeat on every page. Margins trimmed from
         the A4 default (95px) so the header/footer sit closer to the page edge, like Word. */
      PaginationPlus.configure({
        ...PAGE_SIZES.A4,
        marginTop: 54,
        marginBottom: 54,
        contentMarginTop: 8,
        contentMarginBottom: 8,
        pageGap: 28,
        pageGapBorderColor: "#94a3b8",
        pageBreakBackground: "#64748b", // the canvas colour — reads as a gap between sheets
        /* Header/footer are ONLY whatever the uploaded .docx actually had (split out by
           the backend parser). Nothing is added — no page numbers — so a template with no
           header/footer just gets plain pages, like Word. */
        headerLeft: headerHtml || "",
        headerRight: "",
        footerLeft: footerHtml || "",
        footerRight: "",
        onHeaderClick: hfEditable ? () => setEditingHF("header") : undefined,
        onFooterClick: hfEditable ? () => setEditingHF("footer") : undefined,
      }),
    ],
    /* No getHTML()/setState here — serialising the whole document on every keystroke,
       with 40+ extensions loaded, is what made typing lag. The editor instance itself is
       the source of truth; AuthorView reads editor.getHTML() only when it saves. */
    onUpdate: () => onDirty?.(),
  });

  useEffect(() => { onReady?.(editor); }, [editor, onReady]);

  /* Push header/footer through the extension's own command after the editor exists —
     .configure() alone sometimes renders the pages before the header content is applied. */
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.updateHeaderContent(headerHtml || "", "");
    editor.commands.updateFooterContent(footerHtml || "", "");
  }, [editor, headerHtml, footerHtml]);

  /* The document's own base font (Times New Roman, Calibri, …) on the page. */
  useEffect(() => {
    if (editor?.view?.dom) editor.view.dom.style.cssText += ";" + (bodyCss || "");
  }, [editor, bodyCss]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  /* `content` is the INITIAL document only — it changes just on load or after a save
     round-trip, never per keystroke, so this stays a cheap effect. Only hydrate an empty
     editor, so a normalised save echo can't yank content back out. */
  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused || !editor.isEmpty) return;
    const incoming = content || "";
    if (incoming && incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <RichTextProvider editor={editor}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {editable && (
          <div className="rounded-t-lg border border-b-0 border-slate-200 bg-white shadow-sm">
            <Toolbar editor={editor} showLock={role === "admin"} />
          </div>
        )}
        {/* The grey canvas. tiptap-pagination-plus renders the A4 pages, gaps, and the
            repeating header/footer inside the editor content itself. */}
        <div className={`dms-canvas flex-1 overflow-auto bg-slate-500 py-10${hfEditable ? " hf-editable" : ""}`}>
          <EditorContent editor={editor} />
        </div>

        {editingHF && (
          <HeaderFooterEditor
            kind={editingHF}
            html={hfRef.current[editingHF]}
            onCancel={() => setEditingHF(null)}
            onSave={(nextHtml) => {
              if (editingHF === "header") editor.commands.updateHeaderContent(nextHtml, "");
              else editor.commands.updateFooterContent(nextHtml, "");
              onHeaderFooterChange?.(editingHF, nextHtml);
              setEditingHF(null);
            }}
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
