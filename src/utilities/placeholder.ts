import type { TemplatePlaceholderFormat } from "../types/template";

/** Wraps a field's `fieldKey` in the bracket syntax for the given placeholder format, for
 * inserting a ready-to-use token into a section's HTML (e.g. the "insert placeholder" dropdown
 * in TemplateBuilderForm.tsx's SectionRow). Mirrors PLACEHOLDER_REGEX's bracket shapes in
 * validations/templateValidation.ts — keep both in sync if a new format is ever added. */
export function wrapPlaceholder(fieldKey: string, format: TemplatePlaceholderFormat): string {
  switch (format) {
    case "doubleCurly":
      return `{{${fieldKey}}}`;
    case "doubleSquare":
      return `[[${fieldKey}]]`;
    case "singleSquare":
      return `[${fieldKey}]`;
    case "singleCurly":
      return `{${fieldKey}}`;
    case "parentheses":
      return `(${fieldKey})`;
  }
}
