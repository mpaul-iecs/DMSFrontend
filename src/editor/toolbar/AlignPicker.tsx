import { memo, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import ToolbarButton from "./ToolbarButton";

interface AlignPickerProps {
  editor: Editor;
  /** Bumped on every editor transaction (see Toolbar.tsx's useEditorState) so this memoized
   * component re-renders and re-derives `active` state from the mutable editor instance —
   * React.memo would otherwise skip re-rendering since `editor`'s own reference never changes. */
  tick: number;
}

const ALIGNMENTS = [
  { value: "left", icon: AlignLeft, label: "Align left" },
  { value: "center", icon: AlignCenter, label: "Align center" },
  { value: "right", icon: AlignRight, label: "Align right" },
  { value: "justify", icon: AlignJustify, label: "Justify" },
] as const;

function AlignPicker({ editor }: AlignPickerProps) {
  return (
    <>
      {ALIGNMENTS.map(({ value, icon, label }) => (
        <AlignButton key={value} editor={editor} value={value} icon={icon} label={label} />
      ))}
    </>
  );
}

function AlignButton({
  editor,
  value,
  icon,
  label,
}: {
  editor: Editor;
  value: (typeof ALIGNMENTS)[number]["value"];
  icon: (typeof ALIGNMENTS)[number]["icon"];
  label: string;
}) {
  const handleClick = useCallback(() => {
    editor.chain().focus().setTextAlign(value).run();
  }, [editor, value]);

  return (
    <ToolbarButton
      icon={icon}
      label={label}
      active={editor.isActive({ textAlign: value })}
      onClick={handleClick}
    />
  );
}

export default memo(AlignPicker);
