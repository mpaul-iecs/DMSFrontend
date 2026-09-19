import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, X } from "lucide-react";
import Button from "../components/ui/Button";
import { IBMPlexSans600 } from "../components/ui/Text";

interface HeaderFooterDialogProps {
  kind: "header" | "footer";
  html: string;
  onSave: (nextHtml: string) => void;
  onCancel: () => void;
}

/** Small modal for editing a page header/footer — re-themed port of DMSEditor's
 * HeaderFooterEditor.jsx. Kept as a lightweight `contentEditable` region (not a full Tiptap
 * instance) since a header/footer is a couple of lines, same as the original. Saved
 * `innerHTML` is fed back to `tiptap-pagination-plus` via FullPageEditor's
 * updateHeaderContent/updateFooterContent effect.
 *
 * The writing area is a visibly "pressed" surface (same shadow-neu-pressed language
 * SectionInlineEditor uses) with its own placeholder text — a plain unstyled
 * contentEditable div on the same white background as the rest of the modal was
 * indistinguishable from empty space, giving no hint of where to click/type. */
export default function HeaderFooterDialog({ kind, html, onSave, onCancel }: HeaderFooterDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html || "<p></p>";
      setIsEmpty(!(ref.current.textContent || "").trim());
      ref.current.focus();
    }
  }, [html]);

  const handleInput = useCallback(() => {
    setIsEmpty(!(ref.current?.textContent || "").trim());
  }, []);

  const exec = (command: string, value?: string) => () => {
    document.execCommand(command, false, value);
    ref.current?.focus();
  };

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  const handleSave = () => onSave(ref.current?.innerHTML || "");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-10"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-surface-100 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-200/70">
          <IBMPlexSans600 as="span" className="text-sm text-gray-700 capitalize">
            Edit page {kind}
          </IBMPlexSans600>
          <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:shadow-neu-raised-sm text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-surface-200/70">
          <button type="button" onClick={exec("bold")} className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={exec("italic")} className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={exec("underline")}
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <span className="mx-1 h-4 w-px bg-surface-200/70" />
          <button
            type="button"
            onClick={exec("justifyLeft")}
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={exec("justifyCenter")}
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={exec("justifyRight")}
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative m-4">
          {isEmpty && (
            <span className="absolute left-4 top-4 text-sm text-gray-400 pointer-events-none select-none">
              Click here and start typing…
            </span>
          )}
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            className="tiptap min-h-[120px] max-h-[40vh] overflow-auto rounded-xl bg-surface-100 shadow-neu-pressed p-4 text-sm outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-surface-200/70">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save {kind}
          </Button>
        </div>
      </div>
    </div>
  );
}
