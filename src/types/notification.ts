/**
 * Mirrors InnerEye.DMS.Foundation.Enums.NotificationTargetType, NotificationStatus, and
 * NotificationType — all three are serialized via the backend's global
 * JsonStringEnumConverter(JsonNamingPolicy.CamelCase, false), so a PascalCase C# member
 * (e.g. "General") reaches the wire lowercased ("general"), not verbatim.
 */
export type NotificationTargetType = "broadcast" | "group" | "user";
export type NotificationStatus = "pending" | "processing" | "dispatched" | "failed";

/**
 * Mirrors InnerEye.DMS.Foundation.Enums.NotificationType. This is a starting set (backend
 * doc comment: "extend it as real notification templates are categorized") — when the
 * backend enum gains a member, add it here and to NOTIFICATION_TYPE_META in
 * components/notifications/notificationTypeMeta.ts, nowhere else.
 */
export type NotificationType = "general" | "approval" | "workflow" | "reminder" | "system";

/** Mirrors InnerEye.DMS.Foundation.Payloads.Notifications.NotificationListItemDto. */
export interface NotificationListItem {
  /** NotificationRecipient.Id — use this (not notificationId) for mark-read/open calls. */
  id: number;
  notificationId: number;
  templateCode: string;
  targetType: NotificationTargetType;
  type: NotificationType;
  title: string;
  message: string;
  deepLink: string | null;
  status: NotificationStatus;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Common.PagedResultDto<T>. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Notifications.NotificationUnreadCountDto. */
export interface NotificationUnreadCount {
  unreadCount: number;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Notifications.MarkAllReadResultDto. */
export interface MarkAllReadResult {
  markedCount: number;
  unreadCount: number;
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.Notifications.NotificationOpenResultDto. */
export interface NotificationOpenResult {
  id: number;
  deepLink: string | null;
  unreadCount: number;
}

/**
 * The anonymous object NotificationService.SendAsync pushes as the "notification:new" SignalR
 * event — NOT the same shape as NotificationListItem (this carries Notification.Id, not the
 * per-recipient NotificationRecipient.Id that mark-read/open need). Realtime-only signal: on
 * receipt, refetch the unread count and/or feed rather than trying to splice this payload
 * directly into NotificationListItem state.
 */
export interface RealtimeNotificationPayload {
  id: number;
  templateCode: string;
  type: NotificationType;
  title: string;
  message: string;
  deepLink: string | null;
  createdAt: string;
}

export interface NotificationFeedParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  search?: string;
  type?: NotificationType;
}

export interface NotificationFilters {
  search: string;
  type: NotificationType | "";
  unreadOnly: boolean;
}

export interface NotificationFeedState {
  items: NotificationListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
  /** Initial load or a reset caused by a filter change — replaces `items`. */
  loading: boolean;
  /** Infinite-scroll "load more" — appends to `items`. */
  loadingMore: boolean;
  filters: NotificationFilters;
}

export interface NotificationState {
  dropdownItems: NotificationListItem[];
  dropdownLoading: boolean;
  unreadCount: number;
  feed: NotificationFeedState;
  error: string | null;
}
