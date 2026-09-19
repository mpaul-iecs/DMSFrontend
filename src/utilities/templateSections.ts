import type { EditorSectionInput } from "../editor";
import type { TemplateSectionDto } from "../types/template";

/** Maps template sections into the domain-agnostic shape the editor engine (FullPageEditor,
 * DocumentPreview) works with. Body sections carry their 1-based page (`pageIndex`, null = 1)
 * and, when `titleVisibleInDocument`, their label as the section heading. Header/footer never
 * get a heading or a page. */
export function toEditorSections(sections: TemplateSectionDto[]): EditorSectionInput[] {
  return sections.map((s) => ({
    id: s.id,
    kind: s.sectionKind === "header" ? "header" : s.sectionKind === "footer" ? "footer" : "body",
    order: s.sectionOrder,
    page: s.pageIndex ?? 1,
    title: s.sectionKind === "section" && s.titleVisibleInDocument ? s.label : undefined,
    html: s.defaultContentHtml,
  }));
}
