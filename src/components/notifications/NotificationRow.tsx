import { memo, useCallback } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { NOTIFICATION_TYPE_META } from "./notificationTypeMeta";
import { formatRelativeTime } from "../../utilities/relativeTime";
import { IBMPlexSans400, IBMPlexSans600 } from "../ui/Text";
import Tooltip from "../ui/Tooltip";
import type { NotificationListItem } from "../../types/notification";

interface NotificationRowProps {
  item: NotificationListItem;
  /** Has a deep link — navigates to it (and marks read) when the row is clicked. */
  onOpen: (item: NotificationListItem) => void;
  /** No deep link, or the explicit "mark read" affordance — marks read without navigating. */
  onMarkRead: (id: number) => void;
  /** Tighter padding/type size for the bell dropdown vs. the full notifications page. */
  dense?: boolean;
}

const NotificationRow = memo(function NotificationRow({ item, onOpen, onMarkRead, dense = false }: NotificationRowProps) {
  const meta = NOTIFICATION_TYPE_META[item.type];
  const Icon = meta.Icon;

  const handleRowClick = useCallback(() => {
    if (item.deepLink) onOpen(item);
    else if (!item.isRead) onMarkRead(item.id);
  }, [item, onOpen, onMarkRead]);

  const handleMarkReadClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMarkRead(item.id);
    },
    [item.id, onMarkRead]
  );

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-start gap-3 cursor-pointer hover:bg-surface-200/50 transition-colors ${
        dense ? "px-4 py-3" : "px-5 py-3.5"
      }`}
    >
      {/* Unread indicator — filled dot when unread, transparent spacer otherwise so content stays aligned. */}
      <span
        className={`mt-2 w-2 h-2 rounded-full shrink-0 ${item.isRead ? "bg-transparent" : "bg-primary-500"}`}
        aria-hidden="true"
      />

      <div
        className={`rounded-lg bg-surface-100 shadow-neu-raised-sm flex items-center justify-center shrink-0 ${
          dense ? "w-7 h-7" : "w-8 h-8"
        }`}
      >
        <Icon className={`${meta.colorClassName} ${dense ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm text-gray-900 ${dense ? "truncate" : ""}`}>
          {item.isRead ? (
            <IBMPlexSans400>{item.title}</IBMPlexSans400>
          ) : (
            <IBMPlexSans600>{item.title}</IBMPlexSans600>
          )}
        </p>
        <p className={`text-gray-500 text-xs mt-0.5 ${dense ? "truncate" : "line-clamp-2"}`}>{item.message}</p>
        <p className="text-gray-400 text-[11px] mt-1">{formatRelativeTime(item.createdAt)}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {item.deepLink && (
          <Tooltip content="Opens a linked page">
            <span className="p-1 text-primary-500 inline-flex">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </Tooltip>
        )}
        {!item.isRead && (
          <Tooltip content="Mark as read">
            <button
              type="button"
              onClick={handleMarkReadClick}
              aria-label="Mark as read"
              className="p-1 rounded-md text-gray-400 hover:text-primary-600 hover:shadow-neu-pressed-sm transition-shadow cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
});

export default NotificationRow;
