import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthState } from "../../types/auth";
import { initAuthThunk, loginThunk, logoutThunk } from "./authThunks";

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
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
