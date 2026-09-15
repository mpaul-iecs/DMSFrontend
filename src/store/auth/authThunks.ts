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
