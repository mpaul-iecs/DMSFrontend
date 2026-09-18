/**
 * Template Governance types — mirror InnerEye.DMS.Foundation.Payloads.Templates.* DTOs
 * field-for-field, same convention as types/auth.ts. All enums serialize camelCase string
 * via JsonStringEnumConverter(JsonNamingPolicy.CamelCase, false).
 */

export type TemplateSectionKind = "header" | "footer" | "section";

export type TemplateStatus = "draft" | "pendingApproval" | "approved" | "rejected" | "deprecated";


/**
 * [Flags] on the backend — a single template's own `creationMode` is always exactly one
 * value in practice, but `TemplateTypeDto.allowedCreationModes` CAN combine both bits,
 * which System.Text.Json serializes as a comma-joined string, e.g. "formBuilder, docxUpload".
 * Use this closed union only for single-value fields (Template.creationMode,
 * CreateTemplateDraftRequestDto.creationMode) — allowedCreationModes is typed as a plain
 * string below to defensively handle the combined-flags case.
 */
export type TemplateCreationMode = "formBuilder" | "docxUpload";

/** {{x}} / [[x]] / [x] / {x} / (x) */
export type TemplatePlaceholderFormat =
  | "doubleCurly"
  | "doubleSquare"
  | "singleSquare"
  | "singleCurly"
  | "parentheses";

export type TemplateReviewOutcome = "pending" | "approved" | "rejected";

export type TemplateReviewTriggerReason = "initial" | "scheduled" | "contentChanged" | "intervalChanged";

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateListItemDto */
export interface TemplateListItemDto {
  /** TemplateVersion.Id — unchanged meaning; /templates/{id} routes use this. */
  id: number;
  /** Template.Id — the family id (new since the backend's Template/TemplateVersion split). */
  templateId: number;
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
  // parentTemplateId removed — the backend's Template/TemplateVersion split replaced the
  // self-referencing parent-pointer lineage with a plain TemplateVersion.TemplateId FK.
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

/**
 * Mirrors InnerEye.DMS.Foundation.Payloads.Templates.TemplateFieldDto. A field is nothing more
 * than a named placeholder token — `fieldKey` wraps into the owning template's configured bracket
 * format (see `utilities/placeholder.ts#wrapPlaceholder`) when inserted into a section's content.
 * Deliberately no type/validation/default-value/options — that richer "form field" shape was
 * built and removed the same day (2026-09-18) once it was clear the actual feature is just a
 * named token, not a data-collection form field. See CLAUDE.md's "Template governance" section.
 */
export interface TemplateFieldDto {
  id: number;
  templateVersionId: number;
  fieldKey: string;
  fieldLabel: string;
  fieldOrder: number;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Templates.UpsertFieldRequestDto — id null=create, set=update.
 * `templateVersionId` is nullable and only meaningful for the standalone `POST /Fields` route
 * (`fieldService.ts`) — the nested `Templates/{id}/fields` routes (`templateService.ts`) derive
 * the version from their own route param and ignore this field. */
export interface UpsertFieldRequestDto {
  id: number | null;
  templateVersionId?: number | null;
  fieldKey: string;
  fieldLabel: string;
  fieldOrder: number;
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
  savingTemplateType: boolean;

  auditLog: TemplateAuditLogEntryDto[];
  auditLogLoading: boolean;

  versions: TemplateListItemDto[];
  versionsLoading: boolean;

  saving: boolean;
}
