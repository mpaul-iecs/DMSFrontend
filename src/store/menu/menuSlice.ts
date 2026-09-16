import { createSlice } from "@reduxjs/toolkit";
import {
  fetchAllMenusThunk,
  fetchMyMenuThunk,
  fetchMyMenuPermissionsThunk,
  assignMenuPermissionThunk,
} from "./menuThunks";
import type { MenuState } from "../../types/menu";

const initialState: MenuState = {
  modules: [],
  allMenus: [],
  permissions: [],
  loading: false,
  fetched: false,
  allMenusFetched: false,
  allMenusLoading: false,
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
        state.fetched = true;
        state.modules = action.payload;
      })
      .addCase(fetchMyMenuThunk.rejected, (state, action) => {
        state.loading = false;
        state.fetched = true;
        state.error = action.payload ?? "Failed to load menu";
      })

      .addCase(fetchAllMenusThunk.pending, (state) => {
        state.allMenusLoading = true;
      })
      .addCase(fetchAllMenusThunk.fulfilled, (state, action) => {
        state.allMenusLoading = false;
        state.allMenusFetched = true;
        state.allMenus = action.payload;
      })
      .addCase(fetchAllMenusThunk.rejected, (state) => {
        state.allMenusLoading = false;
        state.allMenusFetched = true;
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
