import { memo, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import Select from "../../components/ui/Select";

interface FontSizePickerProps {
  editor: Editor;
  /** See AlignPicker.tsx's doc comment. */
  tick: number;
}

interface SizeOption {
  value: string;
  label: string;
}

const SIZE_OPTIONS: SizeOption[] = ["", "10px", "12px", "14px", "16px", "18px", "24px", "32px", "48px"].map(
  (px) => ({ value: px, label: px || "Default" }),
);

function FontSizePicker({ editor }: FontSizePickerProps) {
  const current = editor.getAttributes("textStyle").fontSize as string | undefined;
  const value = useMemo(() => SIZE_OPTIONS.find((o) => o.value === current) ?? SIZE_OPTIONS[0], [current]);

  const handleChange = useCallback(
    (opt: SizeOption | null) => {
      if (!opt || !opt.value) editor.chain().focus().unsetFontSize().run();
      else editor.chain().focus().setFontSize(opt.value).run();
    },
    [editor],
  );

  return (
    <Select<SizeOption>
      options={SIZE_OPTIONS}
      value={value}
      onChange={handleChange}
      isClearable={false}
      isSearchable={false}
      placeholder="Size"
      className="w-24"
    />
  );
}

export default memo(FontSizePicker);
