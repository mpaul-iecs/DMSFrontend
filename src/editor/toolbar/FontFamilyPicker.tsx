import { memo, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import Select from "../../components/ui/Select";

interface FontFamilyPickerProps {
  editor: Editor;
  /** See AlignPicker.tsx's doc comment — forces this memoized component to re-render on
   * every editor transaction so it reflects the cursor's current font family. */
  tick: number;
}

interface FontOption {
  value: string;
  label: string;
}

const FONT_OPTIONS: FontOption[] = [
  { value: "", label: "Default" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Calibri", label: "Calibri" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Garamond", label: "Garamond" },
];

function FontFamilyPicker({ editor }: FontFamilyPickerProps) {
  const current = editor.getAttributes("textStyle").fontFamily as string | undefined;
  const value = useMemo(() => FONT_OPTIONS.find((o) => o.value === current) ?? FONT_OPTIONS[0], [current]);

  const handleChange = useCallback(
    (opt: FontOption | null) => {
      if (!opt || !opt.value) editor.chain().focus().unsetFontFamily().run();
      else editor.chain().focus().setFontFamily(opt.value).run();
    },
    [editor],
  );

  return (
    <Select<FontOption>
      options={FONT_OPTIONS}
      value={value}
      onChange={handleChange}
      isClearable={false}
      isSearchable={false}
      placeholder="Font"
      className="w-36"
    />
  );
}

export default memo(FontFamilyPicker);
