import { CheckCircle2, Clock, Info, Settings, Workflow, type LucideIcon } from "lucide-react";
import type { NotificationType } from "../../types/notification";

interface NotificationTypeMeta {
  label: string;
  Icon: LucideIcon;
  colorClassName: string;
}

/**
 * Per-type icon/color for the bell/feed — mirrors InnerEye.DMS.Foundation.Enums.NotificationType
 * (see types/notification.ts's own doc comment). Add a new type here (and to the TS union) the
 * same day it's added on the backend — nowhere else needs to know about it.
 */
export const NOTIFICATION_TYPE_META: Record<NotificationType, NotificationTypeMeta> = {
  general: { label: "General", Icon: Info, colorClassName: "text-gray-500" },
  approval: { label: "Approval", Icon: CheckCircle2, colorClassName: "text-success-600" },
  workflow: { label: "Workflow", Icon: Workflow, colorClassName: "text-primary-600" },
  reminder: { label: "Reminder", Icon: Clock, colorClassName: "text-warning-600" },
  system: { label: "System", Icon: Settings, colorClassName: "text-gray-500" },
};

export const NOTIFICATION_TYPE_OPTIONS: { value: NotificationType; label: string }[] = (
  Object.keys(NOTIFICATION_TYPE_META) as NotificationType[]
).map((value) => ({ value, label: NOTIFICATION_TYPE_META[value].label }));
