/** Flat key/value map — mirrors the backend's AppSetting rows for the current user
 * (GET /app-settings, and the `settings` block on GET /auth/me's CurrentUserDto). */
export type AppSettingsMap = Record<string, string>;

/** Mirrors InnerEye.DMS.Foundation.Payloads.AppSettings.UpsertAppSettingsRequestDto. */
export interface UpsertAppSettingsRequest {
  settings: AppSettingsMap;
}
