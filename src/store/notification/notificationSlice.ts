import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchDropdownFeedThunk,
  fetchFeedPageThunk,
  fetchUnreadCountThunk,
  markAllReadThunk,
  openNotificationThunk,
} from "./notificationThunks";
import type { NotificationFilters, NotificationState } from "../../types/notification";

const initialFilters: NotificationFilters = { search: "", type: "", unreadOnly: false };

const initialState: NotificationState = {
  dropdownItems: [],
  dropdownLoading: false,
  unreadCount: 0,
  feed: {
    items: [],
    page: 0,
    pageSize: 30,
    totalCount: 0,
    hasMore: true,
    loading: false,
    loadingMore: false,
    filters: initialFilters,
  },
  error: null,
};

/** Marks one item read (by NotificationRecipient id) in-place across dropdown + feed lists. */
function markItemRead(items: { id: number; isRead: boolean; readAt: string | null }[], id: number) {
  const item = items.find((i) => i.id === id);
  if (item && !item.isRead) {
    item.isRead = true;
    item.readAt = new Date().toISOString();
  }
}

function markAllItemsRead(items: { isRead: boolean; readAt: string | null }[]) {
  const now = new Date().toISOString();
  for (const item of items) {
    if (!item.isRead) {
      item.isRead = true;
      item.readAt = now;
    }
  }
}

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    /** Dispatched by the bell/list UI right before markReadThunk/openNotificationThunk fire,
     * so the read state and badge update instantly instead of waiting on the round trip. */
    markReadLocally: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      const existing = state.dropdownItems.find((i) => i.id === id) ?? state.feed.items.find((i) => i.id === id);
      const wasUnread = existing ? !existing.isRead : false;
      markItemRead(state.dropdownItems, id);
      markItemRead(state.feed.items, id);
      if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
    /** Dispatched right before markAllReadThunk fires — see markReadLocally's rationale above. */
    markAllReadLocally: (state) => {
      markAllItemsRead(state.dropdownItems);
      markAllItemsRead(state.feed.items);
      state.unreadCount = 0;
    },
    setFeedFilters: (state, action: PayloadAction<Partial<NotificationFilters>>) => {
      state.feed.filters = { ...state.feed.filters, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // --- dropdown feed (top 20) ---
      .addCase(fetchDropdownFeedThunk.pending, (state) => {
        state.dropdownLoading = true;
      })
      .addCase(fetchDropdownFeedThunk.fulfilled, (state, action) => {
        state.dropdownLoading = false;
        state.dropdownItems = action.payload;
      })
      .addCase(fetchDropdownFeedThunk.rejected, (state, action) => {
        state.dropdownLoading = false;
        state.error = action.payload ?? "Failed to load notifications";
      })

      // --- unread count (bell badge) ---
      .addCase(fetchUnreadCountThunk.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })

      // --- notifications page feed (top 30, infinite scroll) ---
      .addCase(fetchFeedPageThunk.pending, (state, action) => {
        if (action.meta.arg?.reset) state.feed.loading = true;
        else state.feed.loadingMore = true;
      })
      .addCase(fetchFeedPageThunk.fulfilled, (state, action) => {
        const { items, totalCount, page, reset } = action.payload;
        state.feed.loading = false;
        state.feed.loadingMore = false;
        state.feed.items = reset ? items : [...state.feed.items, ...items];
        state.feed.page = page;
        state.feed.totalCount = totalCount;
        state.feed.hasMore = state.feed.items.length < totalCount;
      })
      .addCase(fetchFeedPageThunk.rejected, (state, action) => {
        state.feed.loading = false;
        state.feed.loadingMore = false;
        state.error = action.payload ?? "Failed to load notifications";
      })

      // --- mark all read — markAllReadLocally already applied this optimistically; this just
      // reconciles unreadCount with the server-authoritative value (and covers state that was
      // still marked unread e.g. because it loaded after the optimistic dispatch). ---
      .addCase(markAllReadThunk.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
        markAllItemsRead(state.dropdownItems);
        markAllItemsRead(state.feed.items);
      })

      // --- open (click-to-navigate) — authoritative unreadCount from the server ---
      .addCase(openNotificationThunk.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
        markItemRead(state.dropdownItems, action.payload.id);
        markItemRead(state.feed.items, action.payload.id);
      });

    // markReadThunk itself has no fulfilled/rejected state to reconcile — markReadLocally
    // (dispatched by the caller right before the thunk) already applied the optimistic
    // update, and the thunk's own catch block resyncs via fetchUnreadCountThunk on failure.
  },
});

export const { markReadLocally, markAllReadLocally, setFeedFilters } = notificationSlice.actions;
export default notificationSlice.reducer;
