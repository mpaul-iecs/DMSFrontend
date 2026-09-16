import { useCallback, useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { menuPermission } from "../utilities/permission";

export default function useAuth() {
  const { user, isAuthenticated, loading } = useAppSelector((s) => s.auth);

  // Sets, not repeated array scans — this hook is called from Sidebar.tsx once per menu item
  // (and will be from any future per-row action button), so a plain `.includes()` per check
  // would be O(items × permissions) on every render.
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const roleSet = useMemo(() => new Set(user?.roles ?? []), [user?.roles]);

  const hasPermission = useCallback((perm: string) => permissionSet.has(perm), [permissionSet]);
  const hasRole = useCallback((role: string) => roleSet.has(role), [roleSet]);

  /**
   * Convenience for the "menu:{idMenu}:{action}" shape most call sites actually hold as two
   * separate values (a menu row's own `idMenu` + whatever action is being gated) rather than
   * a pre-built string — e.g. `canMenu(sub.idMenu, "view")` in Sidebar.tsx, or
   * `canMenu(idMenu, "edit")` guarding a future edit button. `action` matches whatever the
   * backend currently grants (view/create/edit/delete/report) but isn't restricted to those —
   * see utilities/permission.ts's doc comment.
   */
  const canMenu = useCallback(
    (idMenu: number | string, action: string) => permissionSet.has(menuPermission(idMenu, action)),
    [permissionSet]
  );

  return { user, isAuthenticated, loading, hasPermission, hasRole, canMenu };
}
