import { memo } from "react";
import { RichTextAttachment } from "reactjs-tiptap-editor/attachment";
import { RichTextBlockquote } from "reactjs-tiptap-editor/blockquote";
import { RichTextBold } from "reactjs-tiptap-editor/bold";
import { RichTextBulletList } from "reactjs-tiptap-editor/bulletlist";
import { RichTextCallout } from "reactjs-tiptap-editor/callout";
import { RichTextClear } from "reactjs-tiptap-editor/clear";
import { RichTextCode } from "reactjs-tiptap-editor/code";
import { RichTextCodeBlock } from "reactjs-tiptap-editor/codeblock";
import { RichTextColor } from "reactjs-tiptap-editor/color";
import { RichTextColumn } from "reactjs-tiptap-editor/column";
import { RichTextDrawer } from "reactjs-tiptap-editor/drawer";
import { RichTextEmoji } from "reactjs-tiptap-editor/emoji";
import { RichTextExcalidraw } from "reactjs-tiptap-editor/excalidraw";
import { RichTextExportPdf } from "reactjs-tiptap-editor/exportpdf";
import { RichTextExportWord } from "reactjs-tiptap-editor/exportword";
import { RichTextFontFamily } from "reactjs-tiptap-editor/fontfamily";
import { RichTextFontSize } from "reactjs-tiptap-editor/fontsize";
import { RichTextFormatPainter } from "reactjs-tiptap-editor/formatpainter";
import { RichTextHeading } from "reactjs-tiptap-editor/heading";
import { RichTextHighlight } from "reactjs-tiptap-editor/highlight";
import { RichTextRedo, RichTextUndo } from "reactjs-tiptap-editor/history";
import { RichTextHorizontalRule } from "reactjs-tiptap-editor/horizontalrule";
import { RichTextIframe } from "reactjs-tiptap-editor/iframe";
import { RichTextImage } from "reactjs-tiptap-editor/image";
import { RichTextImageGif } from "reactjs-tiptap-editor/imagegif";
import { RichTextImportWord } from "reactjs-tiptap-editor/importword";
import { RichTextIndent } from "reactjs-tiptap-editor/indent";
import { RichTextItalic } from "reactjs-tiptap-editor/italic";
import { RichTextKatex } from "reactjs-tiptap-editor/katex";
import { RichTextLineHeight } from "reactjs-tiptap-editor/lineheight";
import { RichTextLink } from "reactjs-tiptap-editor/link";
import { RichTextMermaid } from "reactjs-tiptap-editor/mermaid";
import { RichTextMoreMark } from "reactjs-tiptap-editor/moremark";
import { RichTextOrderedList } from "reactjs-tiptap-editor/orderedlist";
import { RichTextSearchAndReplace } from "reactjs-tiptap-editor/searchandreplace";
import { RichTextStrike } from "reactjs-tiptap-editor/strike";
import { RichTextTable } from "reactjs-tiptap-editor/table";
import { RichTextTaskList } from "reactjs-tiptap-editor/tasklist";
import { RichTextAlign } from "reactjs-tiptap-editor/textalign";
import { RichTextTextDirection } from "reactjs-tiptap-editor/textdirection";
import { RichTextUnderline } from "reactjs-tiptap-editor/textunderline";
import { RichTextTwitter } from "reactjs-tiptap-editor/twitter";
import { RichTextVideo } from "reactjs-tiptap-editor/video";

/**
 * The full-page editor's toolbar, rendered with `reactjs-tiptap-editor`'s OWN native controls —
 * the same buttons, dropdowns (font family / heading / size / color pickers…) and order as the
 * library's playground and the DMSEditor POC (`D:\dms-editor`'s `DocumentEditor.jsx`). Must be
 * rendered inside `<RichTextProvider>` (each control reads the editor from that context).
 *
 * Intentionally left out, both because they can rewrite the whole document and destroy the
 * `data-section-id` markers that let a save split the document back into template sections:
 * - `RichTextCodeView` (raw-HTML editing),
 * and Lock/Comments (dropped from the port entirely — no backend persists either).
 *
 * The inline per-section editor (`SectionInlineEditor`) keeps its own small custom toolbar
 * (`toolbar/Toolbar.tsx`); this native one is only for the full editor.
 */
function NativeToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-0.5">
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
      <RichTextCallout />
    </div>
  );
}

export default memo(NativeToolbar);
