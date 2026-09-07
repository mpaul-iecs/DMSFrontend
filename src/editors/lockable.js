import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

const LOCKABLE_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "table",
  "callout",
];

/* Role-based structure lock. An admin selects headings / spacer paragraphs / header /
   footer text and toggles the lock; those blocks then carry data-locked="true". When the
   editor is configured `restricted: true` (i.e. an author, not an admin), a
   filterTransaction plugin rejects any change whose result alters a locked block's text,
   attributes, or existence — so the author can type freely in the open areas but can't
   touch or restructure what the admin froze. Enforcement is client-side for now (dummy
   roles); the backend would re-check locked regions against the last admin version once
   real auth lands. */
export const Lockable = Extension.create({
  name: "lockable",

  addOptions() {
    return { restricted: false };
  },

  addGlobalAttributes() {
    return [
      {
        types: LOCKABLE_TYPES,
        attributes: {
          locked: {
            default: false,
            parseHTML: (el) => el.getAttribute("data-locked") === "true",
            renderHTML: (attrs) => (attrs.locked ? { "data-locked": "true" } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      toggleLock:
        () =>
        ({ state, tr, dispatch }) => {
          const { from, to } = state.selection;
          let anyUnlocked = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.isBlock && "locked" in node.attrs && !node.attrs.locked) anyUnlocked = true;
          });
          const nextLocked = anyUnlocked; // lock if anything in range is still open, else unlock all
          let changed = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isBlock && "locked" in node.attrs && node.attrs.locked !== nextLocked) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, locked: nextLocked });
              changed = true;
            }
          });
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const fingerprint = (doc) => {
      const parts = [];
      doc.descendants((node) => {
        if (node.isBlock && node.attrs?.locked) {
          parts.push(`${node.type.name}${JSON.stringify(node.attrs)}${node.textContent}`);
        }
      });
      return parts.join("␞");
    };

    return [
      new Plugin({
        filterTransaction: (tr, state) => {
          if (!options.restricted || !tr.docChanged) return true;
          // The transaction is allowed only if every locked block comes out unchanged.
          return fingerprint(state.doc) === fingerprint(tr.doc);
        },
      }),
    ];
  },
});
