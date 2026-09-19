import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Wraps a template section's content in a `<div data-section-id="..." data-section-kind="...">`
 * so the full-page popup editor can present header+body-sections+footer as one continuous
 * document while remaining decomposable back into individual `TemplateSection` rows on Save
 * (see `composeSections.ts`). Plain unregistered `data-*` attributes on a generic div would
 * otherwise be stripped by ProseMirror's DOM parser — `addAttributes()` is what makes them
 * survive round-tripping through the editor.
 */
export const SectionMarkerExtension = Node.create({
  name: "sectionMarker",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      sectionId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-section-id"),
        renderHTML: (attributes) => (attributes.sectionId == null ? {} : { "data-section-id": attributes.sectionId }),
      },
      sectionKind: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-section-kind"),
        renderHTML: (attributes) =>
          attributes.sectionKind == null ? {} : { "data-section-kind": attributes.sectionKind },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-section-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});
