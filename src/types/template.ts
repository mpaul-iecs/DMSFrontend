/**
 * Template Governance types — mirror InnerEye.DMS.Foundation.Payloads.Templates.* DTOs
 * field-for-field, same convention as types/auth.ts. All enums serialize camelCase string
 * via JsonStringEnumConverter(JsonNamingPolicy.CamelCase, false).
 */

export type TemplateSectionKind = "header" | "footer" | "section";

export type TemplateStatus = "draft" | "pendingApproval" | "approved" | "rejected" | "deprecated";

export type TemplateFieldType = "text" | "textArea" | "number" | "date" | "dropdown" | "checkbox";

/**
 * [Flags] on the backend — a single template's own `creationMode` is always exactly one
 * value in practice, but `TemplateTypeDto.allowedCreationModes` CAN combine both bits,
 * which System.Text.Json serializes as a comma-joined string, e.g. "formBuilder, docxUpload".
 * Use this closed union only for single-value fields (Template.creationMode,
 * CreateTemplateDraftRequestDto.creationMode) — allowedCreationModes is typed as a plain
 * string below to defensively handle the combined-flags case.
 */
export type TemplateCreationMode = "formBuilder" | "docxUpload";

/** {{x}} / [[x]] / [x] */
export type TemplatePlaceholderFormat = "doubleCurly" | "doubleSquare" | "singleSquare";

export type TemplateReviewOutcome = "pending" | "approved" | "rejected";

export type TemplateReviewTriggerReason = "initial" | "scheduled" | "contentChanged" | "intervalChanged";

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateListItemDto */
export interface TemplateListItemDto {
  id: number;
  templateName: string;
  templateTypeId: number;
  departmentId: number;
  departmentName: string;
  creationMode: TemplateCreationMode;
  status: TemplateStatus;
  versionNumber: number;
  versionLabel: string;
  isLatestVersion: boolean;
  nextReviewDueOn: string | null;
  updatedAt: string;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateDto */
export interface TemplateDto extends TemplateListItemDto {
  parentTemplateId: number | null;
  placeholderFormat: TemplatePlaceholderFormat;
  fileName: string | null;
  reviewInDays: number;
  lastApprovedOn: string | null;
  lastPageWidth: number | null;
  lastPageHeight: number | null;
  sections: TemplateSectionDto[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateSectionDto */
export interface TemplateSectionDto {
  id: number;
  templateId: number;
  sectionKind: TemplateSectionKind;
  sectionKey: string;
  label: string;
  titleVisibleInDocument: boolean;
  isTitleLocked: boolean;
  isBodyLocked: boolean;
  isRequired: boolean;
  defaultContentHtml: string;
  placeholderText: string | null;
  sectionOrder: number;
  pageIndex: number | null;
  overlayLeft: number | null;
  overlayTop: number | null;
  overlayWidth: number | null;
  overlayHeight: number | null;
  boundBookmarkTag: string | null;
  fields: TemplateFieldDto[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.UpsertSectionRequestDto — id null=create, set=update. */
export interface UpsertSectionRequestDto {
  id: number | null;
  sectionKind: TemplateSectionKind;
  sectionKey: string;
  label: string;
  titleVisibleInDocument: boolean;
  isTitleLocked: boolean;
  isBodyLocked: boolean;
  isRequired: boolean;
  defaultContentHtml: string;
  placeholderText: string | null;
  sectionOrder: number;
  pageIndex: number | null;
  overlayLeft: number | null;
  overlayTop: number | null;
  overlayWidth: number | null;
  overlayHeight: number | null;
  boundBookmarkTag: string | null;
  fields: UpsertFieldRequestDto[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateFieldDto */
export interface TemplateFieldDto {
  id: number;
  sectionId: number;
  fieldKey: string;
  fieldLabel: string;
  fieldType: TemplateFieldType;
  isRequired: boolean;
  defaultValue: string | null;
  validationRegex: string | null;
  fieldOrder: number;
  options: TemplateFieldOptionDto[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.UpsertFieldRequestDto — id null=create, set=update. */
export interface UpsertFieldRequestDto {
  id: number | null;
  fieldKey: string;
  fieldLabel: string;
  fieldType: TemplateFieldType;
  isRequired: boolean;
  defaultValue: string | null;
  validationRegex: string | null;
  fieldOrder: number;
  options: UpsertFieldOptionRequestDto[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateFieldOptionDto */
export interface TemplateFieldOptionDto {
  id: number;
  optionLabel: string;
  optionValue: string;
  optionOrder: number;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.UpsertFieldOptionRequestDto */
export interface UpsertFieldOptionRequestDto {
  optionLabel: string;
  optionValue: string;
  optionOrder: number;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.CreateTemplateDraftRequestDto (POST /templates/draft, formBuilder only). */
export interface CreateTemplateDraftRequestDto {
  templateTypeId: number;
  templateName: string;
  departmentId: number;
  departmentName: string;
  creationMode: TemplateCreationMode;
  placeholderFormat: TemplatePlaceholderFormat;
  reviewInDays: number;
  sections: UpsertSectionRequestDto[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.CreateTemplateDraftFormRequestDto (POST /templates/draft/upload, multipart).
 * No creationMode field — backend hardcodes docxUpload for this endpoint. `file` travels as a
 * separate FormData field alongside these, not part of this interface. */
export interface CreateTemplateDraftFormRequestDto {
  templateTypeId: number;
  templateName: string;
  departmentId: number;
  departmentName: string;
  placeholderFormat: TemplatePlaceholderFormat;
  reviewInDays: number;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.UpdateReviewIntervalRequestDto */
export interface UpdateReviewIntervalRequestDto {
  reviewInDays: number;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.RejectTemplateRequestDto */
export interface RejectTemplateRequestDto {
  remarks: string;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.ReviewCycleDto */
export interface ReviewCycleDto {
  id: number;
  cycleNumber: number;
  triggerReason: TemplateReviewTriggerReason;
  dueOn: string;
  submittedOn: string | null;
  reviewedBy: string | null;
  reviewedOn: string | null;
  outcome: TemplateReviewOutcome;
  resultingVersionLabel: string | null;
  remarks: string | null;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateTypeDto */
export interface TemplateTypeDto {
  id: number;
  typeName: string;
  typeCode: string;
  /** Plain string, not TemplateCreationMode — see the doc comment on TemplateCreationMode above. */
  allowedCreationModes: string;
  isActive: boolean;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.UpsertTemplateTypeRequestDto */
export interface UpsertTemplateTypeRequestDto {
  typeName: string;
  typeCode: string;
  allowedCreationModes: string;
}

/**
 * Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateAuditLogEntryDto
 * (GET /templates/{id}/audit-log). `AuditLog` only stores the raw acting user's id, not a
 * resolved name (identity is ESSP-resolved live elsewhere in this app, not locally
 * joinable) — there is no `performedBy` display name on the wire, only `performedByUserId`.
 * Render it as "User #{id}" until/unless the backend adds a resolved name.
 */
export interface TemplateAuditLogEntryDto {
  id: number;
  action: string;
  oldValues: string | null;
  newValues: string | null;
  performedByUserId: number | null;
  performedAt: string;
}

export interface TemplateState {
  list: TemplateListItemDto[];
  totalCount: number;
  listLoading: boolean;
  listError: string | null;
  filters: { status?: TemplateStatus; departmentId?: number; templateTypeId?: number; page: number; pageSize: number };

  selected: TemplateDto | null;
  selectedLoading: boolean;
  selectedError: string | null;

  reviewHistory: ReviewCycleDto[];
  reviewHistoryLoading: boolean;

  templateTypes: TemplateTypeDto[];
  templateTypesLoading: boolean;

  auditLog: TemplateAuditLogEntryDto[];
  auditLogLoading: boolean;

  saving: boolean;
}
