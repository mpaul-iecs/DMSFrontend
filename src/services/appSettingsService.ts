import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { AppSettingsMap, UpsertAppSettingsRequest } from "../types/appSettings";
import type { BaseResponse } from "../types/auth";

/** All raw HTTP calls for the app-settings domain live here — thunks only orchestrate them. */
const appSettingsService = {
  getMySettings: () => api.get<BaseResponse<AppSettingsMap>>(endpoints.appSettings.base),

  upsertMySettings: (payload: UpsertAppSettingsRequest) =>
    api.put<BaseResponse<AppSettingsMap>>(endpoints.appSettings.base, payload),
};

export default appSettingsService;
