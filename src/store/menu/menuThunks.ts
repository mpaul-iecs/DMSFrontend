import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import menuService from "../../services/menuService";
import type { AssignMenuPermissionRequest, MenuModule, MenuNode, MenuPermission } from "../../types/menu";
import type { BaseResponse } from "../../types/auth";

const extractErrorMessage = (err: unknown, fallback: string) => {
  const axiosErr = err as AxiosError<BaseResponse<unknown>>;
  return axiosErr.response?.data?.message || fallback;
};

export const fetchAllMenusThunk = createAsyncThunk<MenuNode[], void, { rejectValue: string }>(
  "menu/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await menuService.getAll();
      return res.data.responseData ?? [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to load menus"));
    }
  },
);

export const fetchMyMenuThunk = createAsyncThunk<MenuModule[], void, { rejectValue: string }>(
  "menu/fetchMine",
  async (_, { rejectWithValue }) => {
    try {
      const res = await menuService.myMenu();
      return res.data.responseData ?? [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to load menu"));
    }
  },
);

export const fetchMyMenuPermissionsThunk = createAsyncThunk<MenuPermission[], void, { rejectValue: string }>(
  "menu/fetchMyPermissions",
  async (_, { rejectWithValue }) => {
    try {
      const res = await menuService.myPermissions();
      return res.data.responseData ?? [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Failed to load menu permissions"));
    }
  },
);

export const assignMenuPermissionThunk = createAsyncThunk<
  void,
  AssignMenuPermissionRequest,
  { rejectValue: string }
>("menu/assignPermission", async (payload, { rejectWithValue }) => {
  try {
    await menuService.assignPermission(payload);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Failed to assign permission"));
  }
});
