import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { ListItem } from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { Dropcursor, Gapcursor, Placeholder, TrailingNode } from "@tiptap/extensions";
import type { AnyExtension } from "@tiptap/core";

/** Extensions every editor instance needs regardless of scope (document/paragraph/text
 * primitives, cursor helpers, the empty-state placeholder). Ported from DMSEditor's
 * DocumentEditor.jsx `BaseKit`. Kept in its own module (no `reactjs-tiptap-editor` imports)
 * so both `focusedExtensions.ts` and `fullExtensions.ts` can share it without either one
 * pulling in the other's dependency weight. */
export function buildBaseKit(placeholder = "Write here…"): AnyExtension[] {
  return [
    Document,
    Text,
    Dropcursor.configure({ width: 2 }),
    Gapcursor,
    HardBreak,
    Paragraph,
    TrailingNode,
    ListItem,
    TextStyle,
    Placeholder.configure({ placeholder }),
  ];
}
