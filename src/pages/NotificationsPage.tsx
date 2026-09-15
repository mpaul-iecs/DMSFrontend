import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import { CheckCheck, Loader2, Search } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchFeedPageThunk, markAllReadThunk, markReadThunk, openNotificationThunk } from "../store/notification/notificationThunks";
import { markAllReadLocally, markReadLocally, setFeedFilters } from "../store/notification/notificationSlice";
import NotificationRow from "../components/notifications/NotificationRow";
import { NOTIFICATION_TYPE_OPTIONS } from "../components/notifications/notificationTypeMeta";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Checkbox from "../components/ui/Checkbox";
import EmptyState from "../components/ui/EmptyState";
import { IBMPlexSans700 } from "../components/ui/Text";
import type { NotificationListItem, NotificationType } from "../types/notification";

const SEARCH_DEBOUNCE_MS = 350;

interface TypeOption {
  value: NotificationType;
  label: string;
}

const ALL_TYPES_OPTION = null; // react-select's own SingleValue<T> | null shape for "no filter"

function NotificationsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const feed = useAppSelector((s) => s.notification.feed);
  const unreadCount = useAppSelector((s) => s.notification.unreadCount);

  const [searchInput, setSearchInput] = useState(feed.filters.search);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initial load, and reload from page 1 whenever a filter actually changes in redux.
  useEffect(() => {
    dispatch(fetchFeedPageThunk({ reset: true }));
  }, [dispatch, feed.filters.search, feed.filters.type, feed.filters.unreadOnly]);

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        dispatch(setFeedFilters({ search: value }));
      }, SEARCH_DEBOUNCE_MS),
    [dispatch]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
      debouncedSetSearch(e.target.value);
    },
    [debouncedSetSearch]
  );

  const typeValue = useMemo<TypeOption | null>(
    () => NOTIFICATION_TYPE_OPTIONS.find((o) => o.value === feed.filters.type) ?? ALL_TYPES_OPTION,
    [feed.filters.type]
  );

  const handleTypeChange = useCallback(
    (option: TypeOption | null) => {
      dispatch(setFeedFilters({ type: option?.value ?? "" }));
    },
    [dispatch]
  );

  const handleUnreadOnlyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setFeedFilters({ unreadOnly: e.target.checked }));
    },
    [dispatch]
  );

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
      if (item.deepLink) navigate(item.deepLink);
    },
    [dispatch, navigate]
  );

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllReadLocally());
    dispatch(markAllReadThunk());
  }, [dispatch]);

  const loadMore = useCallback(() => {
    dispatch(fetchFeedPageThunk({ reset: false }));
  }, [dispatch]);

  // Infinite scroll — observe a sentinel at the bottom of the list instead of a scroll
  // listener, so nothing runs on every scroll tick.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && feed.hasMore && !feed.loading && !feed.loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed.hasMore, feed.loading, feed.loadingMore, loadMore]);

  return (
    <div className="flex flex-col gap-5 max-w-225">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <IBMPlexSans700 as="h1" className="text-xl text-gray-900">
          Notifications
        </IBMPlexSans700>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by title or message..."
              className="pl-10"
            />
          </div>
          <Select<TypeOption>
            options={NOTIFICATION_TYPE_OPTIONS}
            value={typeValue}
            onChange={handleTypeChange}
            placeholder="All types"
            className="sm:w-48"
          />
          <div className="pb-2.5 sm:pb-0 sm:h-10.5 flex items-center">
            <Checkbox
              label="Unread only"
              checked={feed.filters.unreadOnly}
              onChange={handleUnreadOnlyChange}
            />
          </div>
        </div>
      </Card>

      <Card noPadding>
        {feed.loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : feed.items.length === 0 ? (
          <EmptyState message="No notifications match your filters" />
        ) : (
          <>
            <div className="divide-y divide-surface-200">
              {feed.items.map((item) => (
                <NotificationRow key={item.id} item={item} onOpen={handleOpenItem} onMarkRead={handleMarkRead} />
              ))}
            </div>
            <div ref={sentinelRef} className="flex items-center justify-center py-4">
              {feed.loadingMore && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default memo(NotificationsPage);
