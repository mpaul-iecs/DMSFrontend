import { forwardRef, memo, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { buildFocusedExtensions } from "./core/focusedExtensions";
import Toolbar from "./toolbar/Toolbar";
import "./editor.css";

interface SectionInlineEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Fires whenever this section's editor gains focus — SectionBuilder uses this to track
   * which section a click on the field panel should insert into. */
  onFocusSection?: () => void;
}

/** Imperative handle exposed via ref — lets a sibling control (e.g. the field-insertion
 * panel) insert text at the editor's current cursor position. */
export interface SectionInlineEditorHandle {
  insertAtCursor: (text: string) => void;
}

/**
 * Real Tiptap-backed replacement for the old `contentEditable`+`execCommand` stand-in
 * (`components/template/SectionHtmlEditor.tsx`, now deleted) — same external contract
 * (plain HTML string in/out, `disabled` = read-only), a focused toolbar (bold/italic/
 * underline/strike, alignment, colors, fonts, headings, lists, links, tables, images,
 * undo/redo, clear formatting), no pagination (this edits one section's HTML fragment,
 * not a whole paginated document — see `FullPageEditor.tsx` for that).
 *
 * `insertAtCursor` is now a plain `editor.chain().focus().insertContent(text).run()` —
 * ProseMirror retains selection state independently of DOM focus, so the old
 * capture-before-blur `Range` workaround (needed only for raw `contentEditable`) is gone.
 */
const SectionInlineEditor = forwardRef<SectionInlineEditorHandle, SectionInlineEditorProps>(
  function SectionInlineEditor({ value, onChange, disabled = false, placeholder, onFocusSection }, ref) {
    const editor = useEditor({
      extensions: buildFocusedExtensions(placeholder),
      content: value || "<p></p>",
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "min-h-[100px] px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none",
        },
      },
      onUpdate: ({ editor: e }) => onChange(e.getHTML()),
      onFocus: () => onFocusSection?.(),
    });

    // `value` only reflects the INITIAL content or a save round-trip, never per keystroke
    // (onUpdate already reports every change upward) — only hydrate when the editor isn't
    // focused and content actually differs, so a normalized save echo can't yank content
    // back out from under an in-progress edit. Same guard DMSEditor's DocumentEditor uses.
    useEffect(() => {
      if (!editor || editor.isDestroyed || editor.isFocused) return;
      const incoming = value || "";
      if (incoming !== editor.getHTML()) {
        editor.commands.setContent(incoming, { emitUpdate: false });
      }
    }, [editor, value]);

    useEffect(() => {
      if (editor) editor.setEditable(!disabled);
    }, [editor, disabled]);

    useImperativeHandle(
      ref,
      () => ({
        insertAtCursor: (text: string) => {
          if (disabled || !editor) return;
          editor.chain().focus().insertContent(text).run();
        },
      }),
      [disabled, editor],
    );

    return (
      <div className={`rounded-xl bg-surface-100 shadow-neu-pressed overflow-hidden ${disabled ? "opacity-70" : ""}`}>
        {!disabled && editor && <Toolbar editor={editor} scope="focused" />}
        <EditorContent editor={editor} />
      </div>
    );
  },
);

export default memo(SectionInlineEditor);
