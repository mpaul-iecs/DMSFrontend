import type { AnyExtension } from "@tiptap/core";

import { Attachment } from "reactjs-tiptap-editor/attachment";
import { Blockquote } from "reactjs-tiptap-editor/blockquote";
import { Bold } from "reactjs-tiptap-editor/bold";
import { BulletList } from "reactjs-tiptap-editor/bulletlist";
import { Callout } from "reactjs-tiptap-editor/callout";
import { Clear } from "reactjs-tiptap-editor/clear";
import { Code } from "reactjs-tiptap-editor/code";
import { CodeBlock } from "reactjs-tiptap-editor/codeblock";
import { CodeView } from "reactjs-tiptap-editor/codeview";
import { Color } from "reactjs-tiptap-editor/color";
import { Column, ColumnNode, MultipleColumnNode } from "reactjs-tiptap-editor/column";
import { Drawer } from "reactjs-tiptap-editor/drawer";
import { Emoji } from "reactjs-tiptap-editor/emoji";
import { Excalidraw } from "reactjs-tiptap-editor/excalidraw";
import { ExportPdf } from "reactjs-tiptap-editor/exportpdf";
import { ExportWord } from "reactjs-tiptap-editor/exportword";
import { FontFamily } from "reactjs-tiptap-editor/fontfamily";
import { FontSize } from "reactjs-tiptap-editor/fontsize";
import { FormatPainter } from "reactjs-tiptap-editor/formatpainter";
import { Heading } from "reactjs-tiptap-editor/heading";
import { Highlight } from "reactjs-tiptap-editor/highlight";
import { History } from "reactjs-tiptap-editor/history";
import { HorizontalRule } from "reactjs-tiptap-editor/horizontalrule";
import { Iframe } from "reactjs-tiptap-editor/iframe";
import { Image } from "reactjs-tiptap-editor/image";
import { ImageGif } from "reactjs-tiptap-editor/imagegif";
import { ImportWord } from "reactjs-tiptap-editor/importword";
import { Indent } from "reactjs-tiptap-editor/indent";
import { Italic } from "reactjs-tiptap-editor/italic";
import { Katex } from "reactjs-tiptap-editor/katex";
import { LineHeight } from "reactjs-tiptap-editor/lineheight";
import { Link } from "reactjs-tiptap-editor/link";
import { MarkdownPaste } from "reactjs-tiptap-editor/markdownpaste";
import { Mention } from "reactjs-tiptap-editor/mention";
import { Mermaid } from "reactjs-tiptap-editor/mermaid";
import { MoreMark } from "reactjs-tiptap-editor/moremark";
import { OrderedList } from "reactjs-tiptap-editor/orderedlist";
import { SearchAndReplace } from "reactjs-tiptap-editor/searchandreplace";
import { SlashCommand } from "reactjs-tiptap-editor/slashcommand";
import { Strike } from "reactjs-tiptap-editor/strike";
import { Table } from "reactjs-tiptap-editor/table";
import { TaskList } from "reactjs-tiptap-editor/tasklist";
import { TextAlign } from "reactjs-tiptap-editor/textalign";
import { TextDirection } from "reactjs-tiptap-editor/textdirection";
import { TextUnderline } from "reactjs-tiptap-editor/textunderline";
import { Twitter } from "reactjs-tiptap-editor/twitter";
import { Video } from "reactjs-tiptap-editor/video";

import { buildBaseKit } from "./baseKit";
import { fileToDataUrl } from "./fileToDataUrl";
import { EMOJI_LIST } from "./emojiList";

/** The full-page popup editor's complete DMSEditor feature set (everything the POC's
 * DocumentEditor.jsx wired in), minus Lock and Comments (dropped per the integration
 * decision — no backend persists either, and the permission model here is simply
 * edit-permission-gated author vs. read-only reviewer). Pagination (`PaginationPlus`) and
 * the section-marker extension are added by `FullPageEditor.tsx` itself, not here, since
 * they're specific to composing multiple sections into one paginated document.
 *
 * Deliberately in its own module, separate from `focusedExtensions.ts` — this file's
 * imports (Excalidraw, Mermaid, KaTeX, etc.) are genuinely heavy, and `FullPageEditor.tsx`
 * (the only consumer) is lazy-loaded on its own route specifically so this weight only
 * downloads when the popup editor is actually opened. Don't import this from anywhere
 * that's part of the app's eager bundle (e.g. don't re-export it from `src/editor/index.ts`
 * — see that file's comment). */
export function buildFullExtensions(placeholder?: string): AnyExtension[] {
  return [
    ...buildBaseKit(placeholder),
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
        items: ({ query }: { query: string }) => {
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
}
