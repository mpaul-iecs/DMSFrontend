import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import authService from "../../services/authService";
import { setAccessToken, clearAccessToken, setTenantId, clearTenantId } from "../../services/axiosInstance";
import type { BaseResponse, CurrentUser, LoginRequest } from "../../types/auth";

const extractErrorMessage = (err: unknown, fallback: string) => {
  const axiosErr = err as AxiosError<BaseResponse<unknown>>;
  return axiosErr.response?.data?.message || fallback;
};

/** Fetches the full profile (roles + permissions + tenant) for the already-authenticated caller. */
const fetchCurrentUser = async (): Promise<CurrentUser> => {
  const res = await authService.me();
  const user = res.data.responseData as CurrentUser;
  setTenantId(user.tenantId);
  return user;
};

/** Restores a session on app load by rotating the httpOnly refresh cookie into a fresh access token. */
export const initAuthThunk = createAsyncThunk<{ user: CurrentUser }, void, { rejectValue: string }>(
  "auth/init",
  async (_, { rejectWithValue }) => {
    try {
      const res = await authService.refresh();
      setAccessToken(res.data.responseData!.accessToken);
      const user = await fetchCurrentUser();
      return { user };
    } catch (err) {
      clearAccessToken();
      clearTenantId();
      return rejectWithValue(extractErrorMessage(err, "Session expired"));
    }
  },
);

/**
 * Refetches the current user's roles/permissions without rotating the refresh token — the
 * access token is still valid, only redux's cached `state.auth.user.permissions` can be
 * stale (e.g. right after an admin — possibly this same user — assigns/revokes a menu
 * permission via SettingsPage: that's a plain REST call, unrelated to this user's own JWT,
 * so nothing else would otherwise tell this session its permissions just changed). Dispatch
 * this after such an action to refresh the acting session's own Sidebar/MenuGuard checks
 * immediately, instead of requiring a full page reload (which works today only because a
 * reload happens to take the initAuthThunk path).
 */
export const refreshCurrentUserThunk = createAsyncThunk<{ user: CurrentUser }, void, { rejectValue: string }>(
  "auth/refreshCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const user = await fetchCurrentUser();
      return { user };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to refresh permissions"));
    }
  },
);

export const loginThunk = createAsyncThunk<{ user: CurrentUser }, LoginRequest, { rejectValue: string }>(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await authService.login(credentials);
      setAccessToken(res.data.responseData!.accessToken);
      const user = await fetchCurrentUser();
      return { user };
    } catch (err) {
      clearAccessToken();
      clearTenantId();
      return rejectWithValue(extractErrorMessage(err, "Invalid username or password."));
    }
  },
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  try {
    await authService.revoke();
  } catch {
    // best-effort: cookie is cleared server-side regardless, local state must clear either way
  }
  clearAccessToken();
  clearTenantId();
});
