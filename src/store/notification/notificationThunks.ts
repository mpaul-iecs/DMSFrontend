import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import notificationService from "../../services/notificationService";
import type { BaseResponse } from "../../types/auth";
import type { MarkAllReadResult, NotificationListItem } from "../../types/notification";
import type { RootState } from "../store";

const FEED_PAGE_SIZE = 10;//30
const DROPDOWN_PAGE_SIZE = 10;//20

const extractErrorMessage = (err: unknown, fallback: string) => {
  const axiosErr = err as AxiosError<BaseResponse<unknown>>;
  return axiosErr.response?.data?.message || fallback;
};

export const fetchDropdownFeedThunk = createAsyncThunk<NotificationListItem[], void, { rejectValue: string }>(
  "notification/fetchDropdownFeed",
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationService.getFeed({ page: 1, pageSize: DROPDOWN_PAGE_SIZE });
      return res.data.responseData?.items ?? [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to load notifications"));
    }
  },
);

export const fetchUnreadCountThunk = createAsyncThunk<number, void, { rejectValue: string }>(
  "notification/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationService.getUnreadCount();
      return res.data.responseData?.unreadCount ?? 0;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to load unread count"));
    }
  },
);

/**
 * Notifications page feed — `reset: true` for the initial load or a filter/search change
 * (replaces the list, resets to page 1); `reset: false`/omitted appends the next page
 * (infinite scroll). Page number and active filters are read from state, not passed in, so
 * every call site just dispatches `fetchFeedPageThunk({ reset })`.
 */
export const fetchFeedPageThunk = createAsyncThunk<
  { items: NotificationListItem[]; totalCount: number; page: number; reset: boolean },
  { reset?: boolean } | undefined,
  { state: RootState; rejectValue: string }
>("notification/fetchFeedPage", async (arg, { getState, rejectWithValue }) => {
  const reset = arg?.reset ?? false;
  const { feed } = getState().notification;
  const page = reset ? 1 : feed.page + 1;

  try {
    const res = await notificationService.getFeed({
      page,
      pageSize: FEED_PAGE_SIZE,
      unreadOnly: feed.filters.unreadOnly || undefined,
      search: feed.filters.search || undefined,
      type: feed.filters.type || undefined,
    });
    const data = res.data.responseData;
    return { items: data?.items ?? [], totalCount: data?.totalCount ?? 0, page, reset };
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to load notifications"));
  }
});

/**
 * Optimistic: the slice flips the item's isRead flag and decrements unreadCount immediately
 * (see notificationSlice's `markReadLocally` reducer, dispatched from the component before
 * this thunk fires) so the bell/list feel instant. On failure this just resyncs the unread
 * count from the server rather than trying to precisely roll back the flag — a notification
 * that visually reads "read" but didn't quite persist is a low-stakes, rare edge case.
 */
export const markReadThunk = createAsyncThunk<void, number, { rejectValue: string }>(
  "notification/markRead",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await notificationService.markRead(id);
    } catch (err) {
      dispatch(fetchUnreadCountThunk());
      return rejectWithValue(extractErrorMessage(err, "Failed to mark notification as read"));
    }
  },
);

export const markAllReadThunk = createAsyncThunk<MarkAllReadResult, void, { rejectValue: string }>(
  "notification/markAllRead",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const res = await notificationService.markAllRead();
      return res.data.responseData ?? { markedCount: 0, unreadCount: 0 };
    } catch (err) {
      dispatch(fetchUnreadCountThunk());
      return rejectWithValue(extractErrorMessage(err, "Failed to mark all notifications as read"));
    }
  },
);

/** Click-to-open: marks read server-side and hands back the deep link to navigate to. */
export const openNotificationThunk = createAsyncThunk<
  { id: number; deepLink: string | null; unreadCount: number },
  number,
  { rejectValue: string }
>("notification/open", async (id, { dispatch, rejectWithValue }) => {
  try {
    const res = await notificationService.open(id);
    const data = res.data.responseData;
    return { id, deepLink: data?.deepLink ?? null, unreadCount: data?.unreadCount ?? 0 };
  } catch (err) {
    dispatch(fetchUnreadCountThunk());
    return rejectWithValue(extractErrorMessage(err, "Failed to open notification"));
  }
});
