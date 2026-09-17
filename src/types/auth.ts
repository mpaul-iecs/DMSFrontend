/** Mirrors InnerEye.DMS.Foundation.Payloads.Auth.LoginRequestDto */
export interface LoginRequest {
  userName: string;
  password: string;
}

/**
 * Mirrors InnerEye.DMS.Foundation.Payloads.Auth.LoginResponseDto.
 * RefreshToken is [JsonIgnore] on the backend (set as httpOnly cookie), so it never
 * reaches the client — deliberately omitted here.
 */
export interface LoginResponseData {
  accessToken: string;
  expiresAt: string;
  empNo: string;
  userName: string | null;
  roles: string[];
}

/** Mirrors InnerEye.DMS.Foundation.Payloads.CurrentUserDto (GET /auth/me). */
export interface CurrentUser {
  empNo: string;
  userName: string | null;
  tenantId: string;
  clientType: string;
  roles: string[];
  permissions: string[];
  /** Saved preferences (theme, language, ...) — see types/appSettings.ts#AppSettingsMap. */
  settings: Record<string, string>;
}

/** Response body of POST /auth/refresh. */
export interface RefreshResponseData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

/** Mirrors InnerEye.DMS.Foundation.Enums.ErrorCode — extend as new codes are introduced. */
export type ErrorCode = string;

/** Mirrors InnerEye.DMS.Foundation.Payloads.BaseResponseDto<T> (System.Text.Json camel-cases property names). */
export interface BaseResponse<T> {
  error: boolean;
  message: string;
  statusCode: number;
  errorCode?: ErrorCode;
  responseData?: T;
}

export interface AuthState {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  initializing: boolean;
  error: string | null;
  themePreset: string;
  language: string;
}
