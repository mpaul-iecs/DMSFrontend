import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const key = new PluginKey("commentHighlight");

/* Review comments as ProseMirror decorations rather than <mark> tags injected into the
   DOM. That's the only approach that survives tiptap-pagination-plus rewriting the
   editor DOM into page containers — decorations are position-based, so PM re-renders the
   highlight wherever the text lands. Comments are { id, from, to, status } in PM
   positions; the review doc doesn't change during review, so positions are stable. */
export const CommentHighlight = Extension.create({
  name: "commentHighlight",

  addOptions() {
    return { comments: [] };
  },

  addStorage() {
    return { comments: this.options.comments || [] };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const size = state.doc.content.size;
            const decos = (storage.comments || [])
              .filter((c) => c.from < c.to && c.to <= size)
              .map((c) =>
                Decoration.inline(c.from, c.to, {
                  class: "cm" + (c.status === "RESOLVED" ? " resolved" : ""),
                  "data-cid": c.id,
                }),
              );
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

/* Push a new comment list into a live editor and force the decorations to redraw. */
export function setComments(editor, comments) {
  if (!editor || editor.isDestroyed) return;
  editor.storage.commentHighlight.comments = comments;
  editor.view.dispatch(editor.state.tr.setMeta(key, true));
}
