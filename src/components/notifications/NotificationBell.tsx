import { memo, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import NotificationRow from "./NotificationRow";
import useClickOutside from "../../hooks/useClickOutside";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchDropdownFeedThunk,
  markAllReadThunk,
  markReadThunk,
  openNotificationThunk,
} from "../../store/notification/notificationThunks";
import { markAllReadLocally, markReadLocally } from "../../store/notification/notificationSlice";
import { IBMPlexSans600 } from "../ui/Text";
import type { NotificationListItem } from "../../types/notification";

const BADGE_MAX = 99;

function NotificationBell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useAppSelector((s) => s.notification.dropdownItems);
  const loading = useAppSelector((s) => s.notification.dropdownLoading);
  const unreadCount = useAppSelector((s) => s.notification.unreadCount);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) dispatch(fetchDropdownFeedThunk());
      return next;
    });
  }, [dispatch]);

  const handleMarkRead = useCallback(
    (id: number) => {
      dispatch(markReadLocally(id));
      dispatch(markReadThunk(id));
    },
    [dispatch]
  );

  const handleOpenItem = useCallback(
    (item: NotificationListItem) => {
      dispatch(markReadLocally(item.id));
      dispatch(openNotificationThunk(item.id));
      setOpen(false);
      if (item.deepLink) navigate(item.deepLink);
    },
    [dispatch, navigate]
  );

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllReadLocally());
    dispatch(markAllReadThunk());
  }, [dispatch]);

  const handleViewAll = useCallback(() => {
    setOpen(false);
    navigate("/notifications");
  }, [navigate]);

  const badgeLabel = unreadCount > BADGE_MAX ? `${BADGE_MAX}+` : String(unreadCount);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggleOpen}
        className="p-2.5 rounded-xl shadow-neu-raised-sm hover:shadow-neu-pressed-sm transition-shadow relative cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger-500 text-white text-[10px] flex items-center justify-center leading-none">
            <IBMPlexSans600 as="span">{badgeLabel}</IBMPlexSans600>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-88 max-w-[90vw] bg-surface-100 rounded-2xl shadow-neu-raised z-40 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
            <IBMPlexSans600 as="h2" className="text-sm text-gray-900">
              Notifications
            </IBMPlexSans600>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-88 overflow-y-auto divide-y divide-surface-200">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No notifications yet</p>
            ) : (
              items.map((item) => (
                <NotificationRow key={item.id} item={item} onOpen={handleOpenItem} onMarkRead={handleMarkRead} dense />
              ))
            )}
          </div>

          <button
            onClick={handleViewAll}
            className="text-center text-sm text-primary-600 hover:text-primary-700 py-3 border-t border-surface-200 cursor-pointer"
          >
            View all
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(NotificationBell);
