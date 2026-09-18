// Deliberately does NOT re-export FullPageEditor here. FullPageEditor pulls in the full
// DMSEditor extension set (Excalidraw/Mermaid/KaTeX/reactjs-tiptap-editor's style.css, etc.)
// as static side-effecting imports, which are not tree-shakeable — re-exporting it from
// this barrel would drag that entire dependency graph into every bundle that imports
// anything from "../editor" (including SectionInlineEditor, used eagerly in the Template
// Builder form). TemplateEditorPage.tsx instead imports FullPageEditor directly from
// "../editor/FullPageEditor" and is itself lazy-loaded (see routes/AppRoutes.tsx), so this
// heavy code only downloads when the popup editor route is actually opened.
export { default as SectionInlineEditor, type SectionInlineEditorHandle } from "./SectionInlineEditor";
export { default as FieldPanel } from "./FieldPanel";
export type { EditorSectionInput, EditorSectionKind, EditorSectionChange, InsertableField } from "./core/types";
