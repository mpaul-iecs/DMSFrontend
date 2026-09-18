import { memo, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import type { Level } from "@tiptap/extension-heading";
import Select from "../../components/ui/Select";

interface HeadingPickerProps {
  editor: Editor;
  /** See AlignPicker.tsx's doc comment. */
  tick: number;
}

interface HeadingOption {
  value: Level | 0;
  label: string;
}

const HEADING_OPTIONS: HeadingOption[] = [
  { value: 0, label: "Paragraph" },
  { value: 1, label: "Heading 1" },
  { value: 2, label: "Heading 2" },
  { value: 3, label: "Heading 3" },
  { value: 4, label: "Heading 4" },
  { value: 5, label: "Heading 5" },
  { value: 6, label: "Heading 6" },
];

function HeadingPicker({ editor }: HeadingPickerProps) {
  const currentLevel = useMemo<Level | 0>(() => {
    for (const level of [1, 2, 3, 4, 5, 6] as Level[]) {
      if (editor.isActive("heading", { level })) return level;
    }
    return 0;
  }, [editor]);
  const value = HEADING_OPTIONS.find((o) => o.value === currentLevel) ?? HEADING_OPTIONS[0];

  const handleChange = useCallback(
    (opt: HeadingOption | null) => {
      if (!opt || opt.value === 0) editor.chain().focus().setParagraph().run();
      else editor.chain().focus().toggleHeading({ level: opt.value }).run();
    },
    [editor],
  );

  return (
    <Select<HeadingOption>
      options={HEADING_OPTIONS}
      value={value}
      onChange={handleChange}
      isClearable={false}
      isSearchable={false}
      placeholder="Style"
      className="w-32"
    />
  );
}

export default memo(HeadingPicker);
