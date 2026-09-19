import { memo, useCallback } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  List,
  ListOrdered,
  ListChecks,
  Eraser,
  Quote,
  Minus,
  Code,
  SquareCode,
  Columns2,
  MessageSquareQuote,
} from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import ToolbarDivider from "./ToolbarDivider";
import AlignPicker from "./AlignPicker";
import ColorPicker from "./ColorPicker";
import FontFamilyPicker from "./FontFamilyPicker";
import FontSizePicker from "./FontSizePicker";
import HeadingPicker from "./HeadingPicker";
import LinkDialog from "./LinkDialog";
import ImageInsertDialog from "./ImageInsertDialog";
import VideoInsertDialog from "./VideoInsertDialog";
import IframeInsertDialog from "./IframeInsertDialog";
import AttachmentButton from "./AttachmentButton";
import TableInsertDialog from "./TableInsertDialog";

export type ToolbarScope = "focused" | "full";

interface ToolbarProps {
  editor: Editor;
  scope: ToolbarScope;
}

/**
 * Custom Tailwind/neumorphic toolbar — replaces reactjs-tiptap-editor's own RichText*
 * button components (which carry non-Tailwind baked-in CSS). Every button here calls the
 * underlying Tiptap extension command directly (`editor.chain().focus()....run()`), which
 * works regardless of which UI wraps the extension. `scope="focused"` is used by the
 * inline per-section editor (SectionInlineEditor); `scope="full"` adds every remaining
 * DMSEditor feature for the full-page popup editor, except the 5 (now a few more, see
 * DMSFrontend/CLAUDE.md's Editor section) advanced-dialog extensions that keep the
 * library's own default styling — those are rendered separately by FullPageEditor.tsx.
 */
function Toolbar({ editor, scope }: ToolbarProps) {
  // Forces this component to re-render on every editor transaction, so `editor.isActive(...)`
  // calls below reflect the current selection — React wouldn't otherwise know the mutable
  // `editor` instance changed, since its own reference never does.
  const tick = useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });

  const handleUndo = useCallback(() => editor.chain().focus().undo().run(), [editor]);
  const handleRedo = useCallback(() => editor.chain().focus().redo().run(), [editor]);
  const handleBold = useCallback(() => editor.chain().focus().toggleBold().run(), [editor]);
  const handleItalic = useCallback(() => editor.chain().focus().toggleItalic().run(), [editor]);
  const handleUnderline = useCallback(() => editor.chain().focus().toggleUnderline().run(), [editor]);
  const handleStrike = useCallback(() => editor.chain().focus().toggleStrike().run(), [editor]);
  const handleBulletList = useCallback(() => editor.chain().focus().toggleBulletList().run(), [editor]);
  const handleOrderedList = useCallback(() => editor.chain().focus().toggleOrderedList().run(), [editor]);
  const handleClear = useCallback(() => editor.chain().focus().clearNodes().unsetAllMarks().run(), [editor]);

  const handleSubscript = useCallback(() => editor.chain().focus().toggleSubscript().run(), [editor]);
  const handleSuperscript = useCallback(() => editor.chain().focus().toggleSuperscript().run(), [editor]);
  const handleTaskList = useCallback(() => editor.chain().focus().toggleTaskList().run(), [editor]);
  const handleBlockquote = useCallback(() => editor.chain().focus().toggleBlockquote().run(), [editor]);
  const handleHorizontalRule = useCallback(() => editor.chain().focus().setHorizontalRule().run(), [editor]);
  const handleCode = useCallback(() => editor.chain().focus().toggleCode().run(), [editor]);
  const handleCodeBlock = useCallback(() => editor.chain().focus().toggleCodeBlock().run(), [editor]);
  const handleColumns = useCallback(() => editor.chain().focus().insertColumns({ cols: 2 }).run(), [editor]);
  const handleCallout = useCallback(() => editor.chain().focus().setCallout().run(), [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-xl bg-surface-100 shadow-neu-raised-sm px-2 py-1.5 border-b border-surface-200/70">
      <ToolbarButton icon={Undo2} label="Undo" onClick={handleUndo} />
      <ToolbarButton icon={Redo2} label="Redo" onClick={handleRedo} />
      <ToolbarDivider />

      <HeadingPicker editor={editor} tick={tick} />
      <FontFamilyPicker editor={editor} tick={tick} />
      <FontSizePicker editor={editor} tick={tick} />
      <ToolbarDivider />

      <ToolbarButton icon={Bold} label="Bold" active={editor.isActive("bold")} onClick={handleBold} />
      <ToolbarButton icon={Italic} label="Italic" active={editor.isActive("italic")} onClick={handleItalic} />
      <ToolbarButton
        icon={Underline}
        label="Underline"
        active={editor.isActive("underline")}
        onClick={handleUnderline}
      />
      <ToolbarButton
        icon={Strikethrough}
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={handleStrike}
      />
      {scope === "full" && (
        <>
          <ToolbarButton
            icon={Subscript}
            label="Subscript"
            active={editor.isActive("subscript")}
            onClick={handleSubscript}
          />
          <ToolbarButton
            icon={Superscript}
            label="Superscript"
            active={editor.isActive("superscript")}
            onClick={handleSuperscript}
          />
        </>
      )}
      <ToolbarDivider />

      <ColorPicker editor={editor} mode="color" />
      <ColorPicker editor={editor} mode="highlight" />
      <ToolbarDivider />

      <ToolbarButton
        icon={List}
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={handleBulletList}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={handleOrderedList}
      />
      {scope === "full" && (
        <ToolbarButton
          icon={ListChecks}
          label="Task list"
          active={editor.isActive("taskList")}
          onClick={handleTaskList}
        />
      )}
      <AlignPicker editor={editor} tick={tick} />
      <ToolbarDivider />

      <LinkDialog editor={editor} />
      <ImageInsertDialog editor={editor} />
      <TableInsertDialog editor={editor} />

      {scope === "full" && (
        <>
          <VideoInsertDialog editor={editor} />
          <IframeInsertDialog editor={editor} />
          <AttachmentButton editor={editor} />
          <ToolbarDivider />

          <ToolbarButton
            icon={Quote}
            label="Blockquote"
            active={editor.isActive("blockquote")}
            onClick={handleBlockquote}
          />
          <ToolbarButton icon={Minus} label="Horizontal rule" onClick={handleHorizontalRule} />
          <ToolbarButton icon={Code} label="Inline code" active={editor.isActive("code")} onClick={handleCode} />
          <ToolbarButton
            icon={SquareCode}
            label="Code block"
            active={editor.isActive("codeBlock")}
            onClick={handleCodeBlock}
          />
          <ToolbarButton icon={Columns2} label="Insert columns" onClick={handleColumns} />
          <ToolbarButton icon={MessageSquareQuote} label="Callout" onClick={handleCallout} />
        </>
      )}

      <ToolbarDivider />
      <ToolbarButton icon={Eraser} label="Clear formatting" onClick={handleClear} />
    </div>
  );
}

export default memo(Toolbar);
