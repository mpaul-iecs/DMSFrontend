/**
 * Mirrors the backend's JWT `permission` claim format, built in
 * InnerEye.DMS.Core.Services.IdentityClaimsService — one claim per granted flag, shaped
 * "menu:{idMenu}:{action}" (e.g. "menu:724:edit"). `action` is a free-form string on the
 * backend (view/create/edit/delete/report today, from MenuRow's CanView/CanCreate/CanEdit/
 * CanDelete/CanReport flags) — deliberately not a closed TS union here, so a new action added
 * server-side (a new Can* flag + one more `if` in IdentityClaimsService) needs zero frontend
 * changes to become checkable.
 */
export function menuPermission(idMenu: number | string, action: string): string {
  return `menu:${idMenu}:${action}`;
}
