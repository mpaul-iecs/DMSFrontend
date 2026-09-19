import type { EditorSectionChange, EditorSectionInput } from "./core/types";

/** Wraps each `body`-kind section's HTML in a `data-section-id`/`data-section-kind` marker
 * div and concatenates them (sorted by `order`) into the one HTML string the full-page
 * editor loads as its document body. Header/footer sections are NOT included here — they
 * feed `tiptap-pagination-plus`'s own `headerLeft`/`footerLeft` config instead (see
 * `FullPageEditor.tsx`), but are still wrapped the same way so they can round-trip through
 * the same `decomposeHtmlToSections` when their own edit dialog saves. */
export function wrapSectionHtml(section: EditorSectionInput): string {
  return `<div data-section-id="${section.id}" data-section-kind="${section.kind}">${section.html || "<p></p>"}</div>`;
}

export function composeSectionsToHtml(sections: EditorSectionInput[]): string {
  const body = sections
    .filter((s) => s.kind === "body")
    .slice()
    .sort((a, b) => a.order - b.order);
  if (body.length === 0) return "<p></p>";
  return body.map(wrapSectionHtml).join("");
}

/** Inverse of `composeSectionsToHtml` — parses the editor's serialized HTML and extracts
 * each marked section's inner HTML, keyed by the id `SectionMarkerExtension` preserved. */
export function decomposeHtmlToSections(html: string): EditorSectionChange[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll<HTMLElement>("[data-section-id]")).map((el) => ({
    id: Number(el.getAttribute("data-section-id")),
    html: el.innerHTML,
  }));
}
