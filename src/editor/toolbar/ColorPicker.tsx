import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Palette, Highlighter, X } from "lucide-react";
import ToolbarButton from "./ToolbarButton";

interface ColorPickerProps {
  editor: Editor;
  mode: "color" | "highlight";
}

const SWATCHES = [
  "#000000",
  "#4b5563",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

/** Text color (mode="color") / highlight color (mode="highlight") toolbar control — a
 * swatch-grid popover styled to match the app's neumorphic Card surface, in place of
 * reactjs-tiptap-editor's own RichTextColor/RichTextHighlight (non-Tailwind baked-in CSS). */
function ColorPicker({ editor, mode }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const toggleOpen = useCallback(() => setOpen((v) => !v), []);

  const applyColor = useCallback(
    (hex: string) => {
      if (mode === "color") editor.chain().focus().setColor(hex).run();
      else editor.chain().focus().setHighlight({ color: hex }).run();
      setOpen(false);
    },
    [editor, mode],
  );

  const clearColor = useCallback(() => {
    if (mode === "color") editor.chain().focus().unsetColor().run();
    else editor.chain().focus().unsetHighlight().run();
    setOpen(false);
  }, [editor, mode]);

  const handleCustomColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => applyColor(e.target.value),
    [applyColor],
  );

  return (
    <div className="relative" ref={containerRef}>
      <ToolbarButton
        icon={mode === "color" ? Palette : Highlighter}
        label={mode === "color" ? "Text color" : "Highlight"}
        active={open}
        onClick={toggleOpen}
      />
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 rounded-xl bg-surface-100 shadow-neu-raised p-2 w-44">
          <div className="grid grid-cols-5 gap-1.5">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                onClick={() => applyColor(hex)}
                className="w-6 h-6 rounded-md shadow-neu-raised-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-200/70">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="color" onChange={handleCustomColor} className="w-5 h-5 rounded cursor-pointer" />
              Custom
            </label>
            <button
              type="button"
              onClick={clearColor}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ColorPicker);
