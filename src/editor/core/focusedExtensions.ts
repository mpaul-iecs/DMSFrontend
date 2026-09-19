import type { AnyExtension } from "@tiptap/core";
import { Bold } from "reactjs-tiptap-editor/bold";
import { Clear } from "reactjs-tiptap-editor/clear";
import { Color } from "reactjs-tiptap-editor/color";
import { FontFamily } from "reactjs-tiptap-editor/fontfamily";
import { FontSize } from "reactjs-tiptap-editor/fontsize";
import { Heading } from "reactjs-tiptap-editor/heading";
import { Highlight } from "reactjs-tiptap-editor/highlight";
import { History } from "reactjs-tiptap-editor/history";
import { Image } from "reactjs-tiptap-editor/image";
import { Italic } from "reactjs-tiptap-editor/italic";
import { Link } from "reactjs-tiptap-editor/link";
import { BulletList } from "reactjs-tiptap-editor/bulletlist";
import { OrderedList } from "reactjs-tiptap-editor/orderedlist";
import { Strike } from "reactjs-tiptap-editor/strike";
import { Table } from "reactjs-tiptap-editor/table";
import { TextAlign } from "reactjs-tiptap-editor/textalign";
import { TextUnderline } from "reactjs-tiptap-editor/textunderline";

import { buildBaseKit } from "./baseKit";
import { fileToDataUrl } from "./fileToDataUrl";

/** The per-section inline editor's toolbar scope (TemplateFormPage's SectionRow):
 * bold/italic/underline/strike, alignment, color+highlight, font family+size, headings,
 * lists, links, tables, images, undo/redo, clear formatting. No pagination, no video/
 * Excalidraw/Mermaid/KaTeX/emoji/Twitter/Giphy/attachments/code blocks/columns/callouts —
 * those are reserved for the full-page popup editor (see fullExtensions.ts).
 *
 * Deliberately in its own module, importing only the ~15 extensions actually used here —
 * `SectionInlineEditor` (used eagerly in the Template Builder form) must NOT transitively
 * pull in `fullExtensions.ts`'s Excalidraw/Mermaid/KaTeX/etc. imports, which are only meant
 * to load once the (lazy-loaded) full-page popup editor is actually opened. */
export function buildFocusedExtensions(placeholder?: string): AnyExtension[] {
  return [
    ...buildBaseKit(placeholder),
    History,
    Clear,
    FontFamily,
    Heading,
    FontSize,
    Bold,
    Italic,
    TextUnderline,
    Strike,
    Color,
    Highlight,
    BulletList,
    OrderedList,
    TextAlign,
    Link,
    Image.configure({ upload: fileToDataUrl }),
    Table,
  ];
}
