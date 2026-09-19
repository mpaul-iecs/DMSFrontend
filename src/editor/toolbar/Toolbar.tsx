import { memo, useCallback } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Eraser,
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
import TableInsertDialog from "./TableInsertDialog";

interface ToolbarProps {
  editor: Editor;
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
function Toolbar({ editor }: ToolbarProps) {
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
      <AlignPicker editor={editor} tick={tick} />
      <ToolbarDivider />

      <LinkDialog editor={editor} />
      <ImageInsertDialog editor={editor} />
      <TableInsertDialog editor={editor} />

      <ToolbarDivider />
      <ToolbarButton icon={Eraser} label="Clear formatting" onClick={handleClear} />
    </div>
  );
}

export default memo(Toolbar);
