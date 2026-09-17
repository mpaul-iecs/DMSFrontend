import type { TemplateStatus } from "../types/template";

/** Shared uppercase display text for a TemplateStatus wire value, used anywhere status
 * renders as plain text OUTSIDE TemplateStatusStepper (whose own step labels stay
 * title-case and are not driven by this map). See CLAUDE.md's "Template governance" note. */
export const STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: "DRAFT",
  pendingApproval: "PENDING APPROVAL",
  approved: "APPROVED",
  rejected: "REJECTED",
  deprecated: "DEPRECATED",
};
