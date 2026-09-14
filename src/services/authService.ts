import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type {
  BaseResponse,
  CurrentUser,
  LoginRequest,
  LoginResponseData,
  RefreshResponseData,
} from "../types/auth";

/** All raw HTTP calls for the auth domain live here — thunks only orchestrate them. */
const authService = {
  login: (payload: LoginRequest) =>
    api.post<BaseResponse<LoginResponseData>>(endpoints.auth.login, payload),

  refresh: () => api.post<BaseResponse<RefreshResponseData>>(endpoints.auth.refresh),

  revoke: () => api.post<BaseResponse<null>>(endpoints.auth.revoke),

  me: () => api.get<BaseResponse<CurrentUser>>(endpoints.auth.me),
};

export default authService;
