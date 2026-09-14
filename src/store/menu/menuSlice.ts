import { createSlice } from "@reduxjs/toolkit";
import { fetchMyMenuThunk, fetchMyMenuPermissionsThunk, assignMenuPermissionThunk } from "./menuThunks";
import type { MenuState } from "../../types/menu";

const initialState: MenuState = {
  modules: [],
  permissions: [],
  loading: false,
  permissionsLoading: false,
  assigning: false,
  error: null,
};

const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyMenuThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyMenuThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.modules = action.payload;
      })
      .addCase(fetchMyMenuThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to load menu";
      })

      .addCase(fetchMyMenuPermissionsThunk.pending, (state) => {
        state.permissionsLoading = true;
      })
      .addCase(fetchMyMenuPermissionsThunk.fulfilled, (state, action) => {
        state.permissionsLoading = false;
        state.permissions = action.payload;
      })
      .addCase(fetchMyMenuPermissionsThunk.rejected, (state) => {
        state.permissionsLoading = false;
      })

      .addCase(assignMenuPermissionThunk.pending, (state) => {
        state.assigning = true;
      })
      .addCase(assignMenuPermissionThunk.fulfilled, (state) => {
        state.assigning = false;
      })
      .addCase(assignMenuPermissionThunk.rejected, (state) => {
        state.assigning = false;
      });
  },
});

export default menuSlice.reducer;
