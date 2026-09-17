import * as yup from "yup";

/**
 * Client-side placeholder-token regexes — mirror the backend's exact patterns
 * (FieldKeyNotFoundInSectionContentException / InvalidPlaceholderSyntaxException) so the
 * inline builder hint is accurate. Not authoritative — the backend still validates on save.
 */
export const PLACEHOLDER_REGEX: Record<string, RegExp> = {
  doubleCurly: /\{\{\s*([\w.]+)\s*\}\}/g,
  doubleSquare: /\[\[\s*([\w.]+)\s*\]\]/g,
  singleSquare: /(?<!\[)\[\s*([\w.]+)\s*\](?!\])/g,
};

/** Returns the set of field keys referenced as placeholder tokens in `html`, for the given bracket format. */
export function extractPlaceholderKeys(html: string, format: string): Set<string> {
  const regex = PLACEHOLDER_REGEX[format] ?? PLACEHOLDER_REGEX.doubleCurly;
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(regex.source, regex.flags);
  while ((match = re.exec(html)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

export const templateDraftSchema = yup.object({
  templateName: yup.string().required("Template name is required"),
  templateTypeId: yup.number().required("Template type is required").typeError("Template type is required"),
  department: yup
    .object({
      value: yup.number().required(),
      label: yup.string().required(),
    })
    .required("Department is required")
    .typeError("Department is required"),
  reviewInDays: yup
    .number()
    .typeError("Review interval must be a number")
    .required("Review interval is required")
    .integer("Review interval must be a whole number")
    .positive("Review interval must be positive"),
});

export const sectionSchema = yup.object({
  label: yup.string().required("Section label is required"),
  sectionKey: yup.string().required("Section key is required"),
});

export const fieldSchema = yup.object({
  fieldKey: yup.string().required("Field key is required"),
  fieldLabel: yup.string().required("Field label is required"),
});

export const reviewIntervalSchema = yup.object({
  reviewInDays: yup
    .number()
    .typeError("Review interval must be a number")
    .required("Review interval is required")
    .integer("Review interval must be a whole number")
    .positive("Review interval must be positive"),
});

export const rejectRemarksSchema = yup.object({
  remarks: yup.string().required("Remarks are required when rejecting a template"),
});
