import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Bold, Italic, Underline, List } from "lucide-react";

interface SectionHtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Imperative handle exposed via ref — lets a sibling control (e.g. a "insert placeholder"
 * Select dropdown in the same row) insert text at the editor's last-known cursor position,
 * even though clicking that dropdown moves DOM focus away from the contentEditable div first. */
export interface SectionHtmlEditorHandle {
  insertAtCursor: (text: string) => void;
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
 *
 * CURSOR-PRESERVATION GOTCHA: `insertAtCursor` is called from a sibling control (a Select
 * dropdown) AFTER the browser has already moved focus off this contentEditable div — by the
 * time the dropdown's onChange fires, `window.getSelection()` no longer reflects any position
 * inside this editor. To work around this, the editor's own Range is captured continuously
 * (onSelect/onKeyUp/onMouseUp/onBlur — whichever fires last before focus actually leaves) into
 * `lastRangeRef`, cloned via `range.cloneRange()` so later DOM mutations don't invalidate it.
 * `insertAtCursor` then re-focuses the div, restores that saved range onto the live selection,
 * and only then runs `document.execCommand('insertHTML', ...)`. If no range was ever captured
 * (editor never focused/selected — should be rare), it falls back to inserting at the end of
 * the editor's content instead of silently doing nothing.
 */
const SectionHtmlEditor = forwardRef<SectionHtmlEditorHandle, SectionHtmlEditorProps>(function SectionHtmlEditor(
  { value, onChange, disabled = false, placeholder },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastRangeRef = useRef<Range | null>(null);

  // Set innerHTML imperatively only once on mount (and when the field genuinely swaps to a
  // different section, via `key` at the call site) — feeding `value` back into
  // dangerouslySetInnerHTML on every keystroke would reset the caret to the start of the
  // contentEditable div on each character typed, a well-known contentEditable+React footgun.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const captureSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    // Only capture ranges that actually fall inside this editor — a stray click elsewhere
    // shouldn't overwrite a previously-good saved position.
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      lastRangeRef.current = range.cloneRange();
    }
  }, []);

  const exec = useCallback(
    (command: string) => () => {
      if (disabled) return;
      document.execCommand(command);
      editorRef.current?.focus();
      handleInput();
    },
    [disabled, handleInput],
  );

  useImperativeHandle(
    ref,
    () => ({
      insertAtCursor: (text: string) => {
        if (disabled || !editorRef.current) return;
        editorRef.current.focus();
        const selection = window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        if (lastRangeRef.current) {
          selection.addRange(lastRangeRef.current);
        } else {
          // Fallback: no saved range (editor was never focused/selected yet) — insert at the
          // end of the current content instead of silently failing. Should be a rare path.
          const fallbackRange = document.createRange();
          fallbackRange.selectNodeContents(editorRef.current);
          fallbackRange.collapse(false);
          selection.addRange(fallbackRange);
        }
        document.execCommand("insertHTML", false, text);
        handleInput();
      },
    }),
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
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onSelect={captureSelection}
        onKeyUp={captureSelection}
        onMouseUp={captureSelection}
        onBlur={captureSelection}
        data-placeholder={placeholder}
        className="min-h-[100px] px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />
    </div>
  );
});

export default memo(SectionHtmlEditor);
