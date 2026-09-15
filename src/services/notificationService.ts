import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { BaseResponse } from "../types/auth";
import type {
  MarkAllReadResult,
  NotificationFeedParams,
  NotificationListItem,
  NotificationOpenResult,
  NotificationUnreadCount,
  PagedResult,
} from "../types/notification";

/** All raw HTTP calls for the notification domain live here — thunks only orchestrate them. */
const notificationService = {
  getFeed: (params: NotificationFeedParams = {}, signal?: AbortSignal) =>
    api.get<BaseResponse<PagedResult<NotificationListItem>>>(endpoints.notifications.feed, {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        unreadOnly: params.unreadOnly,
        search: params.search || undefined,
        type: params.type,
      },
      signal,
    }),

  getUnreadCount: () => api.get<BaseResponse<NotificationUnreadCount>>(endpoints.notifications.unreadCount),

  markRead: (id: number) => api.post<BaseResponse<boolean>>(endpoints.notifications.markRead(id)),

  markAllRead: () => api.post<BaseResponse<MarkAllReadResult>>(endpoints.notifications.markAllRead),

  open: (id: number) => api.post<BaseResponse<NotificationOpenResult>>(endpoints.notifications.open(id)),
};

export default notificationService;
