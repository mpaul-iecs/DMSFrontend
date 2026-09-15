import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { startNotificationHub, stopNotificationHub, onNewNotification } from "../services/notificationHub";
import { fetchUnreadCountThunk } from "../store/notification/notificationThunks";
import { NOTIFICATION_TYPE_META } from "../components/notifications/notificationTypeMeta";
import toast from "../utilities/toast";
import type { RealtimeNotificationPayload } from "../types/notification";

/**
 * Owns the SignalR notification connection's lifecycle for the whole authenticated app —
 * mounted once in AppLayout, not per-component, so there's exactly one connection regardless
 * of how many components care about notifications. On a "notification:new" push: shows a
 * realtime toast and refetches the unread count (the push payload's own `id` is
 * Notification.Id, not the per-recipient id the REST feed/mark-read calls use, so there's
 * nothing to splice directly into redux state here — see RealtimeNotificationPayload's doc
 * comment in types/notification.ts).
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
      const meta = NOTIFICATION_TYPE_META[payload.type];
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
