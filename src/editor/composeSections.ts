import { escapeHtml } from "../utilities/html";
import type { EditorSectionChange, EditorSectionInput } from "./core/types";

/** The section heading as a bold, normal-size paragraph. `data-section-title` (registered as a
 * paragraph attribute in SectionMarkerExtension) lets `decomposeHtmlToSections` strip it again
 * so the heading is never saved into the section's own body HTML. */
export function sectionTitleHtml(title: string | undefined): string {
  return title?.trim() ? `<p data-section-title="true"><strong>${escapeHtml(title.trim())}</strong></p>` : "";
}

/** Wraps each `body`-kind section's HTML in a `data-section-id`/`data-section-kind` marker
 * div and concatenates them (sorted by `order`) into the one HTML string the full-page
 * editor loads as its document body. Header/footer sections are NOT included here — they
 * feed `tiptap-pagination-plus`'s own `headerLeft`/`footerLeft` config instead (see
 * `FullPageEditor.tsx`), but are still wrapped the same way so they can round-trip through
 * the same `decomposeHtmlToSections` when their own edit dialog saves. */
export function wrapSectionHtml(section: EditorSectionInput): string {
  return `<div data-section-id="${section.id}" data-section-kind="${section.kind}">${sectionTitleHtml(section.title)}${section.html || "<p></p>"}</div>`;
}

export function composeSectionsToHtml(sections: EditorSectionInput[]): string {
  const body = sections
    .filter((s) => s.kind === "body")
    .slice()
    .sort((a, b) => (a.page ?? 1) - (b.page ?? 1) || a.order - b.order);
  if (body.length === 0) return "<p></p>";
  return body.map(wrapSectionHtml).join("");
}

/** Inverse of `composeSectionsToHtml` — parses the editor's serialized HTML and extracts
 * each marked section's inner HTML, keyed by the id `SectionMarkerExtension` preserved. */
export function decomposeHtmlToSections(html: string): EditorSectionChange[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll<HTMLElement>("[data-section-id]")).map((el) => ({
    id: Number(el.getAttribute("data-section-id")),
    html: stripTitle(el),
  }));
}

/** innerHTML of a section wrapper minus its heading paragraph (see sectionTitleHtml). */
function stripTitle(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-section-title]").forEach((n) => n.remove());
  return clone.innerHTML;
}
