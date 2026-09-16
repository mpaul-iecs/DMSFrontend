import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthState } from "../../types/auth";
import { initAuthThunk, loginThunk, logoutThunk, refreshCurrentUserThunk } from "./authThunks";

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  // Stays true (not false) so App.tsx's `initializing && isAuthenticated` guard shows
  // "Restoring session..." with no flash on a page reload — the app is wrapped in
  // PersistGate, so isAuthenticated is already rehydrated from sessionStorage by the time
  // App mounts, one paint frame before its useEffect dispatches initAuthThunk. See
  // loginThunk.pending below for why a fresh login doesn't get stuck on this screen.
  initializing: true,
  error: null,
  themePreset: "ocean",
  language: "en",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTheme: (state, action: PayloadAction<string>) => {
      state.themePreset = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuthThunk.pending, (state) => {
        state.initializing = true;
      })
      .addCase(initAuthThunk.fulfilled, (state, action) => {
        state.initializing = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(initAuthThunk.rejected, (state) => {
        // Refresh failed — session cookie is gone (browser was closed) or expired
        state.initializing = false;
        state.user = null;
        state.isAuthenticated = false;
      })

      // --- login ---
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        // A fresh login never dispatches initAuthThunk (that only happens on the reload/
        // restore path — see App.tsx), so `initializing` would otherwise stay stuck at its
        // initial `true` forever once loginThunk.fulfilled sets isAuthenticated: true,
        // permanently showing "Restoring session..." instead of the app. Any login attempt
        // means we're definitely not restoring a session.
        state.initializing = false;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Login failed";
        state.isAuthenticated = false;
      })

      // --- refresh current user (roles/permissions only, no token rotation) ---
      .addCase(refreshCurrentUserThunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })

      // --- logout ---
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, setTheme, setLanguage } = authSlice.actions;
export default authSlice.reducer;
