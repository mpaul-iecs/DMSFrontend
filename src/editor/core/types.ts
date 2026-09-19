import type { ReactNode } from "react";

/**
 * Domain-agnostic section shape the editor engine works with — deliberately not
 * `TemplateSectionDto`. `TemplateEditorPage.tsx` maps template sections into this shape;
 * a future document-editing page would map its own data the same way, so `FullPageEditor`
 * never needs to import anything template-specific. See DMSFrontend/CLAUDE.md's
 * "Editor" section for the reusability rationale.
 */
export type EditorSectionKind = "header" | "footer" | "body";

export interface EditorSectionInput {
  id: number;
  kind: EditorSectionKind;
  order: number;
  /** 1-based page a body section belongs to (undefined = page 1). Header/footer ignore it. */
  page?: number;
  /** Section heading rendered above the body (bold, normal size) when set — the template's
   * `titleVisibleInDocument` label. Never set for header/footer. */
  title?: string;
  html: string;
}

export interface EditorSectionChange {
  id: number;
  html: string;
}

export interface FullPageEditorProps {
  initialSections: EditorSectionInput[];
  editable: boolean;
  onSave?: (changed: EditorSectionChange[]) => Promise<void> | void;
  saving?: boolean;
  /** Caller-supplied field-insertion UI (e.g. TemplateFieldPanel), rendered with an
   * `insertAtCursor` callback bound to this editor's own instance — omitted entirely for
   * non-template contexts (plain document editing has no field/placeholder concept). */
  fieldPanel?: (insertAtCursor: (token: string) => void) => ReactNode;
  title?: string;
  /** Fires once the editor has mounted and painted its first frame — lets the caller keep a
   * loading skeleton on screen through the (synchronous, heavy) extension setup. */
  onReady?: () => void;
}

/** A field the FieldPanel can insert — domain-agnostic (label + the ready-to-insert token). */
export interface InsertableField {
  label: string;
  token: string;
}
