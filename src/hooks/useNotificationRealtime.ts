import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { startNotificationHub, stopNotificationHub, onNewNotification } from "../services/notificationHub";
import { fetchDropdownFeedThunk, fetchFeedPageThunk, fetchUnreadCountThunk } from "../store/notification/notificationThunks";
import { NOTIFICATION_TYPE_META } from "../components/notifications/notificationTypeMeta";
import toast from "../utilities/toast";
import type { RealtimeNotificationPayload } from "../types/notification";

/**
 * Owns the SignalR notification connection's lifecycle for the whole authenticated app —
 * mounted once in AppLayout, not per-component, so there's exactly one connection regardless
 * of how many components care about notifications. On a "notification:new" push:
 * - refetches the unread count (badge)
 * - refetches the dropdown's top-20 (so it's fresh next open, and re-renders in place if
 *   already open — NotificationBell reads this same redux state)
 * - if the notifications page is the current route, reloads its feed from page 1 too
 * - shows a realtime toast
 *
 * The push payload's own `id` is Notification.Id, not the per-recipient id the REST feed/
 * mark-read calls use (see RealtimeNotificationPayload's doc comment in types/notification.ts),
 * so there's nothing to splice directly into redux state — every one of the above is a
 * (cheap, top-of-list-sized) refetch rather than a local mutation.
 */
export default function useNotificationRealtime() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    dispatch(fetchUnreadCountThunk());
    startNotificationHub().catch(() => {
      // Non-fatal — the REST feed/badge still work via polling-on-open; SignalR's own
      // withAutomaticReconnect keeps retrying once a connection does succeed.
    });

    const unsubscribe = onNewNotification((payload: RealtimeNotificationPayload) => {
      dispatch(fetchUnreadCountThunk());
      dispatch(fetchDropdownFeedThunk());
      // Data routers keep window.location in sync with the current route, so this needs no
      // extra useLocation subscription (which would tear down and resubscribe the hub on
      // every navigation for no benefit — this handler only cares about the route *at the
      // moment a push arrives*, not at effect-setup time).
      if (window.location.pathname.startsWith("/notifications")) {
        dispatch(fetchFeedPageThunk({ reset: true }));
      }

      const meta = NOTIFICATION_TYPE_META[payload.type] ?? NOTIFICATION_TYPE_META.general;
      toast.info(
        `${meta.label}: ${payload.title}`,
        payload.deepLink ? { onClick: () => navigate(payload.deepLink!) } : undefined,
      );
    });

    return unsubscribe;
  }, [isAuthenticated, dispatch, navigate]);

  useEffect(() => {
    if (!isAuthenticated) stopNotificationHub();
  }, [isAuthenticated]);
}
