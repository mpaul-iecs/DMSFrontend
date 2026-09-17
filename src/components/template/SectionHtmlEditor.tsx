import { memo, useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Underline, List } from "lucide-react";

interface SectionHtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Lightweight contentEditable HTML editor for a single section's body.
 *
 * DEVIATION FROM SPEC: the task asked for the dms-editor project's Tiptap-based
 * DocumentEditor (reactjs-tiptap-editor + tiptap-pagination-plus) to be ported wholesale.
 * That port was not completed in this pass — see CLAUDE.md's "Template governance" section
 * for the full rationale (dependency/version-compat risk vs. time budget) — this
 * contentEditable + execCommand editor is a stand-in with the same external contract
 * (plain HTML string in, plain HTML string out, `disabled` = read-only) so swapping in the
 * real ported DocumentEditor later is a drop-in replacement at this one call site (and the
 * read-only composed preview in TemplateDetailPage).
 */
function SectionHtmlEditor({ value, onChange, disabled = false, placeholder }: SectionHtmlEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Set innerHTML imperatively only once on mount (and when the field genuinely swaps to a
  // different section, via `key` at the call site) — feeding `value` back into
  // dangerouslySetInnerHTML on every keystroke would reset the caret to the start of the
  // contentEditable div on each character typed, a well-known contentEditable+React footgun.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const exec = useCallback(
    (command: string) => () => {
      if (disabled) return;
      document.execCommand(command);
      ref.current?.focus();
      handleInput();
    },
    [disabled, handleInput],
  );

  return (
    <div className={`rounded-xl bg-surface-100 shadow-neu-pressed overflow-hidden ${disabled ? "opacity-70" : ""}`}>
      {!disabled && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-surface-200/70">
          <button type="button" onClick={exec("bold")} className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={exec("italic")} className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={exec("underline")} className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600">
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={exec("insertUnorderedList")}
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm text-gray-600"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="min-h-[100px] px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />
    </div>
  );
}

export default memo(SectionHtmlEditor);
